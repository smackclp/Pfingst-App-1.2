import React from "react";
import { X } from "lucide-react";
import { Service, Shift } from "../types";
import { formatDateGerman as formatDateGermanUtil, sortAlphabetically } from "../utils";
import FieldError from "./FieldError";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  startDate: string;
  sunDate: string;
  endDate: string;
  onAddShift: (shift: Omit<Shift, "id">) => Promise<void>;
  onShowAlert: (title: string, message: string) => void;
}

export default function ShiftFormModal({
  isOpen,
  onClose,
  services,
  startDate,
  sunDate,
  endDate,
  onAddShift,
  onShowAlert,
}: ShiftFormModalProps) {
  const [shiftServiceId, setShiftServiceId] = React.useState("");
  const [shiftDate, setShiftDate] = React.useState(startDate);
  const [shiftStart, setShiftStart] = React.useState("12:00");
  const [shiftEnd, setShiftEnd] = React.useState("14:00");
  const [shiftNotes, setShiftNotes] = React.useState("");
  const [errors, setErrors] = React.useState<{ shiftServiceId?: string; shiftDate?: string; shiftStart?: string; shiftEnd?: string }>({});

  React.useEffect(() => {
    setShiftDate(startDate);
    setErrors({});
  }, [startDate, isOpen]);

  React.useEffect(() => {
    if (services.length > 0 && !shiftServiceId) {
      setShiftServiceId(services[0].id);
    }
  }, [services, shiftServiceId, isOpen]);

  const titleId = React.useId();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!shiftServiceId) newErrors.shiftServiceId = "Bitte einen Dienst auswählen.";
    if (!shiftDate) newErrors.shiftDate = "Bitte ein Datum auswählen.";
    if (!shiftStart) newErrors.shiftStart = "Bitte eine Startzeit angeben.";
    if (!shiftEnd) newErrors.shiftEnd = "Bitte eine Endzeit angeben.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      await onAddShift({
        service_id: shiftServiceId,
        date: shiftDate,
        start_time: shiftStart,
        end_time: shiftEnd,
        notes: shiftNotes
      });
      setShiftNotes("");
      onClose();
    } catch {
      onShowAlert("Systemfehler", "Fehler beim Erstellen der Schicht.");
    }
  };

  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in"
      id="shift-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="backdrop-blur-md bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden my-8 animate-fade-in">
        <div className="bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <h3 id={titleId} className="font-bold text-sm tracking-tight text-white font-mono">Schicht planen</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition" aria-label="Schließen">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleCreateShift} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Zugehöriger Dienst *</label>
            <select
              value={shiftServiceId}
              onChange={(e) => {
                setShiftServiceId(e.target.value);
                setErrors((prev) => ({ ...prev, shiftServiceId: undefined }));
              }}
              className={`w-full text-xs p-2.5 bg-slate-950 border rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium font-mono ${
                errors.shiftServiceId ? "border-rose-500/60" : "border-slate-800"
              }`}
            >
              {sortAlphabetically(services, (svc) => svc.title).map((svc) => (
                <option key={svc.id} value={svc.id} className="bg-slate-950 text-white">{svc.title}</option>
              ))}
            </select>
            <FieldError message={errors.shiftServiceId} />
          </div>

          <div className="space-y-1 animate-fade-in">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Datum der Ausführung *</label>
            <select
              value={shiftDate}
              onChange={(e) => {
                setShiftDate(e.target.value);
                setErrors((prev) => ({ ...prev, shiftDate: undefined }));
              }}
              className={`w-full text-xs p-2.5 bg-slate-950 border rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium font-mono ${
                errors.shiftDate ? "border-rose-500/60" : "border-slate-800"
              }`}
            >
              <option value={startDate} className="bg-slate-950 text-white font-mono">Samstag, {formatDateGermanUtil(startDate).replace("Sa, ", "")} (Anreisetag)</option>
              <option value={sunDate} className="bg-slate-950 text-white font-mono">Sonntag, {formatDateGermanUtil(sunDate).replace("So, ", "")} (Tag 2)</option>
              <option value={endDate} className="bg-slate-950 text-white font-mono">Montag, {formatDateGermanUtil(endDate).replace("Mo, ", "")} (Abreisetag)</option>
            </select>
            <FieldError message={errors.shiftDate} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Startzeit (HH:MM) *</label>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => {
                  setShiftStart(e.target.value);
                  setErrors((prev) => ({ ...prev, shiftStart: undefined }));
                }}
                className={`w-full text-xs p-2.5 bg-slate-950 border rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-mono ${
                  errors.shiftStart ? "border-rose-500/60" : "border-slate-800"
                }`}
              />
              <FieldError message={errors.shiftStart} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Endzeit (HH:MM) *</label>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => {
                  setShiftEnd(e.target.value);
                  setErrors((prev) => ({ ...prev, shiftEnd: undefined }));
                }}
                className={`w-full text-xs p-2.5 bg-slate-950 border rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-mono ${
                  errors.shiftEnd ? "border-rose-500/60" : "border-slate-800"
                }`}
              />
              <FieldError message={errors.shiftEnd} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Schicht-Aushang / Notizen (optional)</label>
            <input
              type="text"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium"
              placeholder="z. B. Grillkohle mitbringen, Wechselschicht"
            />
          </div>

          <div className="pt-4 border-t border-slate-850 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer font-mono"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-mono font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Schicht anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
