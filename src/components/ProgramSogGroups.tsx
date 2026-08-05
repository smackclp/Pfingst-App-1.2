import React from "react";
import { Award, Check, Copy } from "lucide-react";
import { Community } from "../types";

interface TeamGroup {
  id: string;
  name: string;
  communityIds: string[];
}

interface SogStats {
  totalParticipants: number;
  avgSize: number;
  minSize: number;
  maxSize: number;
  maxDiff: number;
}

interface ProgramSogGroupsProps {
  sogNumTeams: number;
  setSogNumTeams: React.Dispatch<React.SetStateAction<number>>;
  reconciledSogGroups: TeamGroup[];
  communities: Community[];
  sogStats: SogStats | null;
  sogCopySuccess: boolean;
  onCopyWhatsApp: () => void;
  onGenerateGroups: (count: number) => void;
  onMoveCommunity: (communityId: string, targetGroupId: string) => void;
}

/** "Gruppeneinteilung"-Subtab von Spiel ohne Grenzen. Extrahiert aus ProgramView.tsx. */
export default function ProgramSogGroups({
  sogNumTeams,
  setSogNumTeams,
  reconciledSogGroups,
  communities,
  sogStats,
  sogCopySuccess,
  onCopyWhatsApp,
  onGenerateGroups,
  onMoveCommunity,
}: ProgramSogGroupsProps) {
  return (
    <div className="space-y-6 no-print">
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">Anzahl Teams / Gruppen:</label>
            <div className="flex items-center space-x-2 mt-1">
              <button
                onClick={() => setSogNumTeams((prev) => Math.max(2, prev - 1))}
                className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-200 cursor-pointer text-sm font-bold active:scale-95 transition"
              >
                -
              </button>
              <span className="w-10 text-center font-mono font-bold text-white text-lg">{sogNumTeams}</span>
              <button
                onClick={() => setSogNumTeams((prev) => Math.min(12, prev + 1))}
                className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-200 cursor-pointer text-sm font-bold active:scale-95 transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCopyWhatsApp}
            disabled={reconciledSogGroups.length === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer border ${
              sogCopySuccess
                ? "bg-emerald-500 text-slate-950 border-emerald-500/10"
                : "bg-slate-950 text-emerald-400 hover:bg-slate-900 border-emerald-500/30 hover:border-emerald-500/80 disabled:opacity-40 disabled:pointer-events-none"
            }`}
          >
            {sogCopySuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Für WhatsApp kopieren</span>
              </>
            )}
          </button>

          <button
            onClick={() => onGenerateGroups(sogNumTeams)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-extrabold uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <span>Gruppen automatisch einteilen</span>
          </button>
        </div>
      </div>

      {sogStats && (
        <div className="bg-slate-900/20 border border-slate-850/60 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Gemeinden Gesamt</p>
            <p className="text-lg font-bold text-white mt-0.5">{communities.length}</p>
          </div>
          <div className="text-center md:text-left border-l border-slate-800/60 pl-4">
            <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Teilnehmer*innen Gesamt</p>
            <p className="text-lg font-bold text-white mt-0.5">{sogStats.totalParticipants} Personen</p>
          </div>
          <div className="text-center md:text-left border-l border-slate-800/60 pl-4">
            <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Ø Gruppengröße</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">{sogStats.avgSize} TN</p>
          </div>
          <div className="text-center md:text-left border-l border-slate-800/60 pl-4">
            <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Größte Differenz</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5">
              {sogStats.maxDiff} TN <span className="text-[10px] font-normal text-slate-500">(Min: {sogStats.minSize} / Max: {sogStats.maxSize})</span>
            </p>
          </div>
        </div>
      )}

      {reconciledSogGroups.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 border border-slate-850 border-dashed rounded-2xl">
          <Award className="h-10 w-10 text-slate-500 mx-auto opacity-40 mb-3" />
          <p className="text-sm font-semibold text-slate-300">Noch keine Teams eingeteilt</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Klicke oben auf „Gruppen automatisch einteilen", um das Lager fair nach Teilnehmerzahl zu spalten.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reconciledSogGroups.map((g) => {
            const commMap = new Map(communities.map((c) => [c.id, c]));
            const gSize = g.communityIds.reduce((sum, id) => sum + (commMap.get(id)?.participants || 0), 0);

            return (
              <div key={g.id} className="bg-slate-900/30 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
                    <span className="font-sans font-bold text-white">{g.name}</span>
                    <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 font-bold border border-slate-700/50">{gSize} TN</span>
                  </div>

                  <div className="space-y-2">
                    {g.communityIds.length === 0 ? (
                      <p className="text-[11px] text-slate-600 font-mono italic py-2">Leer (Keine Gemeinden)</p>
                    ) : (
                      g.communityIds.map((cid) => {
                        const c = commMap.get(cid);
                        if (!c) return null;
                        return (
                          <div key={c.id} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-xl border border-slate-850/40">
                            <div className="text-xs font-semibold text-slate-200">
                              <span>{c.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal block mt-0.5">{c.participants} Teilnehmer*innen</span>
                            </div>

                            <select
                              value={g.id}
                              onChange={(e) => onMoveCommunity(c.id, e.target.value)}
                              className="text-[10px] font-bold font-mono bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              {reconciledSogGroups.map((grp) => (
                                <option key={grp.id} value={grp.id}>
                                  {grp.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
