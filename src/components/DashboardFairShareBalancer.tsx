import React from "react";
import { Award } from "lucide-react";
import { User, ShiftAssignment, Shift } from "../types";

interface WorkloadStats {
  assignmentsCount: number;
  hours: number;
  shiftsDetails: { assignment: ShiftAssignment; shift: Shift }[];
}

interface DashboardFairShareBalancerProps {
  users: User[];
  getUserWorkloadStats: (userId: string) => WorkloadStats;
  setSelectedUserPlanId: (id: string) => void;
  setPersonalPlanQuery: (query: string) => void;
}

/**
 * "Fair-Share Helfer-Auslastungsspiegel" (Admin-Tool). Extrahiert aus
 * DashboardView.tsx (Zeilen ~1206-1408). Ein Klick auf eine Person setzt
 * die Auswahl im "Mein persönlicher Dienstplan"-Widget (Elternkomponente).
 */
export default function DashboardFairShareBalancer({
  users,
  getUserWorkloadStats,
  setSelectedUserPlanId,
  setPersonalPlanQuery,
}: DashboardFairShareBalancerProps) {
  const activeUsers = users.filter((u) => u.active);
  const usersWithStats = activeUsers.map((u) => {
    const uStats = getUserWorkloadStats(u.id);
    return { user: u, stats: uStats };
  });

  const totalHours = usersWithStats.reduce((acc, x) => acc + x.stats.hours, 0);
  const averageHours = activeUsers.length > 0 ? totalHours / activeUsers.length : 0;

  const overworked = usersWithStats.filter((x) => x.stats.hours > 6).sort((a, b) => b.stats.hours - a.stats.hours);
  const balanced = usersWithStats.filter((x) => x.stats.hours > 2 && x.stats.hours <= 6).sort((a, b) => b.stats.hours - a.stats.hours);
  const available = usersWithStats.filter((x) => x.stats.hours <= 2).sort((a, b) => a.stats.hours - b.stats.hours);

  let fairnessRating = "Ausgezeichnet ⚖️";
  let fairnessColor = "text-emerald-400";
  if (activeUsers.length > 0) {
    const variance = usersWithStats.reduce((acc, x) => acc + Math.pow(x.stats.hours - averageHours, 2), 0) / activeUsers.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 2.5) {
      fairnessRating = "Ungleichmäßige Schichtbelastung ⚠️";
      fairnessColor = "text-amber-500";
    } else if (stdDev > 1.2) {
      fairnessRating = "Gute Balance ⚖️";
      fairnessColor = "text-emerald-400 font-semibold";
    }
  }

  const selectUser = (user: User) => {
    setSelectedUserPlanId(user.id);
    setPersonalPlanQuery(user.display_name);
  };

  return (
    <div className="col-span-12 animate-fade-in space-y-4" id="dashboard-fair-share-balancer">
      <div className="bg-slate-900 border border-emerald-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="fair-share-balancer-panel">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Award className="h-20 w-24 text-emerald-400" />
        </div>

        {/* Header info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
              <span className="p-1 px-2.5 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400 font-mono font-bold text-xs">ADMIN TOOL</span>
              <span>⚖️ Fair-Share Helfer-Auslastungsspiegel</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Detaillierter Überblick über die Schicht-Stundenverteilung. Schütze dein Team vor Überlastung und finde freie Reserve-Kapazitäten.
            </p>
          </div>

          {/* Fairness rating Badge */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-right font-sans">
            <span className="text-[10px] uppercase text-slate-500 block font-bold">Pfad-Gerechtigkeit:</span>
            <span className={`text-xs font-black ${fairnessColor} mt-0.5 inline-block`}>{fairnessRating}</span>
          </div>
        </div>

        {/* Main analytical indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 font-sans">
          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500">Helfer im Dienst</span>
            <span className="text-xl font-bold text-white block mt-1 font-mono">{activeUsers.length}</span>
            <span className="text-[9px] text-slate-500 block mt-1">Registrierte aktive Personen</span>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500">Gesamte Dienstleistung</span>
            <span className="text-xl font-bold text-emerald-400 block mt-1 font-mono">{Math.round(totalHours * 10) / 10}h</span>
            <span className="text-[9px] text-slate-500 block mt-1">Geleistete Arbeitszeit summiert</span>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500">Durchschnitt pro Person</span>
            <span className="text-xl font-bold text-indigo-400 block mt-1 font-mono">{Math.round(averageHours * 10) / 10}h</span>
            <span className="text-[9px] text-slate-500 block mt-1">Empfohlener Sollwert: ~4.0h</span>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500">Häufigste Helfer-Rolle</span>
            <span className="text-xl font-bold text-violet-400 block mt-1 truncate font-display">Pfingsthelfer*in</span>
            <span className="text-[9px] text-slate-500 block mt-1">100% ehrenamtlicher Einsatz</span>
          </div>
        </div>

        {/* Workload zones Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pt-5 border-t border-slate-800">
          {/* Overworked Red Zone */}
          <div className="space-y-3.5 bg-rose-950/5 p-4 rounded-xl border border-rose-500/10">
            <div className="flex items-center justify-between border-b border-rose-500/10 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                <h4 className="text-xs font-extrabold text-rose-400 font-display uppercase tracking-wide">Überlastet (&gt; 6h)</h4>
              </div>
              <span className="bg-rose-500/10 text-rose-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">{overworked.length} Personen</span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {overworked.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-4 text-center">Hervorragend! Niemand ist überlastet.</p>
              ) : (
                overworked.map(({ user, stats: uStats }) => (
                  <div
                    key={`fair-red-${user.id}`}
                    onClick={() => selectUser(user)}
                    className="p-2.5 bg-slate-950/40 border border-slate-800/60 hover:border-rose-500/30 rounded-lg flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-white truncate">{user.display_name}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">{user.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-rose-400 font-mono">{uStats.hours}h</span>
                      <p className="text-[9px] text-slate-500 font-mono">{uStats.assignmentsCount} Schichten</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Balanced Green Zone */}
          <div className="space-y-3.5 bg-emerald-950/5 p-4 rounded-xl border border-emerald-500/10">
            <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <h4 className="text-xs font-extrabold text-emerald-400 font-display uppercase tracking-wide font-sans">Idealbelastung (2-6h)</h4>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">{balanced.length} Personen</span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {balanced.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-4 text-center">Keine Personen in dieser Spanne.</p>
              ) : (
                balanced.map(({ user, stats: uStats }) => (
                  <div
                    key={`fair-green-${user.id}`}
                    onClick={() => selectUser(user)}
                    className="p-2.5 bg-slate-950/40 border border-slate-800/60 hover:border-emerald-500/35 rounded-lg flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-extrabold text-white truncate">{user.display_name}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">{user.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 font-mono">{uStats.hours}h</span>
                      <p className="text-[9px] text-slate-500 font-mono">{uStats.assignmentsCount} Schichten</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Underloaded Yellow/Ice Zone */}
          <div className="space-y-3.5 bg-amber-950/5 p-4 rounded-xl border border-amber-500/10">
            <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <h4 className="text-xs font-extrabold text-amber-400 font-display uppercase tracking-wide font-sans">Verfügbare Reserven (&lt;= 2h)</h4>
              </div>
              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">{available.length} Personen</span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {available.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-4 text-center">Keine Reserven mehr verfügbar.</p>
              ) : (
                available.map(({ user, stats: uStats }) => (
                  <div
                    key={`fair-yellow-${user.id}`}
                    onClick={() => selectUser(user)}
                    className="p-2.5 bg-slate-950/40 border border-slate-800/60 hover:border-amber-500/35 rounded-lg flex items-center justify-between transition cursor-pointer shadow-sm"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-white truncate">{user.display_name}</p>
                      <p className="text-[9px] text-slate-450 font-mono mt-0.5 uppercase">{user.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-400 font-mono">{uStats.hours}h</span>
                      <p className="text-[9px] text-slate-500 font-mono">{uStats.assignmentsCount} Schichten</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Allocation Advice Card */}
        <div className="mt-5 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start space-x-3 text-xs leading-relaxed font-sans">
          <span className="text-lg">💡</span>
          <div>
            <p className="font-bold text-slate-200">Camp-Leitungs Tipp für Belastungsausgleich:</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Teile Personen aus der Spalte <span className="text-amber-400 font-bold">Verfügbare Reserven</span> für offene oder vakante Schichten ein, um
              Helfer*innen der Spalte <span className="text-rose-400 font-bold">Überlastet</span> zu entlasten, bevor diese an ihre Leistungsgrenzen stoßen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
