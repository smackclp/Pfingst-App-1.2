import React from "react";
import { User, Shift, Service, ShiftAssignment } from "../types";
import { getDayName, formatDateGerman } from "../utils";

interface FeedbackItem {
  assignment: ShiftAssignment;
  user: User | undefined;
  shift: Shift | undefined;
  service: Service | null | undefined;
  activeAssCount: number;
  totalNeeded: number;
  isNowStaffed: boolean;
  otherHelpers: string[];
  updatedAt: string;
}

interface DashboardFeedbacksProps {
  items: FeedbackItem[];
  onSelectShift: (shiftId: string) => void;
}

export default function DashboardFeedbacks({ items, onSelectShift }: DashboardFeedbacksProps) {
  return (
    <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl border border-rose-500/15 p-6 shadow-xl shadow-black/35">
      <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
        <span className="text-lg shrink-0">💬</span>
        <span>Absagen & Unklare Rückmeldungen ({items.length})</span>
      </h3>
      <p className="text-xs text-slate-400 mt-1 font-sans">
        Zusammenstellung aller Absagen oder unentschlossenen Helfer*innen für die Schicht-Nachbesetzung.
      </p>

      <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-slate-950/40 rounded-2xl border border-slate-800 text-center">
            <span className="text-xl">🙌</span>
            <p className="text-xs font-bold text-slate-400 mt-1">Keine Absagen & unklaren Meldungen</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Alle Dienste laufen planmäßig</p>
          </div>
        ) : (
          items.map((item) => {
            const isDeclined = item.assignment.status === "declined";
            return (
              <div
                key={item.assignment.id}
                className={`p-3 rounded-xl border space-y-2 transition-all cursor-pointer ${
                  isDeclined
                    ? "bg-rose-950/10 hover:bg-rose-950/15 border-rose-500/20 hover:border-rose-500/35"
                    : "bg-amber-950/10 hover:bg-amber-950/15 border-amber-500/20 hover:border-amber-500/35"
                }`}
                onClick={() => item.shift && onSelectShift(item.shift.id)}
              >
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-200">
                    👤 {item.user?.display_name || "Unbekannt"}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${
                      isDeclined
                        ? "bg-rose-950/50 text-rose-300 border-rose-500/20"
                        : "bg-amber-950/50 text-amber-300 border-amber-500/20"
                    }`}
                  >
                    {isDeclined ? "Abgelehnt ❌" : "Unsicher ⏳"}
                  </span>
                </div>

                <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800 space-y-1 text-[10px]">
                  <p className="font-semibold text-slate-300">
                    Dienst: <span className="text-emerald-400">{item.service?.title}</span> ({item.service?.location})
                  </p>
                  <p className="font-mono text-slate-400 text-[9px]">
                    📅{" "}
                    {item.shift
                      ? `${getDayName(item.shift.date)}, ${formatDateGerman(item.shift.date)} • ${item.shift.start_time} - ${item.shift.end_time} Uhr`
                      : ""}
                  </p>
                  {isDeclined && item.assignment.decline_reason && (
                    <p className="text-[10px] text-rose-300 border-t border-slate-800/40 pt-1 mt-1 italic font-sans break-words">
                      💬 Begründung: "{item.assignment.decline_reason}"
                    </p>
                  )}
                  <p className="text-[9px] text-slate-500 pt-0.5 border-t border-slate-800/20 mt-1 font-mono">
                    Meldung am:{" "}
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "unbekannt"}{" "}
                    Uhr
                  </p>
                </div>

                {/* Replacement state indicator */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold font-mono">Ersatzperson?</span>
                  {item.activeAssCount > 0 ? (
                    <span
                      className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        item.isNowStaffed
                          ? "bg-emerald-950/30 text-emerald-400 border border-emerald-500/20"
                          : "bg-orange-950/30 text-orange-400 border border-orange-500/20"
                      }`}
                    >
                      {item.isNowStaffed
                        ? `JA (${item.activeAssCount}/${item.totalNeeded} eingeteilt)`
                        : `TEILS (${item.activeAssCount}/${item.totalNeeded} eingeteilt)`}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold font-mono bg-rose-950/30 text-rose-455 border border-rose-500/25 px-2 py-0.5 rounded-full">
                      NEIN (VAKANT ⚠️)
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
