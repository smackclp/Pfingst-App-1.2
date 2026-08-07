import React from "react";
import {
  Users,
  Search,
  Plus,
  Shield,
  Trash2,
  Calendar,
  ShoppingBag
} from "lucide-react";
import { User, FunctionalRole } from "../types";
import PersonCard from "./PersonCard";
import PersonFormModal from "./PersonFormModal";
import AccessRoleManager from "./AccessRoleManager";
import ConfirmDialog from "./ConfirmDialog";
import UndoToast from "./UndoToast";
import FieldError from "./FieldError";
import { useUndoableDelete } from "../hooks/useUndoableDelete";

interface PeopleViewProps {
  users: User[];
  onAddUser: (user: Omit<User, "id">) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
  onUpdateAccessRole: (id: string, role: "helfer" | "bereichsleiter" | "lagerleitung") => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  isAdmin: boolean;
  functionalRoles: FunctionalRole[];
  onAddRole: (name: string, userId: string | null) => Promise<void>;
  onUpdateRole: (id: string, payload: Partial<FunctionalRole>) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;
}

export default function PeopleView({
  users,
  onAddUser,
  onUpdateUser,
  onUpdateAccessRole,
  onDeleteUser,
  isAdmin,
  functionalRoles,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
}: PeopleViewProps) {
  // Navigation tabs
  const [subTab, setSubTab] = React.useState<"list" | "roles" | "access">("list");

  // Filtering states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("active"); // "all", "active", "inactive"
  
  // Add dynamic role form states
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleUserId, setNewRoleUserId] = React.useState("");
  const [newRoleNameError, setNewRoleNameError] = React.useState<string | undefined>();

  // ModalsState for people management
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({ isOpen: false, id: "", name: "" });

  const [alertState, setAlertState] = React.useState<{
    isOpen: boolean;
    message: string;
    title?: string;
  }>({ isOpen: false, message: "" });

  // Roles updates & deletions confirmations
  const [confirmRoleUpdate, setConfirmRoleUpdate] = React.useState<{
    roleId: string;
    roleName: string;
    newUserId: string | null;
    newUserName: string;
  } | null>(null);

  const [confirmRoleDelete, setConfirmRoleDelete] = React.useState<{
    roleId: string;
    roleName: string;
  } | null>(null);

  const { isPending, scheduleDelete, undo, activeToast } = useUndoableDelete();

  const roles = React.useMemo(() => {
    const list = new Set(users.map(u => u.role).filter(Boolean));
    return Array.from(list);
  }, [users]);

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      // Search Box
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) || u.display_name.toLowerCase().includes(term);
        const matchesNotes = u.notes?.toLowerCase().includes(term);
        const matchesRole = u.role.toLowerCase().includes(term);
        if (!matchesName && !matchesNotes && !matchesRole) return false;
      }

      // Role Filter
      if (roleFilter && u.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "active" && !u.active) return false;
      if (statusFilter === "inactive" && u.active) return false;

      return true;
    }).sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [users, searchTerm, roleFilter, statusFilter]);

  const openAddModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDelete = () => {
    const { id, name } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: "", name: "" });
    scheduleDelete(id, name, async () => {
      try {
        await onDeleteUser(id);
      } catch (err) {
        console.error(err);
        setAlertState({
          isOpen: true,
          title: "Fehler beim Löschen",
          message: "Fehler beim Löschen der Person."
        });
      }
    });
  };

  const visibleUsers = filteredUsers.filter((u) => !isPending(u.id));
  const visibleRoles = (functionalRoles || []).filter((r) => !isPending(r.id));

  return (
    <div className="space-y-6">
      {/* Filtering Header Banner */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/10 shadow-xl shadow-black/35 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold font-display text-white leading-tight">Mitarbeiter & Helfer*innen</h3>
              <p className="text-xs text-slate-400 mt-0.5">Übersicht aller Lager-Teilnehmer, Planungsverantwortlichen und Einsatzkräfte ({users.length} gesamt).</p>
            </div>
          </div>

          {isAdmin && subTab === "list" && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 border border-emerald-500/20 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 transition cursor-pointer font-mono"
              id="btn-add-person"
            >
              <Plus className="h-4 w-4" />
              <span>Person anlegen</span>
            </button>
          )}
        </div>

        {/* Sub-tabs Switch */}
        <div className="flex border-b border-slate-800/80 gap-6 pt-2">
          <button
            onClick={() => setSubTab("list")}
            className={`pb-3 font-mono font-bold text-xs uppercase tracking-wider transition ${subTab === "list" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-slate-400 hover:text-slate-200"}`}
          >
            📋 Helfer-Liste ({users.length})
          </button>
          <button
            onClick={() => setSubTab("roles")}
            className={`pb-3 font-mono font-bold text-xs uppercase tracking-wider transition ${subTab === "roles" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-slate-400 hover:text-slate-200"}`}
          >
            🛡️ Lager-Rollen ({visibleRoles.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => setSubTab("access")}
              className={`pb-3 font-mono font-bold text-xs uppercase tracking-wider transition ${subTab === "access" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-slate-400 hover:text-slate-200"}`}
              id="subtab-access"
            >
              🔑 Admin-Verwaltung
            </button>
          )}
        </div>
      </div>

      {subTab === "access" ? (
        <AccessRoleManager users={users} onUpdateAccessRole={onUpdateAccessRole} />
      ) : subTab === "list" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800/40">
            {/* Quick Search */}
            <div className="sm:col-span-6 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-emerald-500/70" />
              </span>
              <input
                type="text"
                placeholder="Person suchen (Name, Notiz, Rolle)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-800 focus:border-cyan-500 focus:ring-0 rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-500"
                id="search-people-input"
              />
            </div>

            {/* Role Filter */}
            <div className="sm:col-span-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-800 focus:border-cyan-500 focus:ring-0 rounded-xl bg-slate-950/65 text-slate-200 select-none font-mono"
                id="filter-role-select"
              >
                <option value="" className="bg-slate-900 text-slate-300">Alle Rollen</option>
                {roles.sort().map(r => (
                  <option key={r} value={r} className="bg-slate-900 text-slate-300">{r}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-800 focus:border-cyan-500 focus:ring-0 rounded-xl bg-slate-950/65 text-slate-200 select-none font-mono"
                id="filter-status-select"
              >
                <option value="all" className="bg-slate-900 text-slate-300">Alle Zustände</option>
                <option value="active" className="bg-slate-900 text-slate-300">Aktiv im Lager</option>
                <option value="inactive" className="bg-slate-900 text-slate-300">Inaktiv / Abgereist</option>
              </select>
            </div>
          </div>

          {/* Grid of Persons */}
          {visibleUsers.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xs animate-fade-in">
              <p className="text-white font-semibold text-sm">Keine Personen gefunden</p>
              <p className="text-xs text-slate-400 mt-1">Passen Sie Ihre Filter an oder errichten Sie einen neuen Eintrag.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="people-list-grid">
              {visibleUsers.map((u) => (
                <PersonCard
                  key={u.id}
                  u={u}
                  isAdmin={isAdmin}
                  onEditClick={openEditModal}
                  onDeleteClick={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 animate-fade-in" id="roles-subview-panel">
          {/* Add Role Section */}
          {isAdmin && (
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newRoleName.trim()) {
                  setNewRoleNameError("Bitte eine Rollenbezeichnung eingeben.");
                  return;
                }
                setNewRoleNameError(undefined);
                try {
                  await onAddRole(newRoleName.trim(), newRoleUserId || null);
                  setNewRoleName("");
                  setNewRoleUserId("");
                } catch (err) {
                  console.error(err);
                  setAlertState({
                    isOpen: true,
                    title: "Fehler beim Erstellen",
                    message: "Die Rolle konnte nicht angelegt werden."
                  });
                }
              }}
              className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4"
              id="form-create-role"
            >
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> Neue funktionale Rolle hinzufügen
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Weisen Sie bestimmten Helfer*innen feste Aufgabenbereiche wie Einkauf, Schichtplanung oder Küchenleitung zu.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Rollenbezeichnung
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Einkauf, Schichtplanung, Küchenchef..."
                    value={newRoleName}
                    onChange={(e) => {
                      setNewRoleName(e.target.value);
                      setNewRoleNameError(undefined);
                    }}
                    className={`w-full text-xs px-3 py-2 border rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-0 ${
                      newRoleNameError ? "border-rose-500/60" : "border-slate-800"
                    }`}
                    id="input-new-role-name"
                  />
                  <FieldError message={newRoleNameError} />
                </div>

                <div className="md:col-span-5 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Zuständiger Helfer
                  </label>
                  <select
                    value={newRoleUserId}
                    onChange={(e) => setNewRoleUserId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-200 focus:border-cyan-500 focus:ring-0 font-mono"
                    id="select-new-role-user"
                  >
                    <option value="" className="bg-slate-900 text-slate-300">-- Nicht zugewiesen --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                        {u.first_name} {u.last_name} ({u.display_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-550 border border-emerald-500 whitespace-nowrap text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer font-mono h-[38px]"
                    id="btn-submit-new-role"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* List Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="roles-cards-grid">
            {visibleRoles.map((role) => {
              const assignedUser = users.find((u) => u.id === role.user_id);
              const isCoreRole = role.id === "role-einkauf" || role.id === "role-schichtplanung" || role.name.toLowerCase() === "einkauf" || role.name.toLowerCase() === "schichtplanung";
              
              return (
                <div 
                  key={role.id}
                  className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700/60 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        {role.id === "role-einkauf" || role.name.toLowerCase() === "einkauf" ? (
                          <ShoppingBag className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                        ) : role.id === "role-schichtplanung" || role.name.toLowerCase() === "schichtplanung" ? (
                          <Calendar className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Shield className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                        )}
                        <h4 className="text-sm font-bold text-white font-display uppercase tracking-wide truncate">
                          {role.name}
                        </h4>
                      </div>

                      {isAdmin && !isCoreRole && (
                        <button
                          onClick={() => setConfirmRoleDelete({ roleId: role.id, roleName: role.name })}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-950/20 border border-transparent hover:border-rose-900/10 transition cursor-pointer"
                          title="Rolle löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Meta explanatory label depending on function name */}
                    {(role.id === "role-einkauf" || role.name.toLowerCase() === "einkauf") && (
                      <p className="text-[11px] text-amber-400/80 leading-relaxed font-semibold">
                        📦 Erhält automatische Push-Nachrichten bei neuen Materialbestellungen.
                      </p>
                    )}
                    {(role.id === "role-schichtplanung" || role.name.toLowerCase() === "schichtplanung") && (
                      <p className="text-[11px] text-emerald-400/80 leading-relaxed font-semibold">
                        📅 Hauptverantwortlich für die Dienstplaneinteilungen und Schichtfreigaben.
                      </p>
                    )}
                  </div>

                  {/* Selector Block */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Zuweisung ändern
                    </label>
                    <div className="relative">
                      <select
                        disabled={!isAdmin}
                        value={role.user_id || ""}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          const selectedHelper = users.find((u) => u.id === val);
                          const helperName = selectedHelper ? `${selectedHelper.first_name} ${selectedHelper.last_name}` : "Nicht zugewiesen";
                          
                          setConfirmRoleUpdate({
                            roleId: role.id,
                            roleName: role.name,
                            newUserId: val,
                            newUserName: helperName
                          });
                        }}
                        className={`w-full text-xs px-3 py-2 border rounded-xl select-none font-mono transition ${
                          isAdmin 
                            ? "border-slate-800 bg-slate-950 text-slate-200 cursor-pointer hover:border-slate-700 focus:border-cyan-500 focus:ring-0" 
                            : "border-slate-850 bg-slate-900/50 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <option value="">-- Nicht zugewiesen --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.display_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Assigned Person visual block */}
                  {assignedUser && (
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40 flex items-center space-x-2.5 animate-fade-in mt-1.5">
                      <div className="h-7 w-7 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase font-mono shadow-inner">
                        {assignedUser.first_name[0]}{assignedUser.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-200 truncate leading-none">
                          {assignedUser.first_name} {assignedUser.last_name}
                        </p>
                        <p className="text-[9px] text-emerald-400 font-mono font-semibold mt-0.5 leading-none">
                          ID: {assignedUser.display_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write / Edit Modal for Helper Profiles */}
      <PersonFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingUser={editingUser}
        onAddUser={onAddUser}
        onUpdateUser={onUpdateUser}
        onShowAlert={(title, message) => setAlertState({ isOpen: true, title, message })}
      />

      {/* DELETE HELPER CONFIRMATION */}
      <ConfirmDialog
        id="delete-people-confirm-dialog"
        isOpen={deleteConfirm.isOpen}
        title="Person löschen?"
        message={
          <>
            Möchten Sie <strong className="text-white font-semibold">{deleteConfirm.name}</strong> wirklich löschen? Alle entsprechenden Schichten-Zuweisungen gehen verloren.
          </>
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: "", name: "" })}
      />

      {/* CONFIRM ROLE UPDATE MODAL */}
      <ConfirmDialog
        id="confirm-role-update-dialog"
        isOpen={confirmRoleUpdate !== null}
        variant="info"
        title="Zuweisung ändern?"
        message={
          confirmRoleUpdate && (
            <>
              Möchten Sie die Rolle <strong className="text-white font-bold">"{confirmRoleUpdate.roleName}"</strong> der Person{" "}
              <strong className="text-emerald-400 font-bold">"{confirmRoleUpdate.newUserName}"</strong> zuweisen?
            </>
          )
        }
        confirmLabel="Ja, Zuordnen"
        cancelLabel="Nein, Abbrechen"
        onConfirm={async () => {
          if (!confirmRoleUpdate) return;
          try {
            await onUpdateRole(confirmRoleUpdate.roleId, { user_id: confirmRoleUpdate.newUserId });
            setConfirmRoleUpdate(null);
          } catch (err) {
            console.error(err);
            setConfirmRoleUpdate(null);
            setAlertState({
              isOpen: true,
              title: "Systemfehler",
              message: "Die Änderung konnte nicht gespeichert werden."
            });
          }
        }}
        onCancel={() => setConfirmRoleUpdate(null)}
      />

      {/* CONFIRM ROLE DELETE MODAL */}
      <ConfirmDialog
        id="confirm-role-delete-dialog"
        isOpen={confirmRoleDelete !== null}
        title="Rolle löschen?"
        message={
          confirmRoleDelete && (
            <>
              Möchten Sie die funktionale Rolle <strong className="text-white font-bold">"{confirmRoleDelete.roleName}"</strong> wirklich dauerhaft löschen?
            </>
          )
        }
        cancelLabel="Nein, Abbrechen"
        onConfirm={() => {
          if (!confirmRoleDelete) return;
          const { roleId, roleName } = confirmRoleDelete;
          setConfirmRoleDelete(null);
          scheduleDelete(roleId, roleName, async () => {
            try {
              await onDeleteRole(roleId);
            } catch (err) {
              console.error(err);
              setAlertState({
                isOpen: true,
                title: "Systemfehler",
                message: "Die Rolle konnte nicht gelöscht werden."
              });
            }
          });
        }}
        onCancel={() => setConfirmRoleDelete(null)}
      />

      {/* ALERT DIALOG */}
      <ConfirmDialog
        id="alert-people-dialog"
        isOpen={alertState.isOpen}
        variant="info"
        title={alertState.title || "Hinweis"}
        message={alertState.message}
        onCancel={() => setAlertState({ isOpen: false, message: "" })}
      />
      <UndoToast toast={activeToast} onUndo={undo} />
    </div>
  );
}
