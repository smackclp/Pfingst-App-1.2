import React from "react";
import { User, Service, Shift, ShiftAssignment, Camp } from "../types";
import { formatDateGerman, getDayNameShort } from "../utils";

interface PrintScheduleTableProps {
  sortedShifts: Shift[];
  services: Service[];
  users: User[];
  assignments: ShiftAssignment[];
  activeCamp?: Camp;
}

/** Der eigentliche druckbare Dienstplan-Bogen (#print-sheet-canvas-element). Extrahiert aus PrintView.tsx. */
export default function PrintScheduleTable({ sortedShifts, services, users, assignments, activeCamp }: PrintScheduleTableProps) {
  return (
    <div
      id="print-sheet-canvas-element"
      className="bg-white border border-slate-300 rounded-2xl p-8 max-w-4xl mx-auto shadow-xl text-slate-900 font-sans print-canvas-box print:border-0 print:p-0 print:shadow-none print:bg-white print:text-black"
    >
      {/* Document Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight font-display text-black">
            DIENSTPLAN • {activeCamp?.title || "PFINGSTLAGER"} {activeCamp?.year || "2026"}
          </h1>
          <p className="text-xs text-slate-650 font-bold mt-1 font-mono uppercase print:text-black">
            ZELTLAGER-DIENSTE • GENERIERT AM {new Date().toLocaleDateString("de-DE")} • {sortedShifts.length} SCHICHTEN GELISTET
          </p>
        </div>
        <div className="text-right text-[10px] font-mono text-slate-500 print:text-black shrink-0">
          <p>TEAMPAD PRINT UTILITY</p>
          <p>Pfadfinder Zeltlager</p>
        </div>
      </div>

      {/* Informative Legend (compact) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-300 p-3 rounded-lg text-xs mb-6 bg-slate-50 print:bg-white print:border-slate-400 print:text-black">
        <div>
          <p className="font-bold">⚠️ Bitte beachten:</p>
          <p className="text-[10px] text-slate-650 font-medium leading-relaxed">Alle eingeteilten Helfer*innen sind verpflichtet, pünktlich an den Stationen zu sein.</p>
        </div>
        <div>
          <p className="font-bold">❓ Rückfragen / Absagen:</p>
          <p className="text-[10px] text-slate-650 font-medium leading-relaxed">Ausschließlich über das Admin-Team des Zeltlagers regeln.</p>
        </div>
        <div>
          <p className="font-bold">✓ Bestätigungs-Status:</p>
          <p className="text-[10px] text-slate-650 font-medium font-mono leading-relaxed">✓ = Bestätigt | ⏳ = Unsicher | 💤 = Offen</p>
        </div>
      </div>

      {/* Master Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-slate-350 print:border-collapse print:border-slate-800" style={{ pageBreakInside: "auto" }}>
          <thead>
            <tr className="bg-slate-100 border-b border-slate-350 font-bold text-xs uppercase text-slate-800 print:bg-slate-150 print:text-black print:border-b-2 print:border-black">
              <th className="py-2.5 px-3 border-r border-slate-350 font-bold text-black" style={{ width: "140px" }}>
                Zeitraum
              </th>
              <th className="py-2.5 px-3 border-r border-slate-350 font-bold text-black" style={{ width: "220px" }}>
                Dienst / Aufgabe
              </th>
              <th className="py-2.5 px-3 border-r border-slate-350 font-bold text-black" style={{ width: "130px" }}>
                Ort
              </th>
              <th className="py-2.5 px-3 font-bold text-black">Besetzung & Helfer*innen (Soll/Ist)</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {sortedShifts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center italic text-slate-500 print:text-black">
                  Keine Schichten in diesem Lager vorhanden.
                </td>
              </tr>
            ) : (
              sortedShifts.map((shift, index) => {
                const service = services.find((s) => s.id === shift.service_id);
                const shiftAssignments = assignments.filter((a) => a.shift_id === shift.id);
                const targetMin = shift.min_persons !== undefined ? shift.min_persons : service?.min_persons || 1;
                const targetMax = shift.max_persons !== undefined ? shift.max_persons : service?.max_persons || 3;

                // Filter valid assigned helpers (not declined)
                const activeAssignments = shiftAssignments.filter((a) => a.status !== "declined");
                const isUnderstaffed = activeAssignments.length < targetMin;

                return (
                  <tr
                    key={shift.id}
                    className={`border-b border-slate-350 print:border-b print:border-black ${index % 2 === 0 ? "bg-white" : "bg-slate-50/40 print:bg-white"}`}
                    style={{ pageBreakInside: "avoid" }}
                  >
                    {/* Datum & Zeit */}
                    <td className="py-2.5 px-3 border-r border-slate-350 align-top font-mono font-bold text-black">
                      {getDayNameShort(shift.date)}, {formatDateGerman(shift.date)}
                      <span className="block text-[10px] text-slate-600 font-normal mt-0.5 print:text-black">
                        🕒 {shift.start_time} - {shift.end_time} Uhr
                      </span>
                    </td>

                    {/* Diensttitel */}
                    <td className="py-2.5 px-3 border-r border-slate-350 align-top text-black">
                      <strong className="text-black font-extrabold text-xs">{service?.title || "Generischer Dienst"}</strong>
                      {service?.description && <span className="block text-[9px] text-slate-500 leading-tight mt-0.5 italic print:text-black">{service.description}</span>}
                      {shift.notes && shift.notes !== service?.description && (
                        <span className="block text-[9px] text-emerald-600 leading-tight mt-0.5 font-bold print:text-black">Info: {shift.notes}</span>
                      )}
                    </td>

                    {/* Ort */}
                    <td className="py-2.5 px-3 border-r border-slate-350 align-top font-mono text-[10px] text-black">📍 {service?.location || "Lagergelände"}</td>

                    {/* Helferbelegung */}
                    <td className="py-2.5 px-3 align-top text-black">
                      <div className="space-y-1">
                        {activeAssignments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {activeAssignments.map((a) => {
                              const helper = users.find((u) => u.id === a.user_id);
                              return (
                                <span key={a.id} className="inline-flex items-center space-x-1 border border-slate-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white text-black print:border-black">
                                  <span>{helper?.display_name || "Helfer*in"}</span>
                                  {a.status === "accepted" && (
                                    <span className="text-black font-extrabold font-sans text-[11px]" title="Bestätigt">
                                      ✓
                                    </span>
                                  )}
                                  {a.status === "maybe" && (
                                    <span className="text-slate-605 font-semibold text-[10px]" title="Unsicher">
                                      ⏳
                                    </span>
                                  )}
                                  {a.status === "pending" && (
                                    <span className="text-slate-450 text-[9px]" title="Offen">
                                      💤
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 font-mono block print:text-black">🔲 KEINE HELFER*INNEN EINGETRAGEN</span>
                        )}

                        {/* Staff stats */}
                        <div className="text-[9px] font-mono text-slate-500 font-semibold pt-1 flex items-center justify-between print:text-black print:border-0">
                          <span>
                            Bestetzung: min. {targetMin} • max. {targetMax} ({activeAssignments.length} eingeteilt)
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded border uppercase text-[8px] font-extrabold ${
                              isUnderstaffed ? "bg-rose-50 text-rose-800 border-rose-300 print:bg-white print:text-black print:border-black" : "bg-emerald-50 text-emerald-800 border-emerald-300 print:bg-white print:text-black print:border-black"
                            }`}
                          >
                            {isUnderstaffed ? "⚠️ UNTERBESETZT" : "✓ BESETZT"}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Signature Box */}
      <div className="mt-8 border-t border-slate-300 pt-4 flex justify-between text-[10px] text-slate-550 font-mono print:text-black print:border-black">
        <p>Handzettel zur Info. Verbleib am schwarzen Brett.</p>
        <p>System signature: LGR-PLAN-v2</p>
      </div>
    </div>
  );
}
