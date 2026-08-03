import React from "react";
import { User as UserType, Service, Shift, ShiftAssignment, Camp } from "../types";
import { addDays } from "../utils";

interface CalendarTableViewProps {
  filteredShifts: Shift[];
  services: Service[];
  assignments: ShiftAssignment[];
  users: UserType[];
  activeCamp?: Camp;
  onToggleAssignmentAccepted?: (assignmentId: string, accepted: boolean) => Promise<void>;
}

export default function CalendarTableView({
  filteredShifts,
  services,
  assignments,
  users,
  activeCamp,
  onToggleAssignmentAccepted
}: CalendarTableViewProps) {
  const startDate = activeCamp?.start_date || "2026-05-23";
  const sunDate = addDays(startDate, 1);
  const endDate = activeCamp?.end_date || "2026-05-25";

  const getDayLabel = (dateStr: string): string => {
    if (dateStr === startDate) return "Samstag";
    if (dateStr === sunDate) return "Sonntag";
    if (dateStr === endDate) return "Montag";
    if (dateStr === "Haupt") return "Allgemein";
    return dateStr;
  };

  return (
    <div className="bg-slate-900/95 border border-emerald-500/10 rounded-2xl shadow-xl overflow-hidden" id="calendar-table">
      <div className="overflow-x-auto min-w-full">
        <table className="min-w-full text-slate-300 table-auto border-collapse text-left">
          <thead className="bg-slate-950/90 border-b border-slate-800 text-emerald-500/80 uppercase tracking-wider text-[9px] font-bold font-mono">
            <tr>
              <th className="py-3 px-4">Tag • Uhrzeit</th>
              <th className="py-3 px-4">Dienst / Aufgabe</th>
              <th className="py-3 px-4">Ort</th>
              <th className="py-3 px-4">Hauptverantwortung</th>
              <th className="py-3 px-4">Mitglieder</th>
              <th className="py-3 px-4 font-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-xs">
            {filteredShifts.map((s) => {
              const svc = services.find(sv => sv.id === s.service_id);
              if (!svc) return null;

              const assigned = assignments.filter(a => a.shift_id === s.id);
              const assignedCount = assigned.length;
              const isUnderstaffed = assignedCount < svc.min_persons;

              const hvPerson = users.find(u => u.id === svc.responsible_id);

              return (
                <tr key={s.id} className="hover:bg-slate-850/25 transition border-b border-slate-900">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <p className="font-bold text-slate-200">{getDayLabel(s.date)}</p>
                    <span className="font-mono text-slate-400 inline-block mt-0.5">
                      {s.date === "Haupt" ? "Dauerhaft" : `${s.start_time} - ${s.end_time}`}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 opacity-80" 
                        style={{ backgroundColor: svc.color || "#3b82f6" }}
                      />
                      <p className="font-bold text-slate-100 font-display">{svc.title}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <p className="font-medium text-slate-200">{svc.location || "Lager"}</p>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-350 font-bold font-mono">
                    {hvPerson ? hvPerson.display_name : <span className="text-slate-500 italic">Offen</span>}
                  </td>
                  <td className="py-3 px-4">
                    {assignedCount === 0 ? (
                      <span className="text-rose-400 font-semibold italic font-mono text-[10px]">📍 VAKANT</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {assigned.map(a => {
                          const u = users.find(user => user.id === a.user_id);
                          const isAccepted = a.accepted;
                          return u ? (
                            <span 
                              key={a.id} 
                              onClick={() => {
                                if (onToggleAssignmentAccepted) {
                                  onToggleAssignmentAccepted(a.id, !a.accepted);
                                }
                              }}
                              className={`border font-semibold text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center cursor-pointer select-none transition-colors ${
                                isAccepted 
                                  ? "bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border-emerald-500/20" 
                                  : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800"
                              }`}
                              title={isAccepted ? "Bestätigter Dienst (Klicken zum Ändern)" : "Dienst unbestätigt (Klicken zum Bestätigen)"}
                            >
                              {isAccepted ? (
                                <span className="text-emerald-450 text-emerald-400 font-bold mr-0.5">✓</span>
                              ) : (
                                <span className="text-amber-500 font-bold mr-0.5">⏳</span>
                              )}
                              <span>{u.display_name}</span>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {isUnderstaffed ? (
                      <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-amber-950 text-amber-400 border border-amber-500/20 font-mono">
                        Soll: {svc.min_persons} • Ist: {assignedCount}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 font-mono">
                        ERFÜLLT ({assignedCount})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
