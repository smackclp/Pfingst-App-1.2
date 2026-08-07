import React from "react";
import { CalendarDays, Clock } from "lucide-react";
import { SogStation } from "./ProgramSogStations";

interface TeamGroup {
  id: string;
  name: string;
  communityIds: string[];
}

interface ProgramSogLaufplanProps {
  sogStations: SogStation[];
  reconciledSogGroups: TeamGroup[];
  currentUserId?: string;
  sogStartTime: string;
  setSogStartTime: (t: string) => void;
  sogRoundDuration: number;
  setSogRoundDuration: (n: number) => void;
  sogBreakDuration: number;
  setSogBreakDuration: (n: number) => void;
}

// Helper time formatter
function formatTimePlusMinutes(baseTime: string, addMinutes: number): string {
  const [h, m] = baseTime.split(":").map(Number);
  const totalMin = (h || 0) * 60 + (m || 0) + addMinutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/** "Stationslaufplan (Rotationsmatrix)"-Subtab von Spiel ohne Grenzen. Extrahiert aus ProgramView.tsx. */
export default function ProgramSogLaufplan({
  sogStations,
  reconciledSogGroups,
  currentUserId,
  sogStartTime,
  setSogStartTime,
  sogRoundDuration,
  setSogRoundDuration,
  sogBreakDuration,
  setSogBreakDuration,
}: ProgramSogLaufplanProps) {
  return (
    <div className="space-y-6 no-print">
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>🗓️ Stationslaufplan (Rotationsmatrix)</span>
          </h3>
          <p className="text-xs text-slate-400">Kollisionsfreier Ablaufplan. Zeigt runde für runde, welche Gruppe an welcher Station spielt.</p>
        </div>

        {/* Times Settings */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">Start:</span>
            <input type="time" value={sogStartTime} onChange={(e) => setSogStartTime(e.target.value)} className="bg-transparent font-bold text-white focus:outline-none w-16" />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Dauer:</span>
            <input
              type="number"
              min={5}
              max={60}
              value={sogRoundDuration}
              onChange={(e) => setSogRoundDuration(Number(e.target.value))}
              className="bg-transparent font-bold text-white focus:outline-none w-12 text-center"
            />
            <span className="text-slate-400">Min</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Pause:</span>
            <input
              type="number"
              min={0}
              max={30}
              value={sogBreakDuration}
              onChange={(e) => setSogBreakDuration(Number(e.target.value))}
              className="bg-transparent font-bold text-white focus:outline-none w-12 text-center"
            />
            <span className="text-slate-400">Min</span>
          </div>
        </div>
      </div>

      {sogStations.length === 0 || reconciledSogGroups.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 border border-slate-850 border-dashed rounded-2xl">
          <CalendarDays className="h-10 w-10 text-slate-500 mx-auto opacity-40 mb-3" />
          <p className="text-sm font-semibold text-slate-300">Stationen und Gruppen erforderlich</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Bitte erstelle mindestens 1 Gruppe und 1 Station, um den Rotationsplan anzuzeigen.</p>
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                <th className="p-3 font-bold w-28 uppercase text-slate-300">Runde & Zeit</th>
                {sogStations.map((st) => {
                  const isMyStation = currentUserId && st.helperIds && st.helperIds.includes(currentUserId);
                  return (
                    <th key={st.id} className={`p-3 font-bold text-center border-l border-slate-800/60 min-w-[140px] ${isMyStation ? "bg-emerald-950/60 text-emerald-300" : "text-slate-200"}`}>
                      <div className="flex items-center justify-center space-x-1">
                        <span>St. #{st.number}</span>
                        {isMyStation && <span className="text-[10px]">⭐</span>}
                      </div>
                      <div className="text-[10px] font-normal text-slate-400 truncate max-w-[130px] mx-auto mt-0.5">{st.title}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(sogStations.length, reconciledSogGroups.length) }).map((_, rIdx) => {
                const roundNum = rIdx + 1;
                const start = formatTimePlusMinutes(sogStartTime, rIdx * (sogRoundDuration + sogBreakDuration));
                const end = formatTimePlusMinutes(sogStartTime, rIdx * (sogRoundDuration + sogBreakDuration) + sogRoundDuration);

                return (
                  <tr key={roundNum} className="border-b border-slate-850 hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-emerald-400 bg-slate-950/40">
                      <div>Runde {roundNum}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {start} - {end}
                      </div>
                    </td>

                    {sogStations.map((st, sIdx) => {
                      const groupIdx = (sIdx + rIdx) % reconciledSogGroups.length;
                      const grp = reconciledSogGroups[groupIdx];
                      const isMyStation = currentUserId && st.helperIds && st.helperIds.includes(currentUserId);

                      return (
                        <td key={st.id} className={`p-3 text-center border-l border-slate-800/60 font-bold ${isMyStation ? "bg-emerald-950/20" : ""}`}>
                          {grp ? <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white inline-block">{grp.name}</span> : <span className="text-slate-600">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
