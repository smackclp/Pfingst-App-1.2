import React from "react";
import { 
  Users, 
  MapPin, 
  Clock, 
  Search, 
  User, 
  X, 
  Plus, 
  Trash2, 
  Info, 
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Calendar
} from "lucide-react";
import { User as UserType, Service, Shift, ShiftAssignment, Conflict, Camp } from "../types";
import { addDays, formatDateGerman, getDayName, formatDateWithDayPrefix } from "../utils";
import CalendarCard from "./CalendarCard";
import CalendarPersonStats from "./CalendarPersonStats";
import CalendarTableView from "./CalendarTableView";

interface CalendarViewProps {
  users: UserType[];
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  conflicts: Conflict[];
  currentUserId: string;
  isAdmin: boolean;
  onAddAssignment: (shiftId: string, userId: string) => Promise<void>;
  onRemoveAssignment: (shiftId: string, userId: string) => Promise<void>;
  onToggleAssignmentAccepted?: (assignmentId: string, accepted: boolean) => Promise<void>;
  onSelectShiftId?: string | null;
  onClearSelectShiftId?: () => void;
  // Allows parent to focus or trigger modifications
  onOpenAddShiftModal?: () => void;
  activeCamp?: Camp;
}

export default function CalendarView({
  users,
  services,
  shifts,
  assignments,
  conflicts,
  currentUserId,
  isAdmin,
  onAddAssignment,
  onRemoveAssignment,
  onToggleAssignmentAccepted,
  onSelectShiftId = null,
  onClearSelectShiftId,
  onOpenAddShiftModal,
  activeCamp
}: CalendarViewProps) {
  const startDate = activeCamp?.start_date || "2026-05-23";
  const sunDate = addDays(startDate, 1);
  const endDate = activeCamp?.end_date || "2026-05-25";

  // Filters & State
  const [selectedPersonId, setSelectedPersonId] = React.useState<string>(currentUserId || "");
  const [showOnlyConflicts, setShowOnlyConflicts] = React.useState<boolean>(false);
  const [showOnlyPending, setShowOnlyPending] = React.useState<boolean>(false);
  const [selectedDay, setSelectedDay] = React.useState<string>("All"); // "All", "startDate", "sunDate", "endDate"
  const [viewMode, setViewMode] = React.useState<"list" | "days" | "admin">("list");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [assignPopoverShiftId, setAssignPopoverShiftId] = React.useState<string | null>(null);
  const [expandedShifts, setExpandedShifts] = React.useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = React.useState<Array<{ user_id: string; year: number; camp_title: string }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);

  React.useEffect(() => {
    if (currentUserId) {
      setSelectedPersonId(currentUserId);
    }
  }, [currentUserId]);

  React.useEffect(() => {
    if (!selectedPersonId) {
      setShowOnlyConflicts(false);
    }
  }, [selectedPersonId]);

  React.useEffect(() => {
    if (assignPopoverShiftId) {
      setLoadingSuggestions(true);
      setSuggestions([]);
      fetch(`/api/shifts/${assignPopoverShiftId}/suggestions`)
        .then(res => {
          if (!res.ok) return [];
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return res.json();
          }
          return [];
        })
        .then(data => {
          if (Array.isArray(data)) {
            setSuggestions(data);
          }
        })
        .catch(err => console.error("Error loading shift suggestions in CalendarView:", err))
        .finally(() => setLoadingSuggestions(false));
    } else {
      setSuggestions([]);
    }
  }, [assignPopoverShiftId]);

  // Focus effect if selected shift is passed from outside (e.g. from Dashboard warnings)
  React.useEffect(() => {
    if (onSelectShiftId) {
      const targetShift = shifts.find(s => s.id === onSelectShiftId);
      if (targetShift) {
        setSelectedDay(targetShift.date);
        setViewMode("days");
        setAssignPopoverShiftId(onSelectShiftId);
        // Scroll slightly after render
        setTimeout(() => {
          const element = document.getElementById(`shift-card-${onSelectShiftId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-4", "ring-emerald-500", "scale-[1.01]");
            setTimeout(() => {
              element.classList.remove("ring-4", "ring-emerald-500", "scale-[1.01]");
            }, 3000);
          }
        }, 300);
      }
      if (onClearSelectShiftId) {
        onClearSelectShiftId();
      }
    }
  }, [onSelectShiftId, shifts, onClearSelectShiftId]);

  // Utility calculations
  const calculateShiftDurationHours = (start: string, end: string): number => {
    if (start === "Dauerhaft" || !start || !end) return 0;
    try {
      const [startH, startM] = start.split(":").map(Number);
      let [endH, endM] = end.split(":").map(Number);
      
      // Handles overlapping cross-midnight (e.g., 22:00 - 00:00 or 19:00 - 00:00 or 20:00 - 02:00)
      if (endH < startH || (endH === startH && endM < startM)) {
        endH += 24;
      }
      const totalMin = (endH * 60 + endM) - (startH * 60 + startM);
      return Math.round((totalMin / 60) * 10) / 10;
    } catch {
      return 1;
    }
  };

  const formatDateGerman = (dateStr: string): string => {
    return formatDateWithDayPrefix(dateStr, activeCamp);
  };

  const getDayLabel = (dateStr: string): string => {
    if (dateStr === "Haupt") return "Allgemein";
    return getDayName(dateStr);
  };

  // Filter logic
  const filteredShifts = React.useMemo(() => {
    return shifts.filter(s => {
      // Day filter
      if (selectedDay !== "All" && s.date !== selectedDay) {
        return false;
      }

      // Person filter
      if (selectedPersonId) {
        const hasAssignment = assignments.some(a => a.shift_id === s.id && a.user_id === selectedPersonId);
        if (!hasAssignment) return false;

        if (showOnlyConflicts) {
          const isConflicted = conflicts.some(c => 
            c.type === "overlap" && 
            c.userId === selectedPersonId && 
            (c.shiftId1 === s.id || c.shiftId2 === s.id)
          );
          if (!isConflicted) return false;
        }
      }

      // Filter for shifts to be confirmed (noch zu bestätigende Schichten)
      if (showOnlyPending) {
        const relevantAssignments = selectedPersonId 
          ? assignments.filter(a => a.shift_id === s.id && a.user_id === selectedPersonId)
          : assignments.filter(a => a.shift_id === s.id);

        const hasPending = relevantAssignments.some(a => {
          const status = a.status || (a.accepted ? 'accepted' : 'pending');
          return status === 'pending';
        });

        if (!hasPending) return false;
      }

      // Search term filter
      if (searchTerm) {
        const svc = services.find(sv => sv.id === s.service_id);
        const term = searchTerm.toLowerCase();
        const matchesTitle = svc?.title.toLowerCase().includes(term);
        const matchesLoc = svc?.location.toLowerCase().includes(term);
        const matchesNotes = s.notes?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesLoc && !matchesNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by date first, then by start time minutes
      if (a.date !== b.date) {
        const dateOrder: Record<string, number> = { "Haupt": 0 };
        dateOrder[startDate] = 1;
        dateOrder[sunDate] = 2;
        dateOrder[endDate] = 3;
        const orderA = dateOrder[a.date] !== undefined ? dateOrder[a.date] : 9;
        const orderB = dateOrder[b.date] !== undefined ? dateOrder[b.date] : 9;
        if (orderA !== orderB) return orderA - orderB;
      }
      if (a.start_time === "Dauerhaft" || b.start_time === "Dauerhaft") {
        return a.start_time === "Dauerhaft" ? -1 : 1;
      }
      const [hA, mA] = a.start_time.split(":").map(Number);
      const [hB, mB] = b.start_time.split(":").map(Number);
      return (hA * 60 + mA) - (hB * 60 + mB);
    });
  }, [shifts, selectedDay, selectedPersonId, showOnlyConflicts, showOnlyPending, conflicts, searchTerm, assignments, services]);

  // Statistics for selected person
  const personStats = React.useMemo(() => {
    if (!selectedPersonId) return null;
    
    const user = users.find(u => u.id === selectedPersonId);
    if (!user) return null;

    // Filter assignments of this user
    const userAss = assignments.filter(a => a.user_id === selectedPersonId);
    const userShifts = userAss
      .map(a => shifts.find(s => s.id === a.shift_id))
      .filter((s): s is Shift => !!s);

    let totalHours = 0;
    userShifts.forEach(s => {
      totalHours += calculateShiftDurationHours(s.start_time, s.end_time);
    });

    const shiftCount = userShifts.length;
    
    // Check which days have NO shifts
    const daysWithShifts = new Set(userShifts.map(s => s.date));
    const allDays = [startDate, sunDate, endDate];
    const freeDays = allDays.filter(d => !daysWithShifts.has(d));

    return {
      user,
      totalHours,
      shiftCount,
      freeDays,
    };
  }, [selectedPersonId, users, assignments, shifts, startDate, sunDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Search & Statistics Banner */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/10 shadow-xl shadow-black/35 space-y-4">
        
        {/* Row 1: Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Day selection tabs */}
          <div className="md:col-span-5 flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: "All", label: "Alle" },
              { id: "Haupt", label: "Allgemein" },
              { id: startDate, label: "Sa" },
              { id: sunDate, label: "So" },
              { id: endDate, label: "Mo" }
            ].map(day => (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedDay === day.id
                    ? "bg-slate-900 text-emerald-400 border border-emerald-500/20 shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id={`day-filter-tab-${day.id}`}
              >
                {day.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="md:col-span-3 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-emerald-500/70" />
            </span>
            <input
              type="text"
              placeholder="Suchen nach Dienst, Ort oder Info..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm pl-9 pr-9 py-2 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 focus:ring-0 bg-slate-950/65 text-white placeholder-slate-500"
              id="calendar-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Person Selector */}
          <div className="md:col-span-4 flex items-center space-x-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-emerald-500/70" />
              </span>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full text-sm pl-9 pr-8 py-2 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 focus:ring-0 bg-slate-950/65 text-slate-200 appear-none appearance-none font-mono"
                id="person-filter-select"
              >
                <option value="" className="bg-slate-900 text-slate-300">-- Alle Personen filtern --</option>
                {users
                  .filter(u => u.active)
                  .sort((a, b) => a.display_name.localeCompare(b.display_name))
                  .map(user => (
                    <option key={user.id} value={user.id} className="bg-slate-900 text-slate-300">
                      {user.display_name}
                    </option>
                  ))}
              </select>
            </div>
            {selectedPersonId && (
              <button
                onClick={() => setSelectedPersonId("")}
                className="p-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition shrink-0"
                title="Filter löschen"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

        </div>
        {/* Row 2: Selected Person Stats Box */}
        {personStats && (
          <CalendarPersonStats
            personStats={personStats}
            startDate={startDate}
            sunDate={sunDate}
            endDate={endDate}
            assignments={assignments}
            shifts={shifts}
            services={services}
            users={users}
            onClearPersonFilter={() => setSelectedPersonId("")}
            formatDateGerman={formatDateGerman}
          />
        )}
      </div>

      {/* Main Schedule Panels */}
      <div>
        <div className="flex flex-col gap-4 mb-6 bg-slate-900/10 border border-slate-800/20 p-2.5 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <h3 className="text-xl font-bold font-display text-white tracking-tight">
                {selectedDay === "All" ? "Einsatzplan: Alle Tage" : `Einsatzplan: ${getDayLabel(selectedDay)}`}
              </h3>
              <span className="bg-slate-950 text-emerald-400 border border-emerald-500/10 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                {filteredShifts.length} Schichten
              </span>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
              <button
                onClick={() => setViewMode("days")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === "days"
                    ? "bg-slate-900 border border-emerald-500/15 text-emerald-400 font-bold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Karten
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-slate-900 border border-emerald-500/15 text-emerald-400 font-bold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Kompakte Liste
              </button>
              {isAdmin && (
                <button
                  onClick={onOpenAddShiftModal}
                  className="bg-emerald-650 hover:bg-emerald-600 border border-emerald-500/30 text-white p-1.5 rounded-md transition ml-1 cursor-pointer"
                  title="Schicht hinzufügen"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Prominent Schnell-Filter Layout right beneath the heading */}
          <div className="flex flex-wrap gap-2.5 items-center bg-slate-955/70 bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl animate-fade-in text-xs font-sans shadow-inner shadow-black/40" id="modern-filter-pills-row">
            <div className="font-bold text-slate-100 tracking-wide mr-2 select-none flex items-center text-sm">
              <span className="mr-1.5 text-emerald-400 animate-pulse text-base">⚡</span> 
              <span>Schnell-Filter:</span>
            </div>

            {/* Filter 1: Noch zu bestätigen */}
            <button
              type="button"
              onClick={() => setShowOnlyPending(!showOnlyPending)}
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
                  {selectedPersonId ? (
                    `Noch von ${users.find(u => u.id === selectedPersonId)?.display_name || "Person"} zu bestätigen: ${assignments.filter(a => a.user_id === selectedPersonId && (a.status || (a.accepted ? 'accepted' : 'pending')) === 'pending').length}`
                  ) : (
                    `Gesamt unbestätigt: ${assignments.filter(a => (a.status || (a.accepted ? 'accepted' : 'pending')) === 'pending').length}`
                  )}
                </span>
              </span>
            </button>

            {/* Filter 2: Doppelbelegungen */}
            {selectedPersonId ? (
              <button
                type="button"
                onClick={() => setShowOnlyConflicts(!showOnlyConflicts)}
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
                onClick={() => {
                  setShowOnlyPending(false);
                  setShowOnlyConflicts(false);
                }}
                className="text-xs hover:text-rose-400 text-rose-450 text-rose-400 font-bold cursor-pointer pl-2 hover:underline transition-all flex items-center space-x-1 sm:ml-auto animate-fade-in"
              >
                <span>✕</span> <span>Filter zurücksetzen</span>
              </button>
            )}
          </div>
        </div>

        {filteredShifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl text-center shadow-xs">
            <Calendar className="h-12 w-12 text-slate-505 text-slate-500 bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl mb-3" />
            <p className="text-slate-200 font-semibold text-sm">Keine passenden Schichten gefunden</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md px-4">
              {selectedPersonId 
                ? "Diese Person ist am ausgewählten Tag in keinen Schichten eingeteilt."
                : "Es wurden keine Schichten angelegt oder die aktuellen Suchfilter verbergen das Ergebnis."
              }
            </p>
          </div>
        ) : viewMode === "days" ? (
                  /* Visual Layout: Cards in Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="calendar-grid">
            {filteredShifts.map((s) => {
              const svc = services.find((sv) => sv.id === s.service_id);
              if (!svc) return null;

              return (
                <CalendarCard
                  key={s.id}
                  s={s}
                  svc={svc}
                  services={services}
                  shifts={shifts}
                  assignments={assignments}
                  users={users}
                  isExpanded={!!expandedShifts[s.id]}
                  onToggleExpand={(shiftId) =>
                    setExpandedShifts((prev) => ({ ...prev, [shiftId]: !prev[shiftId] }))
                  }
                  startDate={startDate}
                  sunDate={sunDate}
                  endDate={endDate}
                  isAdmin={isAdmin}
                  isPopoverActive={assignPopoverShiftId === s.id}
                  onOpenPopover={(shiftId) => setAssignPopoverShiftId(shiftId)}
                  onClosePopover={() => setAssignPopoverShiftId(null)}
                  onRemoveAssignment={onRemoveAssignment}
                  onAddAssignment={onAddAssignment}
                  onToggleAssignmentAccepted={onToggleAssignmentAccepted}
                  selectedPersonId={selectedPersonId}
                  currentUserId={currentUserId}
                  suggestions={suggestions}
                  loadingSuggestions={loadingSuggestions}
                  calculateShiftDurationHours={calculateShiftDurationHours}
                  formatDateGerman={formatDateGerman}
                />
              );
            })}
          </div>
        ) : (
          <CalendarTableView
            filteredShifts={filteredShifts}
            services={services}
            assignments={assignments}
            users={users}
            activeCamp={activeCamp}
            onToggleAssignmentAccepted={onToggleAssignmentAccepted}
          />
        )}
      </div>
    </div>
  );
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
