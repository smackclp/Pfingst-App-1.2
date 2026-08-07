import React from "react";
import { Filter, Globe, Sparkles, Star, User as UserIcon, UserCheck } from "lucide-react";

type StatusFilter = "all" | "understaffed" | "critical" | "my_shifts" | "my_services";

interface ShiftsQuickFilterBarProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  understaffedCount: number;
  criticalCount: number;
  myShiftsCount: number;
  totalShiftsCount: number;
  /** Nur für Bereichsleitung: Schichten der Dienste, für die sie laut responsible_id verantwortlich ist. */
  myServicesShiftsCount?: number;
  showMyServicesChip?: boolean;
}

/** Horizontale Schnellfilter-Chip-Leiste (Meine Dienste/Offen/Dringend/Meine/Alle Schichten). */
export default function ShiftsQuickFilterBar({
  statusFilter,
  onStatusFilterChange,
  understaffedCount,
  criticalCount,
  myShiftsCount,
  totalShiftsCount,
  myServicesShiftsCount = 0,
  showMyServicesChip = false,
}: ShiftsQuickFilterBarProps) {
  return (
    <div className="space-y-2.5 pt-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/90 shadow-inner min-w-0">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-mono flex items-center space-x-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Schnellfilter für Helfer*innen:</span>
        </label>
        {statusFilter !== "all" && (
          <button
            type="button"
            onClick={() => onStatusFilterChange("all")}
            className="text-amber-400 hover:text-amber-300 hover:underline text-[11px] font-semibold transition cursor-pointer flex items-center space-x-1"
          >
            <span>Filter zurücksetzen</span>
            <span>✕</span>
          </button>
        )}
      </div>

      {/* Horizontally Scrollable Chip Bar */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none scroll-smooth">
        {/* Chip 0: Meine Dienste (nur Bereichsleitung) */}
        {showMyServicesChip && (
          <button
            type="button"
            onClick={() => onStatusFilterChange("my_services")}
            className={`flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center space-x-2.5 cursor-pointer whitespace-nowrap border ${
              statusFilter === "my_services"
                ? "bg-gradient-to-r from-indigo-500/35 via-indigo-500/25 to-indigo-600/35 border-indigo-400 text-indigo-200 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/60 scale-[1.02]"
                : "bg-indigo-950/25 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400/60"
            }`}
            id="chip-filter-myservices"
          >
            <UserCheck className="h-4 w-4 text-indigo-300 shrink-0" />
            <span>Meine Dienste</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black border ${
                myServicesShiftsCount > 0 ? "bg-indigo-500 text-white border-indigo-300 shadow-xs" : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              {myServicesShiftsCount} Schichten
            </span>
          </button>
        )}

        {/* Chip 1: Offene Schichten (Helfer gesucht) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange("understaffed")}
          className={`flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center space-x-2.5 cursor-pointer whitespace-nowrap border ${
            statusFilter === "understaffed"
              ? "bg-gradient-to-r from-amber-500/35 via-amber-500/25 to-amber-600/35 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/60 scale-[1.02]"
              : "bg-amber-950/25 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/60"
          }`}
          id="chip-filter-understaffed"
        >
          <Filter className="h-4 w-4 text-amber-300 shrink-0" />
          <span>Offene Schichten (Helfer gesucht)</span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black border ${
              understaffedCount > 0 ? "bg-amber-500 text-slate-950 border-amber-300 shadow-xs" : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
          >
            {understaffedCount} offen
          </span>
        </button>

        {/* Chip 2: Dringend gesucht */}
        <button
          type="button"
          onClick={() => onStatusFilterChange("critical")}
          className={`flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center space-x-2.5 cursor-pointer whitespace-nowrap border ${
            statusFilter === "critical"
              ? "bg-gradient-to-r from-rose-500/35 via-rose-500/25 to-rose-600/35 border-rose-400 text-rose-200 shadow-lg shadow-rose-500/20 ring-2 ring-rose-400/60 scale-[1.02]"
              : "bg-rose-950/25 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/60"
          }`}
          id="chip-filter-critical"
        >
          <Star className="h-4 w-4 text-rose-300 shrink-0 fill-rose-300/30" />
          <span>Dringend gesucht ⭐</span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black border ${
              criticalCount > 0 ? "bg-rose-500 text-white border-rose-300 shadow-xs" : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
          >
            {criticalCount} unbesetzt
          </span>
        </button>

        {/* Chip 3: Meine Schichten */}
        <button
          type="button"
          onClick={() => onStatusFilterChange("my_shifts")}
          className={`flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center space-x-2.5 cursor-pointer whitespace-nowrap border ${
            statusFilter === "my_shifts"
              ? "bg-gradient-to-r from-emerald-500/35 via-emerald-500/25 to-teal-600/35 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/60 scale-[1.02]"
              : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30 hover:border-emerald-500/30"
          }`}
          id="chip-filter-myshifts"
        >
          <UserIcon className="h-4 w-4 text-emerald-300 shrink-0" />
          <span>Meine Schichten</span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black border ${
              myShiftsCount > 0 ? "bg-emerald-500 text-slate-950 border-emerald-300 shadow-xs" : "bg-slate-950 border-slate-800 text-slate-500"
            }`}
          >
            {myShiftsCount} eingeteilt
          </span>
        </button>

        {/* Chip 4: Alle Schichten */}
        <button
          type="button"
          onClick={() => onStatusFilterChange("all")}
          className={`flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center space-x-2.5 cursor-pointer whitespace-nowrap border ${
            statusFilter === "all"
              ? "bg-slate-800 border-slate-400 text-white shadow-md shadow-black/40 ring-2 ring-slate-400/50 scale-[1.02]"
              : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
          id="chip-filter-all"
        >
          <Globe className="h-4 w-4 text-slate-300 shrink-0" />
          <span>Alle Schichten</span>
          <span className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-black">
            {totalShiftsCount} Total
          </span>
        </button>
      </div>
    </div>
  );
}
