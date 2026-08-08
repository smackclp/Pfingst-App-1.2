import React from "react";
import {
  Plus,
  Search,
  Briefcase,
  UserCheck,
  Globe
} from "lucide-react";
import { Service, User, Shift, Camp } from "../types";
import { addDays } from "../utils";
import { useUndoableDelete } from "../hooks/useUndoableDelete";
import ServiceCard from "./ServiceCard";
import ServiceFormModal from "./ServiceFormModal";
import UndoToast from "./UndoToast";
import ConfirmDialog from "./ConfirmDialog";

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
  accessRole?: "helfer" | "bereichsleiter" | "lagerleitung";
  currentUserId?: string | null;
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
  activeCamp,
  accessRole,
  currentUserId
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

  // Bereichsleitung sieht sonst dieselbe volle Liste wie die Lagerleitung -
  // Standardansicht auf die eigenen verantworteten Dienste fokussieren spart
  // Klicks. Nur wenn wirklich verantwortete Dienste existieren, sonst würde
  // der Start-Zustand eine leere, verwirrende Liste zeigen. Lagerleitung
  // behält bewusst die volle Übersicht (kein Toggle nötig).
  const myServicesCount = React.useMemo(
    () => services.filter(s => s.responsible_id === currentUserId).length,
    [services, currentUserId]
  );
  const isBereichsleiter = accessRole === "bereichsleiter";
  const [showOnlyMine, setShowOnlyMine] = React.useState(() => isBereichsleiter && myServicesCount > 0);

  const categories = React.useMemo(() => {
    return Array.from(new Set(services.map(s => s.category).filter(Boolean)));
  }, [services]);

  const filteredServices = React.useMemo(() => {
    return services.filter(s => {
      if (isBereichsleiter && showOnlyMine && s.responsible_id !== currentUserId) {
        return false;
      }

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
  }, [services, searchTerm, categoryFilter, isBereichsleiter, showOnlyMine, currentUserId]);

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

        {isBereichsleiter && myServicesCount > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-xl p-1 w-fit" id="services-mine-toggle">
            <button
              type="button"
              onClick={() => setShowOnlyMine(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                showOnlyMine ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Meine Dienste ({myServicesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setShowOnlyMine(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                !showOnlyMine ? "bg-slate-700 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Alle Dienste ({services.length})</span>
            </button>
          </div>
        )}

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
              accessRole={accessRole}
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
      <ConfirmDialog
        id="delete-services-confirm-dialog"
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === "shift" ? "Schicht löschen?" : "Dienst löschen?"}
        message={
          deleteConfirm.type === "shift" ? (
            <span>Möchten Sie die Schicht <strong className="text-white font-semibold">"{deleteConfirm.name}"</strong> wirklich löschen?</span>
          ) : (
            <span>Möchten Sie Dienst <strong className="text-white font-semibold">"{deleteConfirm.name}"</strong> wirklich löschen? ACHTUNG: Hierdurch werden ALLE Schichten, die zu diesem Dienst gehören, sowie deren Einteilungen gelöscht!</span>
          )
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: null, id: "", name: "" })}
      />

      {/* ALERT DIALOG */}
      <ConfirmDialog
        id="alert-services-dialog"
        isOpen={alertState.isOpen}
        variant="info"
        title={alertState.title}
        message={alertState.message}
        onCancel={() => setAlertState({ isOpen: false, title: "", message: "" })}
      />

      <UndoToast toast={activeToast} onUndo={undo} />
    </div>
  );
}
