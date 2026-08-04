import React from "react";
import { Clock, Briefcase, Church, Users, Compass, ChevronRight } from "lucide-react";

type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

interface VerwaltungHubViewProps {
  setCurrentTab: (tab: string) => void;
  accessRole: AccessRole;
}

export default function VerwaltungHubView({ setCurrentTab, accessRole }: VerwaltungHubViewProps) {
  const tiles = [
    { id: "shifts", label: "Schichten verwalten", description: "Arbeitszeiten, Einsatzorte & Personenobergrenzen", icon: Clock },
    { id: "services", label: "Dienste / Aufgaben", description: "Dienstarten, Farben & Hauptverantwortliche", icon: Briefcase },
    { id: "communities", label: "Gemeinden", description: "Teilnehmende Gemeinden pflegen und importieren", icon: Church },
  ];

  if (accessRole === "lagerleitung") {
    tiles.push(
      { id: "people", label: "Helfer*innen & Personen", description: "Personendaten, Zugriffsrollen & Einkäufer*innen", icon: Users },
      { id: "camps", label: "Lager verwalten", description: "Lager-Instanzen anlegen, kopieren & wechseln", icon: Compass }
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold font-display">Verwaltung</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {accessRole === "lagerleitung"
            ? "Voller Zugriff auf Planung, Personen und Lagerverwaltung."
            : "Planungswerkzeuge für Schichten, Dienste und Gemeinden."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => setCurrentTab(tile.id)}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-left hover:border-emerald-500/30 hover:bg-slate-900 transition-all cursor-pointer"
              id={`verwaltung-hub-tile-${tile.id}`}
            >
              <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/15 shrink-0">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{tile.label}</p>
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
