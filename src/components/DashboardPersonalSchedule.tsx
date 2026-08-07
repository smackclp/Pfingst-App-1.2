import React from "react";
import { CalendarCheck, Check, Download, Search, Share2, Sparkles } from "lucide-react";
import { User, Service, Shift, ShiftAssignment } from "../types";
import { getDayName, formatDateGerman, formatDateWithDayPrefix } from "../utils";

interface WorkloadStats {
  assignmentsCount: number;
  hours: number;
  shiftsDetails: { assignment: ShiftAssignment; shift: Shift }[];
}

interface DashboardPersonalScheduleProps {
  users: User[];
  services: Service[];
  activeCampYear?: number;
  getUserWorkloadStats: (userId: string) => WorkloadStats;
  selectedUserPlanId: string;
  setSelectedUserPlanId: (id: string) => void;
  personalPlanQuery: string;
  setPersonalPlanQuery: (query: string) => void;
  showPersonalSelector: boolean;
  setShowPersonalSelector: (show: boolean) => void;
  showToast: (msg: string) => void;
  onUpdateAssignmentStatus: (assignmentId: string, status: "pending" | "accepted" | "declined" | "maybe", declineReason?: string) => Promise<void>;
  currentUserId?: string | null;
  accessRole?: "helfer" | "bereichsleiter" | "lagerleitung";
}

/**
 * "Mein persönlicher Dienstplan & Quick-Finder"-Widget. Extrahiert aus
 * DashboardView.tsx. selectedUserPlanId/personalPlanQuery bleiben bewusst
 * im übergeordneten DashboardView (nicht hier lokal), da die Fair-Share-
 * Kachel per Klick dieselbe Auswahl setzen können muss.
 */
export default function DashboardPersonalSchedule({
  users,
  services,
  activeCampYear,
  getUserWorkloadStats,
  selectedUserPlanId,
  setSelectedUserPlanId,
  personalPlanQuery,
  setPersonalPlanQuery,
  showPersonalSelector,
  setShowPersonalSelector,
  showToast,
  onUpdateAssignmentStatus,
  currentUserId,
  accessRole = "helfer",
}: DashboardPersonalScheduleProps) {
  const handleCopyPersonalSchedule = (userName: string, details: { assignment: ShiftAssignment; shift: Shift }[]) => {
    if (details.length === 0) return;
    const bulletLines = details.map(({ shift, assignment }) => {
      const svc = services.find((s) => s.id === shift.service_id);
      return `- ${getDayName(shift.date)}, ${formatDateGerman(shift.date)} 🕒 ${shift.start_time}-${shift.end_time} Uhr: ${svc?.title || "Dienst"} (Ort: ${svc?.location || "Lagerplatz"}) [Status: ${assignment.status === "accepted" ? "ZUGESAGT" : assignment.status === "maybe" ? "VIELLEICHT" : "AUSSTEHEND"}]`;
    });
    const shareText = `Moin ${userName}! Hier ist dein persönlicher Dienstplan fürs Pfingstlager 2026:\n\n${bulletLines.join("\n")}\n\nBitte halte deine Schichten ein und melde dich rechtzeitig bei Tauschbedarf! 🏕️`;
    navigator.clipboard.writeText(shareText);
    showToast("📋 Dein persönlicher Schedule wurde kopiert!");
  };

  const handleDownloadPersonalSchedule = (userName: string, details: { assignment: ShiftAssignment; shift: Shift }[]) => {
    if (details.length === 0) return;
    const bulletLines = details.map(({ shift, assignment }) => {
      const svc = services.find((s) => s.id === shift.service_id);
      return `- ${getDayName(shift.date)}, ${formatDateGerman(shift.date)} 🕒 ${shift.start_time}-${shift.end_time} Uhr:\n  Aufgabe/Dienst: ${svc?.title || "Dienst"}\n  Ort: ${svc?.location || "Lagerplatz"}\n  Kategorie: ${svc?.category || "Allgemein"}\n  Belegungs-Status: ${assignment.status === "accepted" ? "ZUGESAGT ✓" : assignment.status === "maybe" ? "VIELLEICHT ?" : "AMTLICH GEPLANT (Ausstehend)"}\n`;
    });
    const fileContent = `=========================================\n⛺ MEIN PERSÖNLICHER PFINGSTLAGER-DIENSTPLAN ⛺\n=========================================\n\nHelfer*in: ${userName}\nSaison: Pfingstlager ${activeCampYear || 2026}\nErstellt am: ${new Date().toLocaleString("de-DE")}\n\nDu hast ${details.length} eingetragene Schichten:\n\n${bulletLines.join("\n")}\n-----------------------------------------\nBitte halte deine Arbeitszeiten pünktlich ein.\nFalls du krank bist oder tauschen möchtest, nutze die Hilfsmittel-Tauschbörse in der App.\n\nGut Pfad! Camp-Leitung Team 🏕️⏰\n`;

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Dienstplan_2026_${userName.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("💾 Dienstplan (.txt) erfolgreich heruntergeladen!");
  };

  const handlePersonalStatusChange = async (assignmentId: string, status: "accepted" | "maybe" | "declined") => {
    try {
      await onUpdateAssignmentStatus(assignmentId, status);
      showToast(`📝 Status erfolgreich auf "${status === "accepted" ? "Zugesagt" : status === "maybe" ? "Vielleicht" : "Abgesagt"}" geändert!`);
    } catch (err) {
      console.error("Personal status change failed:", err);
      showToast("❌ Status-Änderung fehlgeschlagen.");
    }
  };

  const handleBulkAcceptAssignments = async (userId: string) => {
    try {
      const uStats = getUserWorkloadStats(userId);
      const pending = uStats.shiftsDetails.filter(({ assignment }) => assignment.status !== "accepted");
      if (pending.length === 0) return;

      for (const { assignment } of pending) {
        await onUpdateAssignmentStatus(assignment.id, "accepted");
      }

      showToast(`✅ Alle ${pending.length} Schichten erfolgreich bestätigt!`);
    } catch (err) {
      console.error("Bulk accept failed:", err);
      showToast("❌ Zusage konnte nicht für alle Schichten gespeichert werden.");
    }
  };

  return (
    <div
      className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/35 relative overflow-hidden"
      id="personal-schedule-widget"
    >
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Sparkles className="h-24 w-24 text-emerald-400" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
            <span className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span>Mein persönlicher Dienstplan & Quick-Finder</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Trage deinen Namen ein oder wähle dein Profil aus, um deine Schichten zu prüfen, zuzusagen oder zu kopieren.
          </p>
        </div>

        {/* User Combobox Finder */}
        <div className="relative w-full md:w-80">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500/50 transition">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
            <input
              type="text"
              placeholder="Name eingeben (z.B. Maria)..."
              value={personalPlanQuery}
              onChange={(e) => {
                setPersonalPlanQuery(e.target.value);
                setShowPersonalSelector(true);
              }}
              onFocus={() => setShowPersonalSelector(true)}
              className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full font-sans"
            />
            {personalPlanQuery && (
              <button
                onClick={() => {
                  setPersonalPlanQuery("");
                  setSelectedUserPlanId(users[0]?.id || "");
                }}
                className="text-slate-500 hover:text-slate-300 text-xs font-mono font-bold font-sans cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector list */}
          {showPersonalSelector && (
            <div className="absolute z-20 left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
              <div className="p-2 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Helfer Profile:</span>
                <button onClick={() => setShowPersonalSelector(false)} className="text-[10px] text-slate-400 hover:text-white cursor-pointer">
                  schließen
                </button>
              </div>
              {users
                .filter(
                  (u) =>
                    !personalPlanQuery ||
                    u.display_name.toLowerCase().includes(personalPlanQuery.toLowerCase()) ||
                    `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(personalPlanQuery.toLowerCase())
                )
                .map((u) => (
                  <button
                    key={`personal-opt-${u.id}`}
                    onClick={() => {
                      setSelectedUserPlanId(u.id);
                      setPersonalPlanQuery(u.display_name);
                      setShowPersonalSelector(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition duration-100 flex items-center justify-between cursor-pointer ${
                      selectedUserPlanId === u.id ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-slate-300 hover:bg-slate-850"
                    }`}
                  >
                    <span>
                      {u.display_name} ({u.role === "admin" ? "Camp-Admin" : "Helfer*in"})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{getUserWorkloadStats(u.id).assignmentsCount} Schichten</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected User Agenda Output */}
      {selectedUserPlanId
        ? (() => {
            const matchedUser = users.find((u) => u.id === selectedUserPlanId);
            if (!matchedUser) return null;
            const uStats = getUserWorkloadStats(matchedUser.id);
            // Status-Änderungen (Zusagen/Absagen) für eine andere Person darf
            // nur die Lagerleitung vornehmen - siehe isSelfOrLagerleitung im
            // Backend, das dies serverseitig ohnehin durchsetzt. Hier zusätzlich
            // in der UI verbergen, damit keine scheinbar funktionsfähigen,
            // serverseitig aber abgelehnten Buttons angezeigt werden.
            const canManageSelected = matchedUser.id === currentUserId || accessRole === "lagerleitung";

            return (
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch" id="personal-schedule-details">
                {/* Profile Card Summary & Milestones */}
                <div className="lg:col-span-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center text-white text-sm font-extrabold shadow-md">
                        {matchedUser.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-100 font-display">{matchedUser.display_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ROLE: <span className="text-emerald-400 uppercase font-extrabold">{matchedUser.role}</span> • STATUS:{" "}
                          <span className="text-emerald-400 uppercase font-extrabold">{matchedUser.active ? "AKTIV" : "INAKTIV"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1.5 font-sans">
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Einsätze</span>
                        <span className="text-lg font-bold text-white font-mono">{uStats.assignmentsCount}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Gesamtstunden</span>
                        <span className="text-lg font-bold text-emerald-400 font-mono">{uStats.hours}h</span>
                      </div>
                    </div>

                    {/* Workload Indicator Pill */}
                    <div className="pt-1.5 flex items-center justify-between text-xs font-sans">
                      <span className="text-slate-400 text-[11px] font-semibold">Auslastungs-Klasse:</span>
                      <span
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg font-mono tracking-wide ${
                          uStats.hours > 6
                            ? "bg-rose-950/40 border border-rose-500/35 text-rose-400"
                            : uStats.hours > 2
                            ? "bg-emerald-950/40 border border-emerald-500/35 text-emerald-400"
                            : "bg-amber-950/40 border border-amber-500/35 text-amber-400"
                        }`}
                      >
                        {uStats.hours > 6 ? "🚨 Überlastet (High)" : uStats.hours > 2 ? "✅ Optimal (Mid)" : "❄️ Gering (Low)"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 mt-4 flex flex-col space-y-2">
                    {uStats.assignmentsCount > 0 ? (
                      <>
                        <button
                          onClick={() => handleCopyPersonalSchedule(matchedUser.display_name, uStats.shiftsDetails)}
                          className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center justify-center space-x-2 w-full cursor-pointer transition"
                        >
                          <Share2 className="h-4 w-4 shrink-0" />
                          <span>WhatsApp Sende-Vorlage</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPersonalSchedule(matchedUser.display_name, uStats.shiftsDetails)}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-350 text-xs rounded-xl font-bold flex items-center justify-center space-x-2 w-full cursor-pointer transition"
                        >
                          <Download className="h-4 w-4 shrink-0 text-emerald-400" />
                          <span>Dienstplan herunterladen (.txt)</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic text-center w-full block">Noch keine Schichten zu kopieren.</span>
                    )}
                  </div>
                </div>

                {/* Chronological Timeline & Accept Action */}
                <div className="lg:col-span-8 p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col">
                  <div className="text-xs font-semibold uppercase text-slate-450 text-slate-400 border-b border-slate-800 pb-2 mb-3 tracking-wider font-mono flex flex-wrap justify-between items-center gap-2">
                    <span>📅 Deine Schichten & Belegungsstatus:</span>
                    <div className="flex items-center space-x-2">
                      {canManageSelected && uStats.shiftsDetails.some(({ assignment }) => assignment.status !== "accepted") && (
                        <button
                          type="button"
                          onClick={() => handleBulkAcceptAssignments(matchedUser.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
                          title="Alle noch offenen Schichten auf einmal zusagen"
                        >
                          <span>✓</span>
                          <span>Alle Schichten zusagen</span>
                        </button>
                      )}
                      <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px]">{uStats.assignmentsCount} Slots</span>
                    </div>
                  </div>

                  {!canManageSelected && (
                    <p className="text-[10px] text-slate-500 italic mb-2 font-sans">
                      Nur zur Ansicht - Status ändern kann nur die Lagerleitung.
                    </p>
                  )}

                  {uStats.shiftsDetails.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <span className="text-2xl mb-2">🏕️</span>
                      <p className="text-xs text-slate-200 font-bold font-sans">Aktuell keine Schichten eingetragen</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 max-w-sm font-sans">
                        Für {matchedUser.display_name} wurden noch keine Arbeitsschichten hinterlegt. Melde dich im Gesamtplan oder beim Admin-Team!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                      {uStats.shiftsDetails.map(({ shift, assignment }) => {
                        const svc = services.find((sv) => sv.id === shift.service_id);
                        if (!svc) return null;

                        return (
                          <div
                            key={assignment.id}
                            className="p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                          >
                            {/* Left: Task summary */}
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: svc.color || "#10b981" }} />
                                <p className="text-xs font-black text-white font-sans">{svc.title}</p>
                                <span className="text-[10px] bg-slate-950 text-slate-450 border border-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400">
                                  {formatDateWithDayPrefix(shift.date)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono pl-4">
                                🕒 {shift.start_time} - {shift.end_time} Uhr • 📍 {svc.location}
                              </p>
                            </div>

                            {/* Right: Confirmation Status Controls */}
                            <div className="flex items-center space-x-2 self-end sm:self-center">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border mr-1.5 ${
                                  assignment.status === "accepted"
                                    ? "bg-emerald-950/40 border-emerald-500/25 text-emerald-400"
                                    : assignment.status === "maybe"
                                    ? "bg-amber-950/40 border-amber-500/25 text-amber-400"
                                    : "bg-rose-950/40 border-rose-500/25 text-rose-450 text-rose-400"
                                }`}
                              >
                                {assignment.status === "accepted" ? "ZUGESAGT ✓" : assignment.status === "maybe" ? "VIELLEICHT ?" : "PENDING"}
                              </span>

                              {/* Dropdown status update buttons - nur für sich selbst oder als Lagerleitung */}
                              {canManageSelected ? (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handlePersonalStatusChange(assignment.id, "accepted")}
                                    title="Zusagen"
                                    className={`p-1 border rounded-lg transition cursor-pointer ${
                                      assignment.status === "accepted"
                                        ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                        : "bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white"
                                    }`}
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handlePersonalStatusChange(assignment.id, "maybe")}
                                    title="Vielleicht / Unsicher"
                                    className={`p-1 border rounded-lg transition cursor-pointer ${
                                      assignment.status === "maybe"
                                        ? "bg-amber-500 border-amber-500 text-slate-950"
                                        : "bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white"
                                    }`}
                                  >
                                    <span className="text-[9px] font-bold font-mono px-0.5">?</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-500 italic font-sans" title="Nur die Lagerleitung kann Schichten für andere bestätigen.">
                                  nur Ansicht
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        : <p className="text-xs text-slate-500 italic mt-4 text-center">Bitte wähle ein Helfer-Profil aus dem Suchfeld aus.</p>}
    </div>
  );
}
