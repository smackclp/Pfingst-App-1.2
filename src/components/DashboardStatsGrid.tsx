import React from "react";
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Layers, 
  UserCheck,
  Church,
  Users2
} from "lucide-react";
import { Community } from "../types";

interface DashboardStats {
  openShiftsCount: number;
  understaffedShiftsCount: number;
  conflictCount: number;
  totalUsersCount: number;
  totalInactiveUsersCount: number;
  totalShiftsCount: number;
}

interface DashboardStatsGridProps {
  stats: DashboardStats;
  communities: Community[];
  isAdmin: boolean;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardStatsGrid({ stats, communities = [], isAdmin, onNavigateToTab }: DashboardStatsGridProps) {
  // Calculate total participants
  const totalParticipants = React.useMemo(() => {
    return communities.reduce((acc, c) => acc + (c.participants || 0), 0);
  }, [communities]);

  return (
    <div className={`grid gap-3 md:gap-4 ${
      isAdmin 
        ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-7" 
        : "grid-cols-2 max-w-2xl mx-auto lg:max-w-none lg:grid-cols-2"
    }`}>
      {/* Card: Registered Communities (Always Visible!) */}
      <div
        onClick={() => onNavigateToTab("communities")}
        className="p-4 rounded-xl border bg-emerald-950/30 border-emerald-500/30 text-slate-300 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-950/40 transition-all shadow-xs hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]"
        id="stat-communities"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Gemeinden</span>
          <Church className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-bold tracking-tight text-white font-display">{communities.length}</span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono mt-1">✓ Teilnehmend gelistet</p>
      </div>

      {/* Card: Total Participants (Always Visible!) */}
      <div
        onClick={() => onNavigateToTab("communities")}
        className="p-4 rounded-xl border bg-cyan-950/30 border-cyan-500/30 text-slate-200 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-950/40 transition-all shadow-xs hover:shadow-[0_0_15px_rgba(6,182,212,0.08)]"
        id="stat-participants"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Teilnehmer*innen</span>
          <Users2 className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-bold tracking-tight text-cyan-400 font-display">{totalParticipants}</span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono mt-1">Gesamte Kinderzahl</p>
      </div>

      {/* Admin-only cards start here */}
      {isAdmin && (
        <>
          {/* Card: Konflikte */}
          <div 
            onClick={() => stats.conflictCount > 0 && onNavigateToTab("calendar")}
            className={`p-4 rounded-xl cursor-pointer transition-all ${
              stats.conflictCount > 0 
                ? "bg-rose-950/30 border border-rose-500/40 text-rose-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:border-rose-500/60" 
                : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
            id="stat-conflicts"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Doppelbelegung</span>
              <AlertTriangle className={`h-5 w-5 ${stats.conflictCount > 0 ? "text-rose-450 animate-bounce" : "text-slate-600"}`} />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className={`text-3xl font-bold tracking-tight font-display ${stats.conflictCount > 0 ? "text-rose-400" : "text-slate-200"}`}>{stats.conflictCount}</span>
            </div>
            <p className={`text-[11px] font-mono mt-1 ${stats.conflictCount > 0 ? "text-rose-300/80" : "text-slate-500"}`}>
              {stats.conflictCount > 0 ? "⚠️ DOPPELBELEGUNG" : "✓ Keine Konflikte"}
            </p>
          </div>

          {/* Card: Offene Schichten */}
          <div 
            onClick={() => onNavigateToTab("shifts")}
            className="p-4 rounded-xl border bg-slate-900/60 border-slate-800 text-slate-300 cursor-pointer hover:border-amber-500/30 hover:bg-slate-900 transition-all shadow-xs hover:shadow-[0_0_15px_rgba(245,158,11,0.08)]"
            id="stat-open-shifts"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">nicht eingeteilt</span>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-amber-400 font-display">{stats.openShiftsCount}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">Dringend besetzen</p>
          </div>

          {/* Card: Unterbesetzt */}
          <div 
            onClick={() => onNavigateToTab("shifts")}
            className="p-4 rounded-xl border bg-slate-900/60 border-slate-800 text-slate-300 cursor-pointer hover:border-orange-500/30 hover:bg-slate-900 transition-all shadow-xs hover:shadow-[0_0_15px_rgba(249,115,22,0.08)]"
            id="stat-understaffed"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Unterbesetzt</span>
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-orange-400 font-display">{stats.understaffedShiftsCount}</span>
            </div>
            <p className="text-[11px] text-slate-505 text-slate-500 font-mono mt-1">Min-Besatzung fehlt</p>
          </div>

          {/* Card: Anzahl Personen */}
          <div 
            onClick={() => onNavigateToTab("people")}
            className="p-4 rounded-xl border bg-slate-900/60 border-slate-800 text-slate-300 cursor-pointer hover:border-emerald-500/30 hover:bg-slate-900 transition-all shadow-xs hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]"
            id="stat-total-people"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Aktive Helfer*innen</span>
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-emerald-400 font-display">{stats.totalUsersCount}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">{stats.totalInactiveUsersCount} offline gelistet</p>
          </div>

          {/* Card: Anzahl Schichten */}
          <div 
            onClick={() => onNavigateToTab("calendar")}
            className="p-4 rounded-xl border bg-slate-900/60 border-slate-800 text-slate-300 cursor-pointer hover:border-cyan-500/30 hover:bg-slate-900 transition-all shadow-xs hover:shadow-[0_0_15px_rgba(6,182,212,0.08)]"
            id="stat-total-shifts"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Schichten</span>
              <Layers className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-cyan-400 font-display">{stats.totalShiftsCount}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">Über 3 Kalendertage</p>
          </div>
        </>
      )}
    </div>
  );
}
