import React from "react";
import { ShieldCheck, ShieldAlert, User as UserIcon, Search } from "lucide-react";
import { User } from "../types";
import ConfirmDialog from "./ConfirmDialog";

type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

interface AccessRoleManagerProps {
  users: User[];
  onUpdateAccessRole: (id: string, role: AccessRole) => Promise<void>;
}

const ROLE_LABEL: Record<AccessRole, string> = {
  helfer: "Helfer*in",
  bereichsleiter: "Bereichsleitung",
  lagerleitung: "Lagerleitung",
};

const ROLE_DESCRIPTION: Record<AccessRole, string> = {
  helfer: "Alltagsfunktionen: eigene Schichten, Programm, Bestellliste anfragen.",
  bereichsleiter: "Zusätzlich: Schichten/Dienste/Gemeinden verwalten, Bestellungen bearbeiten.",
  lagerleitung: "Voller Zugriff: Personen, Rollen, Lagerverwaltung, Backup.",
};

export default function AccessRoleManager({ users, onUpdateAccessRole }: AccessRoleManagerProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  // Zugriffsrolle wirkt sich stark auf das aus, was jemand sehen/tun darf -
  // bisher änderte ein einziger Klick auf das Dropdown die Rolle sofort ohne
  // jede Rückfrage. Anders als bei Löschungen passt hier ein Bestätigungs-
  // dialog besser als ein nachträgliches Undo-Toast: die Rolle soll gar nicht
  // erst versehentlich wechseln, statt hinterher wieder zurückgedreht zu werden.
  const [pendingChange, setPendingChange] = React.useState<{
    userId: string;
    role: AccessRole;
    currentRole: AccessRole;
    displayName: string;
  } | null>(null);

  const filteredUsers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users
      .filter((u) => !term || u.display_name.toLowerCase().includes(term) || (u.role || "").toLowerCase().includes(term))
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));
  }, [users, searchTerm]);

  const lagerleitungCount = users.filter((u) => (u as any).access_role === "lagerleitung").length;

  const handleSelectChange = (userId: string, role: AccessRole, currentRole: AccessRole, displayName: string) => {
    if (role === currentRole) return;
    setPendingChange({ userId, role, currentRole, displayName });
  };

  const handleConfirmChange = async () => {
    if (!pendingChange) return;
    const { userId, role, currentRole, displayName } = pendingChange;
    setPendingChange(null);

    // Verhindert versehentliches Aussperren: letzte verbleibende Lagerleitung kann sich nicht selbst degradieren.
    if (currentRole === "lagerleitung" && role !== "lagerleitung" && lagerleitungCount <= 1) {
      setErrorMsg(`${displayName} ist aktuell die einzige Lagerleitung. Weise zuerst einer anderen Person die Rolle Lagerleitung zu, bevor du diese hier änderst.`);
      return;
    }
    setErrorMsg(null);
    setSavingId(userId);
    try {
      await onUpdateAccessRole(userId, role);
    } catch (err: any) {
      setErrorMsg(err?.message || "Rolle konnte nicht geändert werden.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="access-role-manager">
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" /> Zugriffsrollen verwalten
        </h4>
        <p className="text-xs text-slate-400">
          Legt fest, was eine Person in der App sehen und tun darf. Änderungen wirken sofort beim nächsten Laden der Person.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300">{errorMsg}</p>
        </div>
      )}

      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-emerald-500/70" />
        </span>
        <input
          type="text"
          placeholder="Person suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-800 focus:border-cyan-500 focus:ring-0 rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-500"
          id="search-access-role-input"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs text-slate-400">Keine Personen gefunden.</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const currentRole: AccessRole = ((u as any).access_role || "helfer") as AccessRole;
            const isSaving = savingId === u.id;
            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.display_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{u.role || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:w-72 shrink-0">
                  <select
                    value={currentRole}
                    disabled={isSaving}
                    onChange={(e) => handleSelectChange(u.id, e.target.value as AccessRole, currentRole, u.display_name)}
                    className={`w-full text-xs px-3 py-2 border rounded-xl bg-slate-950/65 font-mono focus:ring-0 ${
                      currentRole === "lagerleitung"
                        ? "border-emerald-500/40 text-emerald-400"
                        : currentRole === "bereichsleiter"
                        ? "border-cyan-500/30 text-cyan-300"
                        : "border-slate-800 text-slate-300"
                    } ${isSaving ? "opacity-50" : ""}`}
                    id={`access-role-select-${u.id}`}
                  >
                    <option value="helfer">Helfer*in</option>
                    <option value="bereichsleiter">Bereichsleitung</option>
                    <option value="lagerleitung">Lagerleitung</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["helfer", "bereichsleiter", "lagerleitung"] as AccessRole[]).map((role) => (
          <div key={role} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[11px] font-bold text-slate-300 font-mono uppercase tracking-wider">{ROLE_LABEL[role]}</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{ROLE_DESCRIPTION[role]}</p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        id="access-role-confirm-dialog"
        isOpen={!!pendingChange}
        variant="info"
        title="Zugriffsrolle ändern?"
        message={
          pendingChange && (
            <span>
              Soll <strong className="text-white font-semibold">{pendingChange.displayName}</strong> wirklich von{" "}
              <strong className="text-white font-semibold">{ROLE_LABEL[pendingChange.currentRole]}</strong> auf{" "}
              <strong className="text-white font-semibold">{ROLE_LABEL[pendingChange.role]}</strong> geändert werden?
            </span>
          )
        }
        confirmLabel="Ja, Rolle ändern"
        onConfirm={handleConfirmChange}
        onCancel={() => setPendingChange(null)}
      />
    </div>
  );
}
