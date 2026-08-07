import React from "react";
import { CalendarCheck, Clock } from "lucide-react";
import { Service, Shift } from "../types";
import { getDayName, formatDateGerman } from "../utils";

interface UnderstaffedItem {
  shift: Shift;
  service: Service | undefined;
  currentCount: number;
  minVal: number;
  maxVal: number;
  isUnderstaffed: boolean;
  assignedPeople: string[];
}

interface DashboardUnderstaffedCardProps {
  understaffedList: UnderstaffedItem[];
  onSelectShift: (shiftId: string) => void;
}

/**
 * Row-3-Karte "Unterbesetzte Schichten" (einfache Übersicht mit Klick zum
 * Kalender, bewusst getrennt vom Leitstand-Tab in DashboardConflicts.tsx,
 * da Layout/Interaktivität abweichen). Extrahiert aus DashboardView.tsx
 * (Zeilen ~1410-1468).
 */
export default function DashboardUnderstaffedCard({ understaffedList, onSelectShift }: DashboardUnderstaffedCardProps) {
  return (
    <div className="col-span-12 lg:col-span-7 space-y-6" id="dashboard-left-half-section">
      <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl border border-emerald-500/10 p-6 shadow-xl shadow-black/35">
        <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <span>Unterbesetzte Schichten ({understaffedList.length})</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1 font-sans">Schichten, die noch nicht die erforderliche Mindestanzahl an Helfer*innen erreicht haben.</p>

        <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {understaffedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 bg-emerald-500/5 rounded-2xl border border-emerald-500/15 text-center">
              <span className="text-xl">🏕️</span>
              <p className="text-xs font-bold text-slate-200 mt-1">Sollstärke voll abgedeckt</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">Alle Dienste ausreichend besetzt</p>
            </div>
          ) : (
            understaffedList.map((item) => (
              <div
                key={item.shift.id}
                className="p-3 bg-amber-950/10 hover:bg-amber-950/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl space-y-2.5 transition-all cursor-pointer shadow-sm"
                onClick={() => onSelectShift(item.shift.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate font-display">{item.service?.title}</span>
                  <span className="bg-amber-950 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-500/20 font-mono tracking-wide">
                    Min. benötigt: {item.minVal} • Aktuell: {item.currentCount}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    {getDayName(item.shift.date)}, {formatDateGerman(item.shift.date)} • {item.shift.start_time} - {item.shift.end_time} Uhr
                  </span>
                </div>

                {item.assignedPeople.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="font-mono text-slate-500 font-bold mr-1">EINGETEILT:</span>
                    {item.assignedPeople.map((name, i) => (
                      <span key={i} className="text-slate-350 bg-slate-900 border border-emerald-500/10 px-1.5 py-0.5 rounded font-mono text-[9px]">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-rose-400 font-extrabold bg-rose-950/40 py-1.5 px-2.5 rounded-lg border border-rose-500/20 inline-block font-mono">
                    ⚠️ Noch keine Helfer*innen eingetragen
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
