import React from "react";
import { AlertCircle, UserCheck, UserPlus, X } from "lucide-react";
import { Shift, Service, User, ShiftAssignment } from "../types";
import { timeToMinutes, sortByFirstName } from "../utils";

interface ShiftDeployWizardProps {
  s: Shift;
  assigned: ShiftAssignment[];
  services: Service[];
  assignments: ShiftAssignment[];
  shifts: Shift[];
  users: User[];
  isWizardActive: boolean;
  suggestions: Array<{ user_id: string; year: number; camp_title: string }>;
  setActiveShiftWizardId: (id: string | null) => void;
  handleAssignUser: (shiftId: string, userId: string) => Promise<void>;
}

/** Prüft, ob eine Person am selben Tag bereits eine zeitlich überschneidende Schicht hat. */
function getOverlapInfo(
  userId: string,
  s: Shift,
  assignments: ShiftAssignment[],
  shifts: Shift[],
  services: Service[]
): { overlapping: boolean; overlappingServiceTitle: string } {
  const userDayShifts = assignments
    .filter((a) => a.user_id === userId)
    .map((a) => shifts.find((sh) => sh.id === a.shift_id))
    .filter((sh): sh is Shift => !!sh && sh.date === s.date);

  const sStart = timeToMinutes(s.start_time);
  const sEnd = timeToMinutes(s.end_time);

  for (const usd of userDayShifts) {
    const usdStart = timeToMinutes(usd.start_time);
    const usdEnd = timeToMinutes(usd.end_time);
    if (sStart < usdEnd && usdStart < sEnd) {
      const matchesSvc = services.find((sv) => sv.id === usd.service_id);
      return {
        overlapping: true,
        overlappingServiceTitle: matchesSvc ? `${matchesSvc.title} (${usd.start_time}-${usd.end_time})` : "Anderer Dienst",
      };
    }
  }
  return { overlapping: false, overlappingServiceTitle: "" };
}

/**
 * Zuordnungs-Assistent einer Schicht: Vorjahres-Vorschläge + vollständige
 * Helfer-Liste, jeweils mit Kollisionswarnung. Extrahiert aus ShiftRow.tsx.
 */
export default function ShiftDeployWizard({
  s,
  assigned,
  services,
  assignments,
  shifts,
  users,
  isWizardActive,
  suggestions,
  setActiveShiftWizardId,
  handleAssignUser,
}: ShiftDeployWizardProps) {
  if (!isWizardActive) {
    return (
      <button
        onClick={() => setActiveShiftWizardId(s.id)}
        className="px-4 py-2 bg-slate-950 hover:bg-slate-800 hover:text-emerald-400 hover:border-slate-700 border border-dashed border-slate-800 transition-all font-bold text-xs text-slate-300 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer font-mono"
      >
        <UserCheck className="h-4 w-4 text-emerald-450" />
        <span>Zuordnen</span>
      </button>
    );
  }

  return (
    <div className="bg-slate-950/85 p-4 border border-slate-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Helfer*in zuordnen</span>
        <button onClick={() => setActiveShiftWizardId(null)} className="text-slate-405 hover:text-white p-0.5 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Historical suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5 border-b border-slate-850 pb-3 mb-2.5">
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            💡 VORSCHLÄGE_AUS_VORJAHREN ({suggestions.length}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((sug) => {
              const sugUser = users.find((u) => u.id === sug.user_id);
              if (!sugUser || !sugUser.active || assigned.some((a) => a.user_id === sug.user_id)) return null;

              const { overlapping } = getOverlapInfo(sugUser.id, s, assignments, shifts, services);

              return (
                <button
                  key={sug.user_id}
                  onClick={() => handleAssignUser(s.id, sug.user_id)}
                  className={`p-2 rounded-xl text-xs font-semibold text-left flex items-start gap-11.5 justify-between transition-all border shadow-xs cursor-pointer ${
                    overlapping
                      ? "bg-rose-950/40 text-rose-300 border-rose-900/40 hover:bg-rose-950/60"
                      : "bg-emerald-950/30 hover:bg-emerald-950/60 border-emerald-950 hover:border-emerald-500/20 text-slate-100"
                  }`}
                >
                  <div>
                    <div className="font-extrabold flex items-center gap-1.5">
                      <span>{sugUser.display_name}</span>
                    </div>
                    <div className="text-[9px] font-mono font-semibold text-emerald-400 mt-0.5">Aus {sug.camp_title}</div>
                  </div>

                  {overlapping ? (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5">
                      <title>Kollision</title>
                    </AlertCircle>
                  ) : (
                    <UserPlus className="h-4 w-4 text-emerald-450 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
        {sortByFirstName(users.filter((u) => u.active && !assigned.some((a) => a.user_id === u.id)))
          .map((u) => {
            const { overlapping, overlappingServiceTitle } = getOverlapInfo(u.id, s, assignments, shifts, services);

            return (
              <button
                key={u.id}
                onClick={() => handleAssignUser(s.id, u.id)}
                title={overlapping ? `Kollision mit: ${overlappingServiceTitle}` : "Als Helfer*in zuteilen"}
                className={`p-2 rounded-lg text-xs font-semibold text-left flex items-start gap-1 justify-between transition-all border cursor-pointer ${
                  overlapping
                    ? "bg-rose-950/40 text-rose-300 border-rose-900/40 hover:bg-rose-950/60"
                    : "bg-slate-900 hover:bg-emerald-950/30 text-slate-200 border-slate-800 hover:border-emerald-500/20"
                }`}
              >
                <div className="truncate pr-1">
                  <span className="block truncate leading-tight font-extrabold">{u.display_name}</span>
                </div>

                {overlapping ? (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5">
                    <title>{`Kollision mit: ${overlappingServiceTitle}`}</title>
                  </AlertCircle>
                ) : (
                  <UserPlus className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}
