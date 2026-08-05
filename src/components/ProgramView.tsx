import React from "react";
import { Sparkles, Award } from "lucide-react";
import { TalentAct, Community, User } from "../types";
import ProgramTalentShow from "./ProgramTalentShow";
import ProgramSog from "./ProgramSog";

interface ProgramViewProps {
  talentActs: TalentAct[];
  communities: Community[];
  users?: User[];
  currentUserId?: string;
  isAdmin: boolean;
  onAddTalentAct: (act: Omit<TalentAct, "id">) => Promise<void>;
  onUpdateTalentAct: (id: string, act: Partial<TalentAct>) => Promise<void>;
  onDeleteTalentAct: (id: string) => Promise<void>;
  onReorderTalentActs: (orders: { [id: string]: number }) => Promise<void>;
}

/**
 * Programm-Hauptansicht: Umschalter zwischen Talent-Show und Spiel ohne
 * Grenzen. Der eigentliche Inhalt lebt in ProgramTalentShow.tsx bzw.
 * ProgramSog.tsx (+ dessen 5 Subtab-Komponenten).
 */
export default function ProgramView({
  talentActs = [],
  communities = [],
  users = [],
  currentUserId,
  isAdmin,
  onAddTalentAct,
  onUpdateTalentAct,
  onDeleteTalentAct,
  onReorderTalentActs,
}: ProgramViewProps) {
  const [activeMainTab, setActiveMainTab] = React.useState<"talentshow" | "spiel_ohne_grenzen">("talentshow");

  return (
    <div className="space-y-6">
      {/* Top Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 no-print" id="program-maintabs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveMainTab("talentshow")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase font-mono tracking-wider transition cursor-pointer flex items-center space-x-2 ${
              activeMainTab === "talentshow" ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>🎤 Bunter Abend / Talent-Show</span>
          </button>

          <button
            onClick={() => setActiveMainTab("spiel_ohne_grenzen")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase font-mono tracking-wider transition cursor-pointer flex items-center space-x-2 ${
              activeMainTab === "spiel_ohne_grenzen" ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Award className="h-4 w-4" />
            <span>⚔️ Spiel ohne Grenzen</span>
          </button>
        </div>
      </div>

      {activeMainTab === "talentshow" ? (
        <ProgramTalentShow
          talentActs={talentActs}
          communities={communities}
          isAdmin={isAdmin}
          onAddTalentAct={onAddTalentAct}
          onUpdateTalentAct={onUpdateTalentAct}
          onDeleteTalentAct={onDeleteTalentAct}
          onReorderTalentActs={onReorderTalentActs}
        />
      ) : (
        <ProgramSog communities={communities} users={users} currentUserId={currentUserId} />
      )}
    </div>
  );
}
