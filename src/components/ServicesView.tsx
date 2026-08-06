import React from "react";
import { 
  Plus, 
  Search, 
  Briefcase, 
  AlertTriangle,
  Info
} from "lucide-react";
import { Service, User, Shift, Camp } from "../types";
import { addDays } from "../utils";
import { useUndoableDelete } from "../hooks/useUndoableDelete";
import ServiceCard from "./ServiceCard";
import ServiceFormModal from "./ServiceFormModal";
import UndoToast from "./UndoToast";

interface ServicesViewProps {
  services: Service[];
  users: User[];
  shifts: Shift[];
  onAddService: (service: Omit<Service, "id">) => Promise<void>;
  onUpdateService: (id: string, service: Partial<Service>) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
  onAddShift: (shift: Omit<Shift, "id">) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  isAdmin: boolean;
  activeCamp?: Camp;
}

export default function ServicesView({
  services,
  users,
  shifts,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddShift,
  onDeleteShift,
  isAdmin,
  activeCamp
}: ServicesViewProps) {
  const startDate = activeCamp?.start_date || "2026-05-23";
  const sunDate = addDays(startDate, 1);
  const endDate = activeCamp?.end_date || "2026-05-25";

  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");

  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    isOpen: boolean;
    type: "shift" | "service" | null;
    id: string;
    name: string;
  }>({ isOpen: false, type: null, id: "", name: "" });

  const [alertState, setAlertState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<Service | null>(null);
  const { isPending, scheduleDelete, undo, activeToast } = useUndoableDelete();

  const categories = React.useMemo(() => {
    return Array.from(new Set(services.map(s => s.category).filter(Boolean)));
  }, [services]);

  const filteredServices = React.useMemo(() => {
    return services.filter(s => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(term) || s.description.toLowerCase().includes(term);
        const matchesLoc = s.location.toLowerCase().includes(term);
        if (!matchesTitle && !matchesLoc) return false;
      }

      if (categoryFilter && s.category !== categoryFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [services, searchTerm, categoryFilter]);

  const visibleServices = filteredServices.filter(s => !isPending(s.id));
  const visibleShifts = shifts.filter(s => !isPending(s.id));

  const openAddModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const openEditModal = (svc: Service) => {
    setEditingService(svc);
    setIsModalOpen(true);
  };

  const handleDeleteService = (id: string, title: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: "service",
      id,
      name: title
    });
  };

  const handleDeleteShift = (shiftId: string, label: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: "shift",
      id: shiftId,
      name: label
    });
  };

  const handleConfirmDelete = () => {
    const { id, type, name } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, type: null, id: "", name: "" });
    scheduleDelete(id, name, async () => {
      try {
        if (type === "shift") {
          await onDeleteShift(id);
        } else if (type === "service") {
          await onDeleteService(id);
        }
      } catch (err) {
        setAlertState({
          isOpen: true,
          title: "Fehler beim Löschen",
          message: type === "shift" ? "Fehler beim Löschen der Schicht." : "Dienst konnte nicht gelöscht werden."
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/10 shadow-xl shadow-black/35 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Briefcase className="h-6 w-6 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold text-white font-display leading-tight">Dienste & Aufgabenkatalog</h3>
              <p className="text-xs text-slate-400 mt-0.5">Definieren Sie Diensttypen, Standardarbeitszeiten, Mindeststärken und Hauptverantwortliche.</p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 transition cursor-pointer font-mono"
              id="btn-add-service"
            >
              <Plus className="h-4 w-4" />
              <span>Neuen Diensttyp anlegen</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Quick Search */}
          <div className="sm:col-span-8 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-emerald-500/70" />
            </span>
            <input
              type="text"
              placeholder="Diensttitel, Ort oder Beschreibung suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-500 focus:border-cyan-500/40 focus:ring-0"
              id="search-services-input"
            />
          </div>

          {/* Category filter */}
          <div className="sm:col-span-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-200 select-none font-mono focus:border-cyan-500/40 focus:ring-0"
              id="filter-category-select"
            >
              <option value="" className="bg-slate-900 text-slate-300">Alle Kategorien / Bereiche</option>
              {categories.sort().map(c => (
                <option key={c} value={c} className="bg-slate-900 text-slate-300">{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Services List / Cards */}
      {visibleServices.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xs">
          <p className="text-white font-semibold text-sm">Keine Diensttypen gefunden</p>
          <p className="text-xs text-slate-400 mt-1">Passen Sie Ihre Suchbegriffe an oder erstellen Sie einen neuen Diensttyp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="services-grid">
          {visibleServices.map(svc => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              users={users}
              shifts={visibleShifts}
              isAdmin={isAdmin}
              startDate={startDate}
              sunDate={sunDate}
              endDate={endDate}
              onAddShift={onAddShift}
              onDeleteShiftClick={handleDeleteShift}
              onEditServiceClick={openEditModal}
              onDeleteServiceClick={handleDeleteService}
              onShowAlert={(title, message) => setAlertState({ isOpen: true, title, message })}
            />
          ))}
        </div>
      )}

      {/* Services Modal ADD / EDIT */}
      <ServiceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingService={editingService}
        onAddService={onAddService}
        onUpdateService={onUpdateService}
        users={users}
        onShowAlert={(title, message) => setAlertState({ isOpen: true, title, message })}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fade-in" id="delete-services-confirm-dialog">
          <div className="bg-slate-900 rounded-2xl p-6 text-white max-w-sm w-full border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-950/40 rounded-xl border border-rose-900/30 text-rose-500 shrink-0">
                <AlertTriangle className="h-6 w-6 text-rose-500 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white uppercase tracking-tight font-mono">
                  {deleteConfirm.type === "shift" ? "Schicht löschen?" : "Dienst löschen?"}
                </h4>
                <p className="text-xs text-slate-350 leading-relaxed">
                  {deleteConfirm.type === "shift" ? (
                    <span>Möchten Sie die Schicht <strong className="text-white font-semibold">"{deleteConfirm.name}"</strong> wirklich löschen?</span>
                  ) : (
                    <span>Möchten Sie Dienst <strong className="text-white font-semibold">"{deleteConfirm.name}"</strong> wirklich löschen? ACHTUNG: Hierdurch werden ALLE Schichten, die zu diesem Dienst gehören, sowie deren Einteilungen gelöscht!</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: "", name: "" })}
                className="px-3.5 py-2 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Ja, Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT DIALOG */}
      {alertState.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fade-in" id="alert-services-dialog">
          <div className="bg-slate-900 rounded-2xl p-6 text-white max-w-sm w-full border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-emerald-450 shrink-0">
                <Info className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white uppercase tracking-tight font-mono">{alertState.title}</h4>
                <p className="text-xs text-slate-350 leading-relaxed">{alertState.message}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAlertState({ isOpen: false, title: "", message: "" })}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <UndoToast toast={activeToast} onUndo={undo} />
    </div>
  );
}
