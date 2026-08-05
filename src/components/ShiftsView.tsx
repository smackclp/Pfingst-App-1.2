import React from "react";
import { Plus, Clock, AlertTriangle } from "lucide-react";
import { Shift, Service, User, ShiftAssignment, Camp } from "../types";
import { addDays, formatDateWithDayPrefix, getDayName, timeToMinutes } from "../utils";
import { useShiftSuggestions } from "../hooks/useShiftSuggestions";
import ShiftRow from "./ShiftRow";
import ShiftFormModal from "./ShiftFormModal";
import ShiftsQuickFilterBar from "./ShiftsQuickFilterBar";
import ConfirmDialog from "./ConfirmDialog";

interface ShiftsViewProps {
  shifts: Shift[];
  services: Service[];
  users: User[];
  assignments: ShiftAssignment[];
  onAddShift: (shift: Omit<Shift, "id">) => Promise<void>;
  onUpdateShift: (id: string, shift: Partial<Shift>) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  onAddAssignment: (shiftId: string, userId: string, force?: boolean) => Promise<void>;
  onRemoveAssignment: (shiftId: string, userId: string) => Promise<void>;
  onToggleAssignmentAccepted?: (assignmentId: string, accepted: boolean) => Promise<void>;
  isAdmin: boolean;
  activeCamp?: Camp;
  currentUserId?: string | null;
}

export default function ShiftsView({
  shifts,
  services,
  users,
  assignments,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onAddAssignment,
  onRemoveAssignment,
  onToggleAssignmentAccepted,
  isAdmin,
  activeCamp,
  currentUserId
}: ShiftsViewProps) {
  const startDate = activeCamp?.start_date || "2026-05-23";
  const sunDate = addDays(startDate, 1);
  const endDate = activeCamp?.end_date || "2026-05-25";

  const [selectedDateFilter, setSelectedDateFilter] = React.useState<string>("All");
  const [selectedServiceFilter, setSelectedServiceFilter] = React.useState<string>("All");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "understaffed" | "critical" | "my_shifts">("all");

  // Add shift modal states
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  // Assign wizard details
  const [activeShiftWizardId, setActiveShiftWizardId] = React.useState<string | null>(null);
  const { suggestions, loadingSuggestions } = useShiftSuggestions(activeShiftWizardId);

  // Custom double boarding override prompt dialog
  const [overrideModal, setOverrideModal] = React.useState<{
    isOpen: boolean;
    shiftId: string;
    userId: string;
    message: string;
  }>({ isOpen: false, shiftId: "", userId: "", message: "" });

  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({ isOpen: false, id: "", name: "" });

  const [alertState, setAlertState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  const understaffedCount = React.useMemo(() => {
    return shifts.filter((s) => {
      const svc = services.find((sv) => sv.id === s.service_id);
      const minNeeded = s.min_persons !== undefined ? s.min_persons : (svc ? svc.min_persons : 1);
      const count = assignments.filter((a) => a.shift_id === s.id).length;
      return count < minNeeded;
    }).length;
  }, [shifts, assignments, services]);

  const criticalCount = React.useMemo(() => {
    return shifts.filter((s) => {
      const count = assignments.filter((a) => a.shift_id === s.id).length;
      return count === 0;
    }).length;
  }, [shifts, assignments]);

  const myShiftsCount = React.useMemo(() => {
    if (!currentUserId) return 0;
    return shifts.filter((s) => assignments.some((a) => a.shift_id === s.id && a.user_id === currentUserId)).length;
  }, [shifts, assignments, currentUserId]);

  const filteredShifts = React.useMemo(() => {
    return shifts
      .filter((s) => {
        if (selectedDateFilter !== "All" && s.date !== selectedDateFilter) return false;
        if (selectedServiceFilter !== "All" && s.service_id !== selectedServiceFilter) return false;
        
        const shiftAssignments = assignments.filter((a) => a.shift_id === s.id);

        if (statusFilter === "understaffed") {
          const svc = services.find((sv) => sv.id === s.service_id);
          const minNeeded = s.min_persons !== undefined ? s.min_persons : (svc ? svc.min_persons : 1);
          if (shiftAssignments.length >= minNeeded) return false;
        } else if (statusFilter === "critical") {
          if (shiftAssignments.length > 0) return false;
        } else if (statusFilter === "my_shifts") {
          if (!currentUserId) return false;
          if (!shiftAssignments.some((a) => a.user_id === currentUserId)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      });
  }, [shifts, selectedDateFilter, selectedServiceFilter, statusFilter, assignments, services, currentUserId]);

  const formatDateGerman = (dateStr: string): string => {
    return formatDateWithDayPrefix(dateStr, activeCamp);
  };

  const getDayLabel = (dateStr: string): string => {
    return getDayName(dateStr);
  };

  const handleDeleteShift = async (id: string, label: string) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      name: label
    });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: "", name: "" });
    try {
      await onDeleteShift(id);
    } catch {
      setAlertState({
        isOpen: true,
        title: "Systemfehler",
        message: "Fehler beim Löschen der Schicht."
      });
    }
  };

  // Advanced assignment deploy helper with 409 conflict detection
  const handleAssignUser = async (shiftId: string, userId: string, force = false) => {
    try {
      await onAddAssignment(shiftId, userId, force);
    } catch (err: any) {
      if (err.status === 409) {
        setOverrideModal({
          isOpen: true,
          shiftId,
          userId,
          message: err.message || "Es liegt ein Konflikt für diese Person vor."
        });
      } else {
        setAlertState({
          isOpen: true,
          title: "Systemfehler",
          message: err.message || "Bereits zugewiesen oder unvollständig."
        });
      }
    }
  };

  const handleConfirmOverride = async () => {
    const { shiftId, userId } = overrideModal;
    setOverrideModal({ isOpen: false, shiftId: "", userId: "", message: "" });
    try {
      await handleAssignUser(shiftId, userId, true);
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Fehler",
        message: "Fehler beim Überschreiben: " + err.message
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header and filters */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/10 shadow-xl shadow-black/35 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-6 w-6 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold text-white font-display leading-tight">Konkrete Schichtenplaner</h3>
              <p className="text-xs text-slate-400 mt-0.5">Planen Sie spezifische Uhrzeiten ein und teilen Sie Helfer*innen unter Konfliktprüfung zu.</p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 transition cursor-pointer font-mono"
              id="btn-add-shift-top"
            >
              <Plus className="h-4 w-4" />
              <span>Schicht planen</span>
            </button>
          )}
        </div>

        {/* Quick Helper Filter Chip Bar */}
        <ShiftsQuickFilterBar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          understaffedCount={understaffedCount}
          criticalCount={criticalCount}
          myShiftsCount={myShiftsCount}
          totalShiftsCount={shifts.length}
        />

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Day selection select */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nach Tag filtern</label>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-200 select-none font-mono focus:border-cyan-500/40 focus:ring-0"
              id="shift-filter-day-select"
            >
              <option value="All" className="bg-slate-900 text-slate-350">Alle Zeltlagertage</option>
              <option value={startDate} className="bg-slate-900 text-slate-100 font-mono">Samstag, {formatDateGerman(startDate)}</option>
              <option value={sunDate} className="bg-slate-900 text-slate-100 font-mono">Sonntag, {formatDateGerman(sunDate)}</option>
              <option value={endDate} className="bg-slate-900 text-slate-100 font-mono">Montag, {formatDateGerman(endDate)}</option>
            </select>
          </div>

          {/* Service filter selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nach Dienst-Typ filtern</label>
            <select
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-200 select-none font-mono focus:border-cyan-500/40 focus:ring-0"
              id="shift-filter-service-select"
            >
              <option value="All" className="bg-slate-900 text-slate-350">Alle Dienste</option>
              {services.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">{s.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Shifts Loop */}
      {filteredShifts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="text-3xl">
            {statusFilter === "critical" ? "✨" : statusFilter === "understaffed" ? "🎉" : statusFilter === "my_shifts" ? "🙋‍♂️" : "📅"}
          </div>
          <p className="text-white font-bold text-sm">
            {statusFilter === "critical"
              ? "Super! Keine dringend unbesetzten Schichten vorhanden"
              : statusFilter === "understaffed"
              ? "Alle Schichten sind zurzeit voll besetzt!"
              : statusFilter === "my_shifts"
              ? "Du bist aktuell in noch keiner Schicht eingetragen"
              : "Keine passenden Schichten gefunden"}
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {statusFilter === "critical"
              ? "Aktuell hat jede Schicht mindestens eine(n) Helfer*in. Klicke auf 'Offene Schichten', um weiter auszuhelfen!"
              : statusFilter === "understaffed"
              ? "Klasse! Für alle gefilterten Schichten sind genügend helfende Hände vorhanden."
              : statusFilter === "my_shifts"
              ? "Klicke oben auf 'Offene Schichten (Helfer gesucht)', um Schichten zu finden, bei denen du direkt mit anpacken kannst!"
              : "Passe die Filtereinstellungen oben an, um andere Schichten oder Tage anzuzeigen."}
          </p>
          {statusFilter !== "all" && (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <span>🌐 Alle Schichten anzeigen</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4" id="shifts-accordion-container">
          {filteredShifts.map((s) => {
            const svc = services.find((sv) => sv.id === s.service_id);
            if (!svc) return null;

            return (
              <ShiftRow
                key={s.id}
                s={s}
                svc={svc}
                services={services}
                assignments={assignments}
                shifts={shifts}
                users={users}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                activeShiftWizardId={activeShiftWizardId}
                onUpdateShift={onUpdateShift}
                onDeleteShift={handleDeleteShift}
                onRemoveAssignment={onRemoveAssignment}
                onToggleAssignmentAccepted={onToggleAssignmentAccepted}
                suggestions={suggestions}
                loadingSuggestions={loadingSuggestions}
                setActiveShiftWizardId={setActiveShiftWizardId}
                getDayLabel={getDayLabel}
                formatDateGerman={formatDateGerman}
                handleAssignUser={handleAssignUser}
                startDate={startDate}
                sunDate={sunDate}
                endDate={endDate}
              />
            );
          })}
        </div>
      )}

      {/* Write Shift Modal */}
      <ShiftFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        services={services}
        startDate={startDate}
        sunDate={sunDate}
        endDate={endDate}
        onAddShift={onAddShift}
        onShowAlert={(title, message) => setAlertState({ isOpen: true, title, message })}
      />

      {/* FORCE BI-BOARDING CONFIRM DIALOG */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animation-fade-in" id="override-confirm-dialog">
          <div className="bg-slate-900 rounded-2xl p-6 text-white max-w-sm w-full border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-950/40 rounded-xl border border-rose-900/30 text-rose-450 shrink-0">
                <AlertTriangle className="h-6 w-6 text-rose-500 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white leading-tight font-display">Überlappungskonflikt</h4>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Warnung Doppelbelegung</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">{overrideModal.message}</p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => setOverrideModal({ isOpen: false, shiftId: "", userId: "", message: "" })}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-[11px] transition cursor-pointer font-mono"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmOverride}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 border border-rose-500/20 font-bold text-white rounded-xl text-[11px] transition cursor-pointer font-mono"
              >
                Ja, trotzdem eintragen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDialog
        id="delete-shift-confirm-dialog"
        isOpen={deleteConfirm.isOpen}
        title="Schicht löschen?"
        message={
          <>
            Möchten Sie diese Schicht (<strong className="text-white font-semibold">{deleteConfirm.name}</strong>) wirklich löschen? Hierbei werden alle Helfer*innen-Zuweisungen dieser Schicht gelöscht.
          </>
        }
        confirmLabel="Ja, Löschen"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: "", name: "" })}
      />

      {/* ALERT DIALOG */}
      <ConfirmDialog
        id="alert-shifts-dialog"
        isOpen={alertState.isOpen}
        variant="info"
        title={alertState.title}
        message={alertState.message}
        onCancel={() => setAlertState({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
}
