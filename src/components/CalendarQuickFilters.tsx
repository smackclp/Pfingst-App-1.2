import React from "react";
import { User, ShiftAssignment } from "../types";

interface CalendarQuickFiltersProps {
  users: User[];
  assignments: ShiftAssignment[];
  selectedPersonId: string;
  showOnlyPending: boolean;
  onToggleOnlyPending: () => void;
  showOnlyConflicts: boolean;
  onToggleOnlyConflicts: () => void;
  onResetFilters: () => void;
}

/** Schnell-Filter-Zeile unterhalb der Ansichts-Überschrift (noch zu bestätigen / Doppelbelegungen). */
export default function CalendarQuickFilters({
  users,
  assignments,
  selectedPersonId,
  showOnlyPending,
  onToggleOnlyPending,
  showOnlyConflicts,
  onToggleOnlyConflicts,
  onResetFilters,
}: CalendarQuickFiltersProps) {
  return (
    <div
      className="flex flex-wrap gap-2.5 items-center bg-slate-955/70 bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl animate-fade-in text-xs font-sans shadow-inner shadow-black/40"
      id="modern-filter-pills-row"
    >
      <div className="font-bold text-slate-100 tracking-wide mr-2 select-none flex items-center text-sm">
        <span className="mr-1.5 text-emerald-400 animate-pulse text-base">⚡</span>
        <span>Schnell-Filter:</span>
      </div>

      {/* Filter 1: Noch zu bestätigen */}
      <button
        type="button"
        onClick={onToggleOnlyPending}
        className={`flex items-center space-x-2.5 px-4.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none shadow-sm ${
          showOnlyPending
            ? "bg-amber-500/25 border-amber-400/80 text-amber-300 ring-2 ring-amber-500/25 scale-[1.01]"
            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 hover:border-slate-700"
        }`}
        id="toggle-only-pending-shifts"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${showOnlyPending ? "bg-amber-400 animate-pulse" : "bg-slate-550"}`} />
        <span className="flex items-center space-x-1.5">
          <span>⏳</span>
          <span>
            {selectedPersonId
              ? `Noch von ${users.find((u) => u.id === selectedPersonId)?.display_name || "Person"} zu bestätigen: ${
                  assignments.filter((a) => a.user_id === selectedPersonId && (a.status || (a.accepted ? "accepted" : "pending")) === "pending").length
                }`
              : `Gesamt unbestätigt: ${assignments.filter((a) => (a.status || (a.accepted ? "accepted" : "pending")) === "pending").length}`}
          </span>
        </span>
      </button>

      {/* Filter 2: Doppelbelegungen */}
      {selectedPersonId ? (
        <button
          type="button"
          onClick={onToggleOnlyConflicts}
          className={`flex items-center space-x-2.5 px-4.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none animate-fade-in shadow-sm ${
            showOnlyConflicts
              ? "bg-rose-500/25 border-rose-400/80 text-rose-300 ring-2 ring-rose-500/25 scale-[1.01]"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 hover:border-slate-700"
          }`}
          id="toggle-only-personal-conflicts"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${showOnlyConflicts ? "bg-rose-400 animate-pulse" : "bg-slate-550"}`} />
          <span className="flex items-center space-x-1.5">
            <span>⚠️</span>
            <span>Nur doppelt belegte Schichten</span>
          </span>
        </button>
      ) : (
        <div className="text-slate-500 text-[11px] select-none font-sans bg-slate-900/20 px-3 py-2 rounded-lg border border-slate-850/40 border-slate-800/40">
          💡 Wähle eine Person oben aus, um auch nach deren Doppelbelegungen zu filtern
        </div>
      )}

      {/* Clear Filters Indicator */}
      {(showOnlyPending || (selectedPersonId && showOnlyConflicts)) && (
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs hover:text-rose-400 text-rose-450 text-rose-400 font-bold cursor-pointer pl-2 hover:underline transition-all flex items-center space-x-1 sm:ml-auto animate-fade-in"
        >
          <span>✕</span> <span>Filter zurücksetzen</span>
        </button>
      )}
    </div>
  );
}
