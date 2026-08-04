import React from "react";
import { Sparkles, ShoppingBag, Church, ChevronRight } from "lucide-react";

interface LagerHubViewProps {
  setCurrentTab: (tab: string) => void;
}

const TILES = [
  { id: "program", label: "Programm", description: "Talentshow, Bunter Abend & Spiel ohne Grenzen", icon: Sparkles, emoji: "✨" },
  { id: "materials", label: "Bestellliste", description: "Material anfragen und Bestellstatus verfolgen", icon: ShoppingBag, emoji: "📦" },
  { id: "communities", label: "Gemeinden", description: "Teilnehmende Gemeinden und Teilnehmerzahlen", icon: Church, emoji: "⛪" },
];

export default function LagerHubView({ setCurrentTab }: LagerHubViewProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold font-display">Lager</h2>
        <p className="text-xs text-slate-400 mt-0.5">Programm, Bestellungen und alles rund ums Lagerleben.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => setCurrentTab(tile.id)}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-left hover:border-emerald-500/30 hover:bg-slate-900 transition-all cursor-pointer"
              id={`lager-hub-tile-${tile.id}`}
            >
              <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/15 shrink-0">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{tile.emoji} {tile.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{tile.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
