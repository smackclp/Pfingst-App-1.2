import React from "react";
import { Printer } from "lucide-react";
import { Community } from "../types";

interface TeamGroup {
  id: string;
  name: string;
  communityIds: string[];
}

interface ProgramSogPrintGroupsProps {
  reconciledSogGroups: TeamGroup[];
  communities: Community[];
}

/** "Gruppen-Druck (A4)"-Subtab von Spiel ohne Grenzen. Extrahiert aus ProgramView.tsx. */
export default function ProgramSogPrintGroups({ reconciledSogGroups, communities }: ProgramSogPrintGroupsProps) {
  return (
    <div className="space-y-6" id="sog-print-container">
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-200">🖨️ DIN A4 Gruppenübersicht</h3>
          <p className="text-xs text-slate-400">Aushang für den Lagerplatz. Zeigt die Zuteilung der Gemeinden auf die Teams.</p>
        </div>
        <button
          onClick={() => window.print()}
          disabled={reconciledSogGroups.length === 0}
          className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase font-mono tracking-wider text-xs rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          <Printer className="h-4 w-4 stroke-[3]" />
          <span>Drucken</span>
        </button>
      </div>

      <div className="bg-white text-black p-6 rounded-2xl border-2 border-black" id="sog-printable-paper">
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight font-sans uppercase">⚔️ Spiel ohne Grenzen – Gruppeneinteilung</h1>
            <p className="text-xs font-mono text-slate-600 mt-1">Stand: {new Date().toLocaleDateString("de-DE")}</p>
          </div>
          <div className="text-right font-mono text-xs">
            <p className="font-extrabold">PFINGSTLAGER</p>
            <p>DIN A4 Aushang</p>
          </div>
        </div>

        <table className="sog-print-table w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-slate-200">
              <th className="p-2.5 w-1/4 font-bold">Gruppe</th>
              <th className="p-2.5 w-1/2 font-bold">Zugeordnete Gemeinden</th>
              <th className="p-2.5 w-1/4 font-bold text-center">Teilnehmerzahl</th>
            </tr>
          </thead>
          <tbody>
            {reconciledSogGroups.map((g) => {
              const commMap = new Map(communities.map((c) => [c.id, c]));
              const gSize = g.communityIds.reduce((sum, id) => sum + (commMap.get(id)?.participants || 0), 0);
              const commNames = g.communityIds
                .map((id) => {
                  const c = commMap.get(id);
                  return c ? `${c.name} (${c.participants} TN)` : null;
                })
                .filter(Boolean)
                .join(", ");

              return (
                <tr key={g.id} className="border-b border-slate-300">
                  <td className="p-3 font-bold uppercase">{g.name}</td>
                  <td className="p-3">{commNames || "Keine Gemeinden"}</td>
                  <td className="p-3 text-center font-bold">{gSize} TN</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
