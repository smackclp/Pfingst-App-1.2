import React from "react";
import { Printer } from "lucide-react";
import { User } from "../types";
import { SogStation } from "./ProgramSogStations";

interface TeamGroup {
  id: string;
  name: string;
  communityIds: string[];
}

interface ProgramSogPrintCardsProps {
  sogStations: SogStation[];
  users: User[];
  reconciledSogGroups: TeamGroup[];
  sogStartTime: string;
  sogRoundDuration: number;
  sogBreakDuration: number;
}

// Helper time formatter
function formatTimePlusMinutes(baseTime: string, addMinutes: number): string {
  const [h, m] = baseTime.split(":").map(Number);
  const totalMin = (h || 0) * 60 + (m || 0) + addMinutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/** "Stationskarten (A4)"-Druck-Subtab von Spiel ohne Grenzen. Extrahiert aus ProgramView.tsx. */
export default function ProgramSogPrintCards({ sogStations, users, reconciledSogGroups, sogStartTime, sogRoundDuration, sogBreakDuration }: ProgramSogPrintCardsProps) {
  return (
    <div className="space-y-6">
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Printer className="h-4 w-4 text-cyan-400" />
            <span>🖨️ DIN A4 Stationskarten mit Punktezettel</span>
          </h3>
          <p className="text-xs text-slate-400">Ausdruckbare Blätter für jede Station. Enthält Spielregeln, benötigtes Material, Helfer und einen handschriftlichen Wertungsbogen.</p>
        </div>
        <button
          onClick={() => window.print()}
          disabled={sogStations.length === 0}
          className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold uppercase font-mono tracking-wider text-xs rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-lg shadow-cyan-500/20"
        >
          <Printer className="h-4 w-4 stroke-[3]" />
          <span>Karten drucken / PDF exportieren</span>
        </button>
      </div>

      {/* Print Cards List */}
      {sogStations.map((st) => {
        const assignedHelpers = users.filter((u) => st.helperIds && st.helperIds.includes(u.id));

        return (
          <div key={st.id} className="sog-print-card bg-white text-black p-6 rounded-2xl border-2 border-slate-800 shadow-md">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
              <div>
                <span className="text-xs font-mono font-bold bg-black text-white px-3 py-1 rounded uppercase tracking-wider">STATION #{st.number}</span>
                <h1 className="text-2xl font-black font-sans uppercase tracking-tight mt-2 text-black">{st.title}</h1>
                {st.location && <p className="text-sm font-bold text-slate-700 mt-1">📍 Standort: {st.location}</p>}
              </div>
              <div className="text-right font-mono text-xs text-slate-600">
                <p className="font-extrabold text-black uppercase">SPIEL OHNE GRENZEN</p>
                <p>Pfingstlager {new Date().getFullYear()}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-mono">
              <div className="p-3 bg-slate-100 rounded border border-slate-300">
                <span className="font-bold uppercase text-black block mb-1">👥 Betreuer / Stationsteam:</span>
                {assignedHelpers.length === 0 ? (
                  <span className="italic text-slate-500">Vor Ort eingeteilt</span>
                ) : (
                  <p className="font-semibold text-slate-900">{assignedHelpers.map((h) => `${h.first_name} ${h.last_name}`).join(", ")}</p>
                )}
              </div>

              <div className="p-3 bg-slate-100 rounded border border-slate-300">
                <span className="font-bold uppercase text-black block mb-1">📦 Benötigtes Material:</span>
                <p className="text-slate-900">{st.materialNeeded || "Keine besonderen Materialien"}</p>
              </div>
            </div>

            {/* Description */}
            {st.description && (
              <div className="p-3 bg-slate-50 rounded border border-slate-300 mb-5 text-xs font-sans">
                <span className="font-mono font-bold uppercase text-black block mb-1">📜 Spielbeschreibung & Regeln:</span>
                <p className="leading-relaxed text-slate-800 whitespace-pre-wrap">{st.description}</p>
              </div>
            )}

            {/* Printable Scoring Sheet */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase mb-2 text-black">📝 Wertungsblatt / Punktezettel (Station #{st.number})</h3>
              <table className="sog-print-table w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="p-2 w-16">Runde</th>
                    <th className="p-2 w-24">Zeit</th>
                    <th className="p-2">Team / Gruppe</th>
                    <th className="p-2 w-32">Erreichte Punkte / Zeit</th>
                    <th className="p-2 w-28">Handzeichen</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(reconciledSogGroups.length, 6) }).map((_, rIdx) => {
                    const roundNum = rIdx + 1;
                    const start = formatTimePlusMinutes(sogStartTime, rIdx * (sogRoundDuration + sogBreakDuration));
                    const grpIdx = (st.number - 1 + rIdx) % (reconciledSogGroups.length || 1);
                    const grp = reconciledSogGroups[grpIdx];

                    return (
                      <tr key={roundNum} className="border-b border-slate-300">
                        <td className="p-2.5 font-bold">Runde {roundNum}</td>
                        <td className="p-2.5 text-slate-600">{start}</td>
                        <td className="p-2.5 font-bold">{grp ? grp.name : `Gruppe ${roundNum}`}</td>
                        <td className="p-2.5 text-slate-400 font-normal">________________</td>
                        <td className="p-2.5 text-slate-400 font-normal">_______</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
