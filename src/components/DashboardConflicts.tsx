import React from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  ShieldAlert,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { User, Service, Shift, ShiftAssignment, Conflict } from "../types";
import { getDayName, formatDateGerman, timeToMinutes } from "../utils";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

interface UnderstaffedItem {
  shift: Shift;
  service: Service | undefined;
  currentCount: number;
  minVal: number;
  maxVal: number;
  isUnderstaffed: boolean;
  assignedPeople: string[];
}

interface DashboardConflictsProps {
  conflicts: Conflict[];
  understaffedList: UnderstaffedItem[];
  isAdmin: boolean;
  users: User[];
  shifts: Shift[];
  services: Service[];
  assignments: ShiftAssignment[];
  onSelectShift: (shiftId: string) => void;
  onAddAssignment?: (shiftId: string, userId: string) => Promise<void>;
  onRemoveAssignment?: (shiftId: string, userId: string) => Promise<void>;
  showToast: (msg: string) => void;
}

/**
 * "Doppelbelegung und unterbesetzte Schichten"-Leitstand. Extrahiert aus
 * DashboardView.tsx (Zeilen ~844-1204).
 */
export default function DashboardConflicts({
  conflicts,
  understaffedList,
  isAdmin,
  users,
  shifts,
  services,
  assignments,
  onSelectShift,
  onAddAssignment,
  onRemoveAssignment,
  showToast,
}: DashboardConflictsProps) {
  const [expandedConflictId, setExpandedConflictId] = React.useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [conflictTab, setConflictTab] = React.useState<"overlaps" | "understaffed">("overlaps");
  const { copiedId, copy } = useCopyToClipboard(2000, showToast);

  const getAvailableUsersForShift = React.useCallback(
    (shiftId: string): User[] => {
      const targetShift = shifts.find((sh) => sh.id === shiftId);
      if (!targetShift) return [];

      const targetStart = timeToMinutes(targetShift.start_time);
      const targetEnd = timeToMinutes(targetShift.end_time);

      return users.filter((u) => {
        if (!u.active) return false;

        const isAlreadyAssigned = assignments.some((a) => a.shift_id === shiftId && a.user_id === u.id);
        if (isAlreadyAssigned) return false;

        const userAssignmentsOnDate = assignments.filter((a) => {
          if (a.user_id !== u.id) return false;
          const sh = shifts.find((s) => s.id === a.shift_id);
          return sh && sh.date === targetShift.date;
        });

        const hasOverlap = userAssignmentsOnDate.some((a) => {
          const sh = shifts.find((s) => s.id === a.shift_id);
          if (!sh) return false;
          const shStart = timeToMinutes(sh.start_time);
          const shEnd = timeToMinutes(sh.end_time);
          return targetStart < shEnd && shStart < targetEnd;
        });

        return !hasOverlap;
      });
    },
    [users, shifts, assignments]
  );

  const handleCopy = (id: string, text: string) => {
    copy(id, text);
    showToast("📋 Benachrichtigungsvorlage in die Zwischenablage kopiert!");
  };

  const handleRemoveHelper = async (shiftId: string, userId: string, label: string) => {
    if (!onRemoveAssignment) return;
    const actionId = `remove-${shiftId}-${userId}`;
    setActionLoadingId(actionId);
    try {
      await onRemoveAssignment(shiftId, userId);
      showToast(`👤 Helfer*in erfolgreich aus Dienst "${label}" ausgetragen.`);
    } catch (err) {
      console.error("Conflict resolve remove assignment failed:", err);
      showToast("❌ Fehler beim Löschen der Zuweisung.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignDirect = async (shiftId: string, userId: string, label: string) => {
    if (!onAddAssignment) return;
    const actionId = `assign-${shiftId}-${userId}`;
    setActionLoadingId(actionId);
    try {
      await onAddAssignment(shiftId, userId);
      showToast(`👤 Helfer*in erfolgreich für "${label}" eingeteilt.`);
      setExpandedConflictId(null);
    } catch (err) {
      console.error("Conflict resolve assign failed:", err);
      showToast("❌ Fehler bei der Einteilung.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReassign = async (shiftId: string, oldUserId: string, newUserId: string, label: string) => {
    if (!onRemoveAssignment || !onAddAssignment) return;
    const actionId = `reassign-${shiftId}-${oldUserId}-${newUserId}`;
    setActionLoadingId(actionId);
    try {
      await onRemoveAssignment(shiftId, oldUserId);
      await onAddAssignment(shiftId, newUserId);

      const newName = users.find((u) => u.id === newUserId)?.display_name || "Helfer*in";
      showToast(`🔄 Schicht "${label}" von Alt-Helfer*in auf ${newName} umbesetzt!`);
      setExpandedConflictId(null);
    } catch (err) {
      console.error("Reassigning failed:", err);
      showToast("❌ Ein Fehler ist aufgetreten.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="col-span-12 animate-fade-in" id="dashboard-conflicts-leitstand-container">
      <div className="bg-slate-900 border border-emerald-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-fade-in" id="dashboard-conflicts-leitstand">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
              <ShieldAlert className="h-5.5 w-5.5 text-rose-500 shrink-0" />
              <span>Doppelbelegung und unterbesetzte Schichten</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Prüfung und Behebung aller kritischen Doppelbelegungen, Überbelegungen und personellen Unterbesetzungen in Echtzeit.
            </p>
          </div>
        </div>

        {/* Sub-tabs Selection for Leitstand */}
        <div className="mt-5 flex items-center space-x-2.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setExpandedConflictId(null);
              setConflictTab("overlaps");
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              conflictTab === "overlaps"
                ? "bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-sm"
                : "border-transparent text-slate-450 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
            }`}
            id="tab-overlaps-trigger"
          >
            <span>🚨 Fehler & Doppelbuchungen</span>
            <span className="bg-rose-955 bg-rose-950/50 border border-rose-500/30 text-rose-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
              {conflicts.length}
            </span>
          </button>

          <button
            onClick={() => {
              setExpandedConflictId(null);
              setConflictTab("understaffed");
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              conflictTab === "understaffed"
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm"
                : "border-transparent text-slate-450 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
            }`}
            id="tab-understaffed-trigger"
          >
            <span>⚠️ Unterbesetzte Schichten</span>
            <span className="bg-amber-955 bg-amber-950/50 border border-amber-500/30 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
              {understaffedList.length}
            </span>
          </button>
        </div>

        {/* Tap Panel Content */}
        <div className="mt-5 space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {/* --- TABS OVERLAPS --- */}
          {conflictTab === "overlaps" && (
            <>
              {conflicts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-emerald-500/15 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-950/50 flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-200">Keine Fehler gefunden</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
                    Hervorragend! Keine temporalen Doppelbuchungen oder Überkapazitäten im aktiven Dienstplan vorhanden.
                  </p>
                </div>
              ) : (
                conflicts.map((conflict, i) => {
                  const isOverlap = conflict.type === "overlap";
                  const conflictUniqueId = conflict.id || `overlap-list-${i}`;

                  const s1 = shifts.find((s) => s.id === conflict.shiftId1);
                  const s1Svc = s1 ? services.find((sv) => sv.id === s1.service_id) : null;
                  const s2 = shifts.find((s) => s.id === conflict.shiftId2);
                  const s2Svc = s2 ? services.find((sv) => sv.id === s2.service_id) : null;

                  const dateLabel = s1 ? `${getDayName(s1.date)}, ${formatDateGerman(s1.date)}` : "unbekannt";
                  const textToCopy = isOverlap
                    ? `Hallo ${conflict.userName}, uns ist im Dienstplan aufgefallen, dass du am ${dateLabel} eine zeitliche Überschneidung hast: ${s1Svc?.title || "Dienst"} (${getDayName(s1.date)}, ${s1?.start_time}-${s1?.end_time} Uhr) und ${s2Svc?.title || "Dienst"} (${getDayName(s2.date)}, ${s2?.start_time}-${s2?.end_time} Uhr). Bitte gib uns kurz Rückmeldung, welchen Dienst du übernehmen kannst. Danke!`
                    : `Achtung für Dienst ${s1Svc?.title || "Dienst"} am ${dateLabel}: Dieser Dienst hat die maximale Kapazität von ${s1Svc?.max_persons || 0} Personen überschritten. Wir müssen helfende Hände umdisponieren!`;

                  return (
                    <div
                      key={conflictUniqueId}
                      className={`p-4 rounded-xl border transition-all ${
                        isOverlap
                          ? "bg-rose-950/10 border-rose-500/20 hover:border-rose-500/35"
                          : "bg-amber-950/10 border-amber-500/15 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${
                                isOverlap
                                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                                  : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                              }`}
                            >
                              {isOverlap ? "Zweifach-Belegung" : "Personenlimit Überschritten"}
                            </span>
                            {conflict.userName && (
                              <span className="text-xs text-white font-sans font-extrabold flex items-center space-x-1">
                                <span>👤</span>
                                <span>{conflict.userName}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-350 leading-relaxed mt-1 font-sans" dangerouslySetInnerHTML={{ __html: conflict.message }} />
                        </div>
                      </div>

                      {/* Extra info details of overlapping shifts */}
                      {isOverlap && s1 && s2 && (
                        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px] font-sans">
                          <div className="space-y-1 border-r border-slate-800/60 pr-2 last:border-0">
                            <p className="font-bold text-slate-300">Dienst Posten A:</p>
                            <p className="text-emerald-400 font-extrabold underline">{s1Svc?.title}</p>
                            <p className="text-slate-400 font-mono text-[10px]">
                              📍 {s1Svc?.location} • 🕒 {getDayName(s1.date)}, {s1.start_time} - {s1.end_time} Uhr
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-slate-300">Dienst Posten B:</p>
                            <p className="text-indigo-400 font-extrabold underline">{s2Svc?.title}</p>
                            <p className="text-slate-400 font-mono text-[10px]">
                              📍 {s2Svc?.location} • 🕒 {getDayName(s2.date)}, {s2.start_time} - {s2.end_time} Uhr
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Admin Resolution Operations */}
                      {isAdmin && (
                        <div className="mt-3.5 pt-3.5 border-t border-slate-800 flex flex-wrap items-center gap-2">
                          {isOverlap && (
                            <>
                              {/* Button 1: Austragen aus Dienst A */}
                              <button
                                onClick={() => handleRemoveHelper(s1!.id, conflict.userId!, s1Svc?.title || "Dienst A")}
                                disabled={actionLoadingId !== null}
                                className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/20 hover:border-rose-500/50 text-rose-300 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                              >
                                <UserMinus className="h-3 w-3" />
                                <span>Löschen: {s1Svc?.title?.substring(0, 10)}...</span>
                              </button>

                              {/* Button 2: Austragen aus Dienst B */}
                              <button
                                onClick={() => handleRemoveHelper(s2!.id, conflict.userId!, s2Svc?.title || "Dienst B")}
                                disabled={actionLoadingId !== null}
                                className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/20 hover:border-rose-500/50 text-rose-300 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                              >
                                <UserMinus className="h-3 w-3" />
                                <span>Löschen: {s2Svc?.title?.substring(0, 10)}...</span>
                              </button>

                              {/* Button 3: Reassign dropdown trigger */}
                              <button
                                onClick={() => setExpandedConflictId(expandedConflictId === conflictUniqueId ? null : conflictUniqueId)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                              >
                                <RefreshCw className="h-3 w-3 text-emerald-450" />
                                <span>Umbesetzen</span>
                                {expandedConflictId === conflictUniqueId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            </>
                          )}

                          {/* Button: Clipboard Copy notification */}
                          <button
                            onClick={() => handleCopy(conflictUniqueId, textToCopy)}
                            className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ml-auto"
                          >
                            {copiedId === conflictUniqueId ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedId === conflictUniqueId ? "Kopiert!" : "💬 Helfer*in anschreiben"}</span>
                          </button>
                        </div>
                      )}

                      {/* REASSIGN DROPDOWN COLLAPSIBLE */}
                      {isAdmin && isOverlap && expandedConflictId === conflictUniqueId && (
                        <div className="mt-3 bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2.5 animate-slide-down">
                          <h4 className="text-[11px] font-bold text-emerald-450 uppercase tracking-wider font-mono">
                            🔄 Freie, konfliktfreie Helfer*innen zur Umbesetzung finden:
                          </h4>

                          <div className="grid grid-cols-1 gap-2">
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-slate-400 font-bold">Dienst A ({s1Svc?.title}) besetzen mit:</p>
                              {getAvailableUsersForShift(s1!.id).length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic">Keine konfliktfreien Helfer*innen verfügbar.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                  {getAvailableUsersForShift(s1!.id).map((userOpt) => (
                                    <button
                                      key={`opt-a-${userOpt.id}`}
                                      onClick={() => handleReassign(s1!.id, conflict.userId!, userOpt.id, s1Svc?.title || "Dienst")}
                                      className="px-2 py-1 bg-slate-900 hover:bg-emerald-950/40 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/20 rounded text-[10px] font-semibold text-slate-350 cursor-pointer"
                                    >
                                      + {userOpt.display_name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5 border-t border-slate-800/40 pt-2">
                              <p className="text-[10px] text-slate-400 font-bold">Dienst B ({s2Svc?.title}) besetzen mit:</p>
                              {getAvailableUsersForShift(s2!.id).length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic">Keine konfliktfreien Helfer*innen verfügbar.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                  {getAvailableUsersForShift(s2!.id).map((userOpt) => (
                                    <button
                                      key={`opt-b-${userOpt.id}`}
                                      onClick={() => handleReassign(s2!.id, conflict.userId!, userOpt.id, s2Svc?.title || "Dienst")}
                                      className="px-2 py-1 bg-slate-900 hover:bg-emerald-950/40 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/20 rounded text-[10px] font-semibold text-slate-350 cursor-pointer"
                                    >
                                      + {userOpt.display_name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* --- TABS UNDERSTAFFED --- */}
          {conflictTab === "understaffed" && (
            <>
              {understaffedList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-emerald-500/5 rounded-2xl border border-dashed border-emerald-500/15 text-center">
                  <span className="text-xl">🏕️</span>
                  <p className="text-sm font-bold text-slate-200">Sollstärke voll abgedeckt</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
                    Fantastisch! Alle Schichten am Laufen haben bereits die erforderliche Mindestanzahl an Helfer*innen eingetragen.
                  </p>
                </div>
              ) : (
                understaffedList.map((item, idx) => {
                  const sh = item.shift;
                  const svc = item.service;
                  const conflictUniqueId = `understaffed-list-${sh.id}-${idx}`;
                  const availableHelpers = getAvailableUsersForShift(sh.id);

                  const dateLabel = formatDateGerman(sh.date);
                  const wpCallText = `Hallo helfende Hände! Für den wichtigen Dienst "${svc?.title || "Dienst"}" am ${dateLabel} (${sh.start_time}-${sh.end_time} Uhr • Ort: ${svc?.location || "Lagerplatz"}) benötigen wir dringend Unterstützung (Min. benötigt: ${item.minVal} • Aktuell: ${item.currentCount}). Wer kann einspringen? Bitte tragt euch im Teampad ein oder meldet euch! Danke!`;

                  return (
                    <div
                      key={sh.id}
                      className="p-4 bg-amber-950/10 hover:bg-amber-950/15 border border-amber-500/20 hover:border-amber-500/35 rounded-xl space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="text-xs font-extrabold text-white font-display">
                            {svc?.title} ({svc?.category})
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            📅 {getDayName(sh.date)}, {dateLabel} • 🕒 {sh.start_time} - {sh.end_time} Uhr
                          </p>
                        </div>
                        <span className="bg-amber-950 text-amber-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/30">
                          Benötigt: {item.minVal} • Aktuell: {item.currentCount}
                        </span>
                      </div>

                      {/* List of currently assigned */}
                      {item.assignedPeople.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] bg-slate-950/70 p-2 border border-slate-850 rounded-lg">
                          <span className="font-mono text-slate-500 font-bold mr-1">EINGETEILT:</span>
                          {item.assignedPeople.map((name, i) => (
                            <span key={i} className="text-slate-300 bg-slate-900 border border-emerald-500/5 px-2 py-0.5 rounded font-mono text-[9px]">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-rose-455 font-extrabold bg-rose-950/30 py-1 px-2 border border-rose-500/10 rounded inline-block font-mono">
                          ⚠️ Noch keine Personen eingetragen (Voll-Vakant)
                        </p>
                      )}

                      {/* Options Panel */}
                      {isAdmin && (
                        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                          {/* Open Available Helpers Dropdown Trigger */}
                          <button
                            onClick={() => setExpandedConflictId(expandedConflictId === conflictUniqueId ? null : conflictUniqueId)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                          >
                            <UserPlus className="h-3 w-3 text-emerald-450" />
                            <span>Helfer*innen eintragen ({availableHelpers.length})</span>
                            {expandedConflictId === conflictUniqueId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {/* Jump to planner calendar */}
                          <button
                            onClick={() => onSelectShift(sh.id)}
                            className="px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-800 text-slate-350 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                          >
                            <span>📅 Kalender</span>
                          </button>

                          {/* Copy Text Alert Button */}
                          <button
                            onClick={() => handleCopy(conflictUniqueId, wpCallText)}
                            className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 ml-auto cursor-pointer transition-all"
                          >
                            {copiedId === conflictUniqueId ? <CheckCircle className="h-3 w-3 text-emerald-450" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedId === conflictUniqueId ? "Kopiert!" : "💬 WhatsApp-Aufruf"}</span>
                          </button>
                        </div>
                      )}

                      {/* EXPANDED INLINE HELPERS LIST */}
                      {isAdmin && expandedConflictId === conflictUniqueId && (
                        <div className="mt-2.5 bg-slate-950 p-3 border border-slate-850 rounded-lg space-y-2 animate-slide-down">
                          <p className="text-[10px] text-slate-450 font-bold text-slate-400 font-mono uppercase">
                            ➔ Verfügbare, konfliktfreie Helfer*innen für diesen Slot:
                          </p>
                          {availableHelpers.length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic pb-1">Keine freien Helfer*innen ohne Schichtkonflikte gefunden.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pt-0.5">
                              {availableHelpers.map((uOpt) => (
                                <button
                                  key={`understaffed-opt-${uOpt.id}`}
                                  onClick={() => handleAssignDirect(sh.id, uOpt.id, svc?.title || "Dienst")}
                                  className="px-2 py-1.5 bg-slate-900 hover:bg-emerald-950/30 hover:text-emerald-350 border border-slate-800 hover:border-emerald-500/20 text-[10px] font-bold text-slate-300 rounded cursor-pointer transition-all"
                                >
                                  + {uOpt.display_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
