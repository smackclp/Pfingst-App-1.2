import React from "react";
import { X } from "lucide-react";
import { User } from "../types";
import FieldError from "./FieldError";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: User | null;
  onAddUser: (user: Omit<User, "id">) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
  onShowAlert: (title: string, message: string) => void;
}

export default function PersonFormModal({
  isOpen,
  onClose,
  editingUser,
  onAddUser,
  onUpdateUser,
  onShowAlert,
}: PersonFormModalProps) {
  // Form states
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState("Teamer");
  const [active, setActive] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  const [isBuyer, setIsBuyer] = React.useState(false);
  const [isErrorMonitor, setIsErrorMonitor] = React.useState(false);
  const [errors, setErrors] = React.useState<{ firstName?: string; lastName?: string; displayName?: string }>({});

  // Populate when editingUser changes
  React.useEffect(() => {
    if (editingUser) {
      setFirstName(editingUser.first_name);
      setLastName(editingUser.last_name);
      setDisplayName(editingUser.display_name);
      setEmail(editingUser.email || "");
      setPhone(editingUser.phone || "");
      setRole(editingUser.role);
      setActive(editingUser.active);
      setNotes(editingUser.notes || "");
      setIsBuyer(!!editingUser.is_buyer);
      setIsErrorMonitor(!!editingUser.is_error_monitor);
    } else {
      setFirstName("");
      setLastName("");
      setDisplayName("");
      setEmail("");
      setPhone("");
      setRole("Teamer");
      setActive(true);
      setNotes("");
      setIsBuyer(false);
      setIsErrorMonitor(false);
    }
    setErrors({});
  }, [editingUser, isOpen]);

  // Auto-fill Display Name
  React.useEffect(() => {
    if (!editingUser) {
      if (firstName && lastName) {
        setDisplayName(`${firstName} ${lastName.substring(0, 1)}.`);
      } else if (firstName) {
        setDisplayName(firstName);
      }
    }
  }, [firstName, lastName, editingUser]);

  const titleId = React.useId();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!firstName.trim()) newErrors.firstName = "Bitte Vorname eingeben.";
    if (!lastName.trim()) newErrors.lastName = "Bitte Nachname eingeben.";
    if (!displayName.trim()) newErrors.displayName = "Bitte Anzeigename eingeben.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const payload = {
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      email,
      phone,
      role,
      active,
      notes,
      is_buyer: isBuyer,
      is_error_monitor: isErrorMonitor,
    };

    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, payload);
      } else {
        await onAddUser(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      onShowAlert("Fehler beim Speichern", "Fehler beim Speichern der Person.");
    }
  };

  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in"
      id="people-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="backdrop-blur-md bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden my-8">
        <div className="bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <h3 id={titleId} className="font-bold text-sm tracking-tight text-white font-mono">
            {editingUser ? "📟 MITARBEITER_PROFIL_EDIT" : "📟 NEUE_PERSON_ANLEGEN"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Vorname *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setErrors((prev) => ({ ...prev, firstName: undefined }));
                }}
                className={`w-full text-xs p-2.5 bg-slate-950 border rounded-xl focus:outline-none focus:border-cyan-500/40 text-slate-100 placeholder-slate-700 font-medium ${
                  errors.firstName ? "border-rose-500/60" : "border-slate-800"
                }`}
                placeholder="z. B. Christian"
              />
              <FieldError message={errors.firstName} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nachname *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setErrors((prev) => ({ ...prev, lastName: undefined }));
                }}
                className={`w-full text-xs p-2.5 bg-slate-950 border rounded-xl focus:outline-none focus:border-cyan-500/40 text-slate-100 placeholder-slate-700 font-medium ${
                  errors.lastName ? "border-rose-500/60" : "border-slate-800"
                }`}
                placeholder="z. B. Beck"
              />
              <FieldError message={errors.lastName} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between tracking-wider font-mono">
              <span>Anzeigename im Kalender *</span>
              <span className="text-[9px] text-emerald-400 font-normal">Autofill Aktiv</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setErrors((prev) => ({ ...prev, displayName: undefined }));
              }}
              className={`w-full text-xs p-2.5 bg-slate-950 border rounded-xl focus:outline-none focus:border-cyan-500/40 text-slate-100 placeholder-slate-700 font-medium ${
                errors.displayName ? "border-rose-500/60" : "border-slate-800"
              }`}
              placeholder="z. B. Christian B."
            />
            <FieldError message={errors.displayName} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Rolle / Position</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-slate-100 font-medium font-mono"
              >
                <option value="Teamer" className="bg-slate-950 text-white">Teamer</option>
                <option value="HV" className="bg-slate-950 text-white">HV (Schichtleiter)</option>
                <option value="Kitchen Staff" className="bg-slate-950 text-white">Küchen-Crew</option>
                <option value="Leiter" className="bg-slate-950 text-white">Leitung / Orga</option>
                <option value="Pastor" className="bg-slate-950 text-white">Pastor</option>
                <option value="Techniker" className="bg-slate-950 text-white">Techniker</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Zeltlager Status & Rolle</label>
              <div className="flex flex-col space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="user-active-checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-800 rounded"
                  />
                  <label htmlFor="user-active-checkbox" className="text-xs text-slate-300 font-semibold select-none cursor-pointer">
                    Aktiv im Lager
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="user-buyer-checkbox"
                    checked={isBuyer}
                    onChange={(e) => setIsBuyer(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-800 rounded"
                  />
                  <label htmlFor="user-buyer-checkbox" className="text-xs text-slate-300 font-semibold select-none cursor-pointer flex items-center gap-1.5">
                    Ist Einkäufer 📦 <span className="text-[9px] font-normal text-amber-400 font-mono">(erhält Push)</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="user-error-monitor-checkbox"
                    checked={isErrorMonitor}
                    onChange={(e) => setIsErrorMonitor(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-800 rounded"
                  />
                  <label htmlFor="user-error-monitor-checkbox" className="text-xs text-slate-300 font-semibold select-none cursor-pointer flex items-center gap-1.5">
                    Erhält Fehler-Alerts ⚠️ <span className="text-[9px] font-normal text-amber-400 font-mono">(erhält Push)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">E-Mail (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-slate-100 placeholder-slate-700 font-medium"
              placeholder="name@zeltlager.de"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Telefonnummer (optional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-slate-100 placeholder-slate-700 font-medium font-mono"
              placeholder="+49 (0) 170 1234567"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Interne Notizen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-slate-100 placeholder-slate-700 font-medium"
              placeholder="Besonderheiten, Einschränkungen oder Zeltnummer..."
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-mono font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              {editingUser ? "Änderungen sichern" : "Mitarbeiter anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
