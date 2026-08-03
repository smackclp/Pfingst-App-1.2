import React from "react";
import { Clock, Info, X, AlertCircle, Plus } from "lucide-react";
import { Shift, Service, User, ShiftAssignment } from "../types";
import { Tooltip } from "./Tooltip";

interface CalendarCardProps {
  key?: any;
  s: Shift;
  svc: Service;
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  users: any[];
  isExpanded: boolean;
  onToggleExpand: (shiftId: string) => void;
  startDate: string;
  sunDate: string;
  endDate: string;
  isAdmin: boolean;
  isPopoverActive: boolean;
  onOpenPopover: (shiftId: string) => void;
  onClosePopover: () => void;
  onRemoveAssignment: (shiftId: string, userId: string) => any;
  onAddAssignment: (shiftId: string, userId: string) => any;
  onToggleAssignmentAccepted?: (assignmentId: string, accepted: boolean) => any;
  selectedPersonId?: string;
  currentUserId?: string | null;
  suggestions: any[];
  loadingSuggestions: boolean;
  calculateShiftDurationHours: (start: string, end: string) => number;
  formatDateGerman: (dateStr: string) => string;
}

export default function CalendarCard({
  s,
  svc,
  services,
  shifts,
  assignments,
  users,
  isExpanded,
  onToggleExpand,
  startDate,
  sunDate,
  endDate,
  isAdmin,
  isPopoverActive,
  onOpenPopover,
  onClosePopover,
  onRemoveAssignment,
  onAddAssignment,
  onToggleAssignmentAccepted,
  selectedPersonId,
  currentUserId,
  suggestions,
  loadingSuggestions,
  calculateShiftDurationHours,
  formatDateGerman
}: CalendarCardProps) {
  const assigned = assignments.filter((a) => a.shift_id === s.id);
  const assignedCount = assigned.length;

  const isUnderstaffed = assignedCount < svc.min_persons;
  const isOverstaffed = assignedCount > svc.max_persons;

  const borderTheme = svc.color || "#3b82f6";

  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  return (
    <div
      id={`shift-card-${s.id}`}
      onClick={() => onToggleExpand(s.id)}
      className={`bg-slate-900/85 backdrop-blur-md rounded-2xl border transition-all duration-300 flex flex-col p-4 cursor-pointer select-none ${
        isExpanded
          ? "border-emerald-500/35 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.06)] space-y-3"
          : "border-slate-800/80 hover:border-emerald-500/20 hover:bg-slate-900/95 space-y-1.5"
      }`}
    >
      {/* Top Bar: Color stripe and Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="truncate flex-1">
          <div className="flex items-center space-x-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: borderTheme }}
            />
            <h4 className="text-base font-bold font-display text-white truncate" title={svc.title}>
              {svc.title}
            </h4>
          </div>
        </div>

        {isExpanded && (
          /* Status badge */
          <div className="shrink-0 flex items-center font-mono">
            {isUnderstaffed ? (
              <Tooltip content={`Mindestbesetzung fehlt! Mindestens ${svc.min_persons} Personen benötigt für einen sicheren Ablauf.`} position="left" delay={200}>
                <span
                  className="bg-amber-950 text-amber-400 border border-amber-500/20 text-[10px] font-semibold px-2 py-0.5 rounded animate-pulse cursor-help"
                >
                  Soll: {svc.min_persons} • Ist: {assignedCount}
                </span>
              </Tooltip>
            ) : isOverstaffed ? (
              <Tooltip content={`Maximalkapazität überschritten! Limit liegt bei ${svc.max_persons} Personen.`} position="left" delay={200}>
                <span
                  className="bg-rose-950 text-rose-400 border border-rose-500/25 text-[10px] font-semibold px-2 py-0.5 rounded cursor-help"
                >
                  Überbesetzt ({assignedCount}/{svc.max_persons})
                </span>
              </Tooltip>
            ) : (
              <Tooltip content={`Dienst ist optimal besetzt (${assignedCount} von max. ${svc.max_persons} Plätzen).`} position="left" delay={200}>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded cursor-help">
                  Vollständig ({assignedCount})
                </span>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Core details (Day and time) always visible */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
        {s.date === "Haupt" ? (
          <span className="font-semibold text-emerald-400 font-mono text-sm">
            Dauerhaft besetztes Team
          </span>
        ) : (
          <>
            <span className="font-semibold text-slate-200 font-mono text-sm flex items-center">
              {s.date === startDate && <span className="text-emerald-400 font-bold mr-1">Sa.</span>}
              {s.date === sunDate && <span className="text-emerald-400 font-bold mr-1">So.</span>}
              {s.date === endDate && <span className="text-emerald-400 font-bold mr-1">Mo.</span>}
              {s.start_time} - {s.end_time} Uhr
            </span>
            <span className="text-slate-500 font-medium font-mono text-xs">
              ({calculateShiftDurationHours(s.start_time, s.end_time)} Std)
            </span>
          </>
        )}
        {(isExpanded) && (
          <span className="bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded shrink-0">
            {formatDateGerman(s.date)}
          </span>
        )}
      </div>

      {/* Collapsible area */}
      {isExpanded && (
        <>
          {s.notes && (
            <div className="flex items-start space-x-1.5 text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/40 font-sans">
              <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <span className="italic leading-relaxed">{s.notes}</span>
            </div>
          )}

          {/* Helpers Assigned Grid */}
          <div className="pt-2.5 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold font-mono pb-1.5">
              <span className="uppercase tracking-wider">Helfer*innen ({assignedCount})</span>
              <span className="text-slate-400 font-normal">Soll: {svc.min_persons}-{svc.max_persons} P.</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {assignedCount === 0 ? (
                <p className="text-xs text-slate-500 italic py-1 font-mono">Keine Helfer*innen eingeteilt</p>
              ) : (
                assigned.map((ass) => {
                  const userObj = users.find((u) => u.id === ass.user_id);
                  if (!userObj) return null;

                  const isUserAccepted = ass.accepted;

                  return (
                    <div
                      key={ass.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleAssignmentAccepted) {
                          onToggleAssignmentAccepted(ass.id, !ass.accepted);
                        }
                      }}
                      className={`flex items-center space-x-1.5 rounded-lg py-1 px-2.5 border transition-all text-xs font-bold cursor-pointer select-none ${
                        isUserAccepted
                          ? "bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.05)]"
                          : "bg-slate-950 hover:bg-slate-900 border-slate-800/60 text-slate-400"
                      }`}
                      title={isUserAccepted ? "Bestätigter Dienst (Klicken zum Ändern)" : "Offener Dienst - unbestätigt (Klicken zum Bestätigen)"}
                    >
                      <span className="flex items-center">
                        {isUserAccepted ? (
                          <span className="text-emerald-400 font-bold mr-1.5" id={`accepted-badge-${ass.id}`}>✓</span>
                        ) : (
                          <span className="text-amber-550 text-amber-500 font-bold mr-1.5" id={`pending-badge-${ass.id}`}>⏳</span>
                        )}
                        <span>{userObj.display_name}</span>
                      </span>
                      {isAdmin && (
                        <Tooltip content={`Austragen: ${userObj.display_name} aus dieser Schicht entfernen`} position="left" delay={150}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAssignment(s.id, userObj.id);
                            }}
                            className="text-slate-500 hover:text-rose-450 p-0.5 hover:bg-slate-800 rounded transition cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Direct confirmation for selected filter person */}
            {(() => {
              const myAss = selectedPersonId ? assigned.find((a) => a.user_id === selectedPersonId) : null;
              if (!myAss || !onToggleAssignmentAccepted) return null;
              return (
                <div className="mt-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between" id={`personal-accept-area-${s.id}`}>
                  <span className="text-[11px] text-slate-400 font-mono font-medium">Status für {users.find(u => u.id === selectedPersonId)?.display_name}:</span>
                  <Tooltip content={myAss.accepted ? "Klicken, um Bestätigung zurückzuziehen (Dienst ist zurzeit zugesagt)" : "Hier klicken, um die Schicht verbindlich zuzusagen und auf Grün zu setzen"} position="top" delay={150}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAssignmentAccepted(myAss.id, !myAss.accepted);
                      }}
                      className={`px-3 py-1.5 text-xs font-extrabold font-mono rounded-lg transition-all flex items-center space-x-1.5 border cursor-pointer ${
                        myAss.accepted
                          ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900"
                          : "bg-amber-950/80 border border-amber-500/30 text-amber-300 hover:bg-amber-900 animate-pulse"
                      }`}
                    >
                      {myAss.accepted ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 bg-emerald-450 inline-block mr-1"></span>
                          <span>Bestätigt ✓</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-450 bg-amber-400 inline-block mr-1"></span>
                          <span>Bestätigen ?</span>
                        </>
                      )}
                    </button>
                  </Tooltip>
                </div>
              );
            })()}

            {/* Interactive button for current acting user profile (Mich eintragen / Mich abmelden / Status ändern) */}
            {currentUserId && (() => {
              const meUser = users.find(u => u.id === currentUserId);
              if (!meUser) return null;
              
              const myAss = assigned.find((a) => a.user_id === currentUserId);
              
              return (
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>Profil <strong>{meUser.display_name}</strong>:</span>
                  </div>

                  {myAss ? (
                    <div className="flex items-center space-x-1.5 font-mono">
                      {/* Confirm/unconfirm status button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onToggleAssignmentAccepted) {
                            onToggleAssignmentAccepted(myAss.id, !myAss.accepted);
                          }
                        }}
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition-all flex items-center space-x-1 cursor-pointer ${
                          myAss.accepted 
                            ? "bg-emerald-950/40 border-emerald-500/25 text-emerald-400" 
                            : "bg-amber-950/40 border-amber-500/25 text-amber-400"
                        }`}
                      >
                        {myAss.accepted ? "Zusage status ändern" : "Zusagen ✓"}
                      </button>

                      {/* Self sign-off */}
                      <button
                        type="button"
                        onClick={() => onRemoveAssignment(s.id, currentUserId)}
                        className="px-2.5 py-1 bg-red-950/40 border border-red-500/20 hover:border-red-500 text-rose-400 hover:text-rose-300 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer"
                        title="Dienst verlassen"
                      >
                        Austragen ✕
                      </button>
                    </div>
                  ) : (
                    assignedCount < svc.max_persons ? (
                      <button
                        type="button"
                        onClick={() => onAddAssignment(s.id, currentUserId)}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 text-[10px] font-extrabold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-md"
                      >
                        <span>Mich für diesen Dienst eintragen 🤝</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic shrink-0">Schicht voll belegt</span>
                    )
                  )}
                </div>
              );
            })()}
          </div>

          {/* Admin Fast Assign Interface */}
          {isAdmin && (
            <div className="pt-2.5 border-t border-slate-800/40" onClick={(e) => e.stopPropagation()}>
              {isPopoverActive ? (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      Helfer*innen schnell zuweisen
                    </span>
                    <button onClick={onClosePopover} className="text-slate-500 hover:text-white cursor-pointer">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                    {/* Historical suggestions */}
                    {suggestions.length > 0 && (
                      <div className="space-y-1.5 border-b border-slate-900 pb-2.5 mb-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono tracking-wider flex items-center justify-between">
                          <span>💡 Vorjahr-Empfehlung</span>
                          {loadingSuggestions && (
                            <span className="animate-spin h-3.5 w-3.5 border border-emerald-500 rounded-full border-t-transparent inline-block"></span>
                          )}
                        </span>
                        <div className="space-y-1.5">
                          {suggestions.map((sug) => {
                            const sugUser = users.find((u) => u.id === sug.user_id);
                            if (!sugUser || !sugUser.active || assigned.some((a) => a.user_id === sug.user_id)) {
                              return null;
                            }

                            // Check overlap
                            const userShiftsOnDay = assignments
                              .filter((a) => a.user_id === sugUser.id)
                              .map((a) => shifts.find((sh) => sh.id === a.shift_id))
                              .filter((sh): sh is Shift => !!sh && sh.date === s.date);

                            let hasCollision = false;
                            const sStart = timeToMinutes(s.start_time);
                            const sEnd = timeToMinutes(s.end_time);

                            for (const usd of userShiftsOnDay) {
                              const usdStart = timeToMinutes(usd.start_time);
                              const usdEnd = timeToMinutes(usd.end_time);
                              if (sStart < usdEnd && usdStart < sEnd) {
                                hasCollision = true;
                                break;
                              }
                            }

                            return (
                              <button
                                key={sug.user_id}
                                onClick={() => onAddAssignment(s.id, sug.user_id)}
                                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg flex items-center justify-between transition border ${
                                  hasCollision
                                    ? "bg-rose-950/20 text-rose-400 border-rose-900/40"
                                    : "bg-emerald-950/30 text-emerald-300 border-emerald-900 hover:border-emerald-500 hover:bg-emerald-950/50"
                                }`}
                              >
                                <div>
                                  <span className="block font-bold">{sugUser.display_name}</span>
                                  <span className="text-[8px] text-emerald-400 font-mono">Aus {sug.camp_title}</span>
                                </div>
                                {hasCollision ? (
                                  <span className="text-[9px] font-mono text-rose-400 uppercase pr-1">Kollision</span>
                                ) : (
                                  <Plus className="h-4 w-4 text-emerald-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {users
                      .filter((u) => u.active && !assigned.some((a) => a.user_id === u.id))
                      .map((u) => {
                        // Check if this user has any overlap conflicts on this day with this shift
                        const userShiftsOnDay = assignments
                          .filter((a) => a.user_id === u.id)
                          .map((a) => shifts.find((sh) => sh.id === a.shift_id))
                          .filter((sh): sh is Shift => !!sh && sh.date === s.date);

                        let hasCollision = false;
                        let collisionServiceTitle = "";
                        const sStart = timeToMinutes(s.start_time);
                        const sEnd = timeToMinutes(s.end_time);

                        for (const usd of userShiftsOnDay) {
                          const usdStart = timeToMinutes(usd.start_time);
                          const usdEnd = timeToMinutes(usd.end_time);
                          if (sStart < usdEnd && usdStart < sEnd) {
                            hasCollision = true;
                            const matchesSvc = services.find(sv => sv.id === usd.service_id);
                            collisionServiceTitle = matchesSvc ? `${matchesSvc.title} (${usd.start_time}-${usd.end_time})` : "Anderer Dienst";
                            break;
                          }
                        }

                        return (
                          <button
                            key={u.id}
                            onClick={() => onAddAssignment(s.id, u.id)}
                            title={hasCollision ? `Arbeitet bereits in: ${collisionServiceTitle}` : `Als Helfer*in für diesen Dienst eintragen`}
                            className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                              hasCollision
                                ? "bg-rose-950/30 text-rose-400 border border-rose-500/20"
                                : "bg-slate-900 hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 border border-slate-800/60 hover:border-emerald-500/30"
                            }`}
                          >
                            <span className="font-semibold truncate">{u.display_name}</span>
                            {hasCollision ? (
                              <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/20 flex items-center space-x-1 animate-pulse">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>BELEGT</span>
                              </span>
                            ) : (
                              <Plus className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <Tooltip content="Öffnet das Schnelleinteilungs-Menü mit Helferauswahl und Vorjahr-Empfehlungen" position="top" delay={150}>
                  <button
                    onClick={() => onOpenPopover(s.id)}
                    className="w-full py-2 bg-slate-950 border border-dashed border-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/15 hover:border-emerald-500/35 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-mono"
                  >
                    <Plus className="h-4 w-4 text-emerald-400" />
                    <span>MEMBER_EINTEILEN</span>
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
