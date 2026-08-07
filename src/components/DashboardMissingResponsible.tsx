import React from "react";
import { UserCheck } from "lucide-react";
import { Service } from "../types";

interface DashboardMissingResponsibleProps {
  servicesMissingResponsible: Service[];
  onNavigateToTab: (tab: string) => void;
}

/**
 * "Hauptverantwortliche (HV) Zuteilung"-Karte (Admin-only). Extrahiert aus
 * DashboardView.tsx (Zeilen ~1472-1509).
 */
export default function DashboardMissingResponsible({ servicesMissingResponsible, onNavigateToTab }: DashboardMissingResponsibleProps) {
  return (
    <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl border border-emerald-500/10 p-6 shadow-xl shadow-black/35 space-y-5">
      <div>
        <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
          <UserCheck className="h-5 w-5 text-indigo-400" />
          <span>Hauptverantwortliche (HV) Zuteilung</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1 font-sans">Überwachung der Abteilungsverantwortlichen für jeden dedizierten Dienstposten.</p>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
        {servicesMissingResponsible.length === 0 ? (
          <div className="col-span-full py-4 text-center text-xs text-emerald-450 bg-emerald-950/20 border border-emerald-500/25 rounded-xl font-mono">
            ✓ ALL_POST_RESPONSIBLE_ASSIGNED
          </div>
        ) : (
          servicesMissingResponsible.map((svc) => (
            <div key={svc.id} className="p-3 bg-indigo-950/20 border border-indigo-500/25 hover:border-indigo-500/45 rounded-xl flex items-center justify-between transition-colors">
              <div className="truncate pr-2">
                <p className="text-xs font-bold text-white truncate font-display">{svc.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">📍 {svc.location || "LAGERPLATZ"}</p>
              </div>
              <button
                onClick={() => onNavigateToTab("services")}
                className="px-2.5 py-1 text-[9px] font-bold text-indigo-300 hover:text-indigo-100 bg-indigo-900/60 hover:bg-indigo-850 rounded border border-indigo-500/30 transition font-mono whitespace-nowrap"
              >
                HV_WÄHLEN
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
