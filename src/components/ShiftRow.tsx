import React from "react";
import { Clock, MapPin, Trash2, UserCheck, AlertTriangle, UserMinus, X, Edit, Plus } from "lucide-react";
import { Shift, Service, User, ShiftAssignment } from "../types";
import ShiftDeployWizard from "./ShiftDeployWizard";

interface ShiftRowProps {
  s: Shift;
  svc: Service;
  services: Service[];
  assignments: ShiftAssignment[];
  shifts: Shift[];
  users: User[];
  isAdmin: boolean;
  currentUserId?: string | null;
  activeShiftWizardId: string | null;
  onUpdateShift?: (id: string, shift: Partial<Shift>) => Promise<void>;
  onDeleteShift: (id: string, label: string) => Promise<void>;
  onRemoveAssignment: (shiftId: string, userId: string) => Promise<void>;
  onToggleAssignmentAccepted?: (assignmentId: string, accepted: boolean) => Promise<void>;
  suggestions: Array<{ user_id: string; year: number; camp_title: string }>;
  loadingSuggestions: boolean;
  setActiveShiftWizardId: (id: string | null) => void;
  getDayLabel: (dateStr: string) => string;
  formatDateGerman: (dateStr: string) => string;
  handleAssignUser: (shiftId: string, userId: string) => Promise<void>;
}

function ShiftRow({
  s,
  svc,
  services,
  assignments,
  shifts,
  users,
  isAdmin,
  currentUserId,
  activeShiftWizardId,
  onUpdateShift,
  onDeleteShift,
  onRemoveAssignment,
  onToggleAssignmentAccepted,
  suggestions,
  loadingSuggestions,
  setActiveShiftWizardId,
  getDayLabel,
  formatDateGerman,
  handleAssignUser,
  startDate = "2026-05-23",
  sunDate = "2026-05-24",
  endDate = "2026-05-25"
}: ShiftRowProps & { startDate?: string; sunDate?: string; endDate?: string }) {
  const assigned = assignments.filter((a) => a.shift_id === s.id);
  const isWizardActive = activeShiftWizardId === s.id;

  const minPersons = s.min_persons !== undefined ? s.min_persons : svc.min_persons;
  const maxPersons = s.max_persons !== undefined ? s.max_persons : svc.max_persons;
  const assignedCount = assigned.length;
  const userAssignment = currentUserId ? assigned.find((a) => a.user_id === currentUserId) : undefined;

  const [isEditingInline, setIsEditingInline] = React.useState(false);
  const [editDate, setEditDate] = React.useState(s.date);
  const [editStart, setEditStart] = React.useState(s.start_time);
  const [editEnd, setEditEnd] = React.useState(s.end_time);
  const [editNotes, setEditNotes] = React.useState(s.notes || "");
  const [editMin, setEditMin] = React.useState(String(s.min_persons !== undefined ? s.min_persons : svc.min_persons));
  const [editMax, setEditMax] = React.useState(String(s.max_persons !== undefined ? s.max_persons : svc.max_persons));

  const toggleEditInline = () => {
    if (isEditingInline) {
      setIsEditingInline(false);
    } else {
      setEditDate(s.date);
      setEditStart(s.start_time);
      setEditEnd(s.end_time);
      setEditNotes(s.notes || "");
      setEditMin(String(s.min_persons !== undefined ? s.min_persons : svc.min_persons));
      setEditMax(String(s.max_persons !== undefined ? s.max_persons : svc.max_persons));
      setIsEditingInline(true);
    }
  };

  const handleSaveEditInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateShift) {
      await onUpdateShift(s.id, {
        date: editDate,
        start_time: editStart,
        end_time: editEnd,
        notes: editNotes,
        min_persons: editMin ? Number(editMin) : undefined,
        max_persons: editMax ? Number(editMax) : undefined,
      });
    }
    setIsEditingInline(false);
  };

  return (
    <div
      className={`bg-slate-900/80 backdrop-blur-md rounded-2xl border ${isEditingInline ? 'border-cyan-500 ring-2 ring-cyan-500/15 scale-[1.01]' : 'border-slate-800'} overflow-hidden shadow-lg shadow-black/25 flex flex-col hover:border-emerald-500/10 transition-all duration-300 animate-fade-in`}
      id={`shift-row-${s.id}`}
    >
      <div className="flex flex-col md:flex-row">
      {/* Visual Left Badge Column (General Details) */}
      <div className="md:w-72 bg-slate-950/70 border-r border-slate-800 p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: svc.color }} />
            <h4 className="text-sm font-extrabold text-white leading-tight font-display">{svc.title}</h4>
          </div>

          <div className="text-xs text-slate-300 space-y-1 font-sans">
            <p className="flex items-center space-x-2 font-semibold text-emerald-450 text-emerald-400">
              <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
              <span>
                {getDayLabel(s.date)}, {s.start_time} - {s.end_time} Uhr
              </span>
            </p>
          </div>

          <div className="pt-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              assignedCount >= minPersons
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : assignedCount > 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}>
              {assignedCount >= minPersons ? "✓ Besetzt" : assignedCount > 0 ? "⚠️ Helfer gesucht" : "🚨 Dringend gesucht"}
            </span>
          </div>

          {(() => {
            const displayNotes = s.notes ? s.notes.replace(/^Ort:\s*[^,]+(,\s*)?/i, "") : "";
            if (!displayNotes.trim()) return null;
            return (
              <p className="text-[11px] font-sans text-slate-300 italic leading-relaxed py-1.5 px-2 bg-slate-950/80 border-l-2 border-emerald-500 rounded">
                Info: {displayNotes}
              </p>
            );
          })()}
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2 justify-end md:justify-start pt-2 flex-wrap gap-2">
            <button
              onClick={toggleEditInline}
              className={`hover:bg-cyan-950/30 px-2.5 py-1.5 rounded-lg border flex items-center space-x-1 text-[11px] font-bold transition-all cursor-pointer ${
                isEditingInline
                  ? "text-cyan-400 border-cyan-800/60 bg-cyan-950/20"
                  : "text-slate-400 border-transparent hover:border-cyan-900/50"
              }`}
              title="Schicht bearbeiten"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>{isEditingInline ? "Schließen" : "Bearbeiten"}</span>
            </button>
            <button
              onClick={() => onDeleteShift(s.id, `${svc.title} am ${formatDateGerman(s.date)}`)}
              className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 px-2 py-1.5 rounded-lg border border-transparent hover:border-rose-900/50 flex items-center space-x-1 text-[11px] font-bold transition-all cursor-pointer"
              title="Schicht löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Schicht löschen</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Side Column (Staffing Assignment controls) */}
      <div className="flex-1 p-5 space-y-4 flex flex-col justify-between bg-slate-900/40">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span>
                Zugeordnete Helfer*innen ({assigned.length} von max. {maxPersons})
              </span>
            </h5>
            <span className="text-[10px] text-slate-400 font-mono">
              Mindestbesetzung: <span className="font-bold text-white">{minPersons}</span>
            </span>
          </div>

          {/* Personal Helper Status Banner if user is assigned */}
          {userAssignment && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300">
                <span>👤 Du bist bei dieser Schicht eingeteilt!</span>
                {userAssignment.accepted ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-500/30">
                    ✓ Bestätigt
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-md border border-amber-500/30">
                    ⏳ Bestätigung ausstehend
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!userAssignment.accepted && onToggleAssignmentAccepted && (
                  <button
                    type="button"
                    onClick={() => onToggleAssignmentAccepted(userAssignment.id, true)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Jetzt zusagen ✓
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAssignment(s.id, currentUserId!)}
                  className="px-2 py-1 bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                  title="Schicht verlassen"
                >
                  Austragen
                </button>
              </div>
            </div>
          )}

          {/* Allocated List */}
          {assigned.length === 0 ? (
            <div className="py-4 px-3 bg-rose-950/40 border border-rose-500/15 rounded-xl">
              <p className="text-xs text-rose-300 font-bold flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 ml-0.5 text-rose-500" />
                <span>Niemand für diesen Dienst eingeteilt!</span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {assigned.map((a) => {
                const helperObj = users.find((u) => u.id === a.user_id);
                if (!helperObj) return null;

                const isUserAccepted = a.accepted;

                return (
                  <div 
                    key={a.id} 
                    onClick={() => {
                      if (onToggleAssignmentAccepted) {
                        onToggleAssignmentAccepted(a.id, !a.accepted);
                      }
                    }}
                    className={`p-2 border rounded-lg flex items-center justify-between cursor-pointer select-none transition-all ${
                      isUserAccepted
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                    title={isUserAccepted ? "Bestätigter Dienst (Klicken zum Ändern)" : "Dienst noch nicht bestätigt (Klicken zum Bestätigen)"}
                  >
                    <div className="truncate pr-1.5 flex items-center">
                      {isUserAccepted ? (
                        <span className="text-emerald-450 text-emerald-400 font-extrabold mr-1.5">✓</span>
                      ) : (
                        <span className="text-amber-500 font-bold mr-1.5">⏳</span>
                      )}
                      <span className="text-xs font-bold block truncate leading-none">
                        {helperObj.display_name}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAssignment(s.id, helperObj.id);
                        }}
                        className="text-slate-400 hover:text-rose-550 hover:text-rose-500 p-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-md transition shrink-0 cursor-pointer"
                        title="Austragen"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick 1-click Join for Active Helper if not assigned */}
        {currentUserId && !userAssignment && (
          <div className="pt-2">
            {assignedCount < maxPersons ? (
              <button
                type="button"
                onClick={() => handleAssignUser(s.id, currentUserId)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-emerald-950/60 hover:shadow-emerald-600/30 flex items-center justify-between cursor-pointer group"
                id={`quick-join-shift-${s.id}`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    <Plus className="h-4 w-4 text-white stroke-[3]" />
                  </div>
                  <span className="tracking-wide">Ich helfe bei dieser Schicht aus!</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-950/60 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-emerald-300/40 text-emerald-200">
                  {maxPersons - assignedCount} {maxPersons - assignedCount === 1 ? "Platz frei" : "Plätze frei"}
                </span>
              </button>
            ) : (
              <div className="py-2.5 px-3 bg-slate-950 border border-slate-800 text-slate-500 rounded-xl text-xs text-center font-semibold flex items-center justify-center space-x-1.5">
                <span>✓ Voll besetzt</span>
                <span className="font-mono text-[11px]">({assignedCount}/{maxPersons} Helfer)</span>
              </div>
            )}
          </div>
        )}

          {/* Deploy wizard toggle / card panel */}
          {isAdmin && (
            <div className="pt-2">
              <ShiftDeployWizard
                s={s}
                assigned={assigned}
                services={services}
                assignments={assignments}
                shifts={shifts}
                users={users}
                isWizardActive={isWizardActive}
                suggestions={suggestions}
                setActiveShiftWizardId={setActiveShiftWizardId}
                handleAssignUser={handleAssignUser}
              />
            </div>
          )}
      </div>

      </div>

      {isEditingInline && (
        <div className="border-t border-slate-800/80 bg-slate-950/70 p-5 space-y-4 animate-fade-in" id={`edit-shift-inline-panel-${s.id}`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 flex-wrap gap-2">
            <div>
              <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">Schichtdaten bearbeiten</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">Ändern Sie Zeiten, Belegungen und Details dieser Schicht.</p>
            </div>
            <button
              onClick={() => setIsEditingInline(false)}
              className="text-slate-500 hover:text-white p-0.5 cursor-pointer transition hover:bg-slate-900 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveEditInline} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Tag des Dienstes</label>
                <select
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-0 focus:border-cyan-500/40 text-white font-medium"
                >
                  <option value={startDate}>{getDayLabel(startDate)}, {formatDateGerman(startDate)} (Anreisetag)</option>
                  <option value={sunDate}>{getDayLabel(sunDate)}, {formatDateGerman(sunDate)} (Tag 2)</option>
                  <option value={endDate}>{getDayLabel(endDate)}, {formatDateGerman(endDate)} (Abreisetag)</option>
                  <option value="Haupt">Haupt / Dauerhaft</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Startzeit</label>
                <input
                  type="text"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  placeholder="HH:MM"
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-0 focus:border-cyan-500/40 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Endzeit</label>
                <input
                  type="text"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  placeholder="HH:MM"
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-0 focus:border-cyan-500/40 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Mindestbesetzung</label>
                <input
                  type="number"
                  value={editMin}
                  onChange={(e) => setEditMin(e.target.value)}
                  min="1"
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-0 focus:border-cyan-500/40 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Maximalbelegung</label>
                <input
                  type="number"
                  value={editMax}
                  onChange={(e) => setEditMax(e.target.value)}
                  min="1"
                  className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-0 focus:border-cyan-500/40 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Schicht-Aushang / Info</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-0 focus:border-cyan-500/40 text-white resize-none font-sans"
                placeholder="Zusätzliche Notizen oder Schichtinfos..."
              />
            </div>

            <div className="flex space-x-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setIsEditingInline(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-350 transition-all cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.20)] cursor-pointer"
              >
                Änderungen speichern
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// React.memo: verhindert unnötige Neuberechnung/Rendering einzelner Zeilen,
// wenn nur eine andere Zeile (z.B. per Zuweisungs-Assistent) betroffen ist.
// Wirkt nur, wenn die Aufrufer stabile Callback-Referenzen übergeben (siehe
// useCallback-Wraps in ShiftsView.tsx).
export default React.memo(ShiftRow);
