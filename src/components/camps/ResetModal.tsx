import React from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";

interface ResetModalProps {
  isOpen: boolean;
  mode: "full" | "shifts_only" | "clear_assignments";
  year: number;
  submitting: boolean;
  onYearChange: (year: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ResetModal({
  isOpen,
  mode,
  year,
  submitting,
  onYearChange,
  onConfirm,
  onClose,
}: ResetModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80 animate-fade-in" id="reset-modal-overlay">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-2xl overflow-hidden shadow-2xl space-y-6 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                {mode === "full" ? "Vollständiger Datenbank-Reset" : mode === "shifts_only" ? "Standard-Muster einspielen" : "Zuweisungen zurücksetzen"}
              </h3>
              <p className="text-[10px] text-slate-400">Sicherheitsabfrage vor Ausführung</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300 font-sans leading-relaxed">
          {mode === "full" && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/20 rounded-xl text-rose-200">
              <p className="font-bold">⚠️ Achtung: Vollständiger Reset!</p>
              <p className="mt-1">
                Alle aktuellen Benutzer, Schichten, Dienste, Materialien und Zuordnungen werden unwiderruflich durch die werkseitigen Beispieldaten (Muster-Helfer Maria, Jonas, etc.) ersetzt.
              </p>
            </div>
          )}

          {mode === "shifts_only" && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-emerald-200">
              <p className="font-bold"> Standard-Schichten für ein Zieljahr einspielen:</p>
              <p className="mt-1">
                Aktiviert das Standard-Muster (Küche, Technik, Nachtwache) für das gewählte Zieljahr. Deine Helfer-Accounts bleiben vollständig erhalten!
              </p>
            </div>
          )}

          {mode === "clear_assignments" && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-amber-200">
              <p className="font-bold">🧹 Zuweisungen leeren:</p>
              <p className="mt-1">
                Entfernt alle Helfer*innen aus den Schichten. Schichten, Dienste und Personen bleiben erhalten. Ideal zur Vorbereitung der Einteilungen!
              </p>
            </div>
          )}

          {mode === "shifts_only" && (
            <div className="space-y-1 pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Zieljahr für Schicht-Muster:</label>
              <select
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-slate-800 rounded-xl focus:outline-none bg-slate-950 text-white font-medium"
              >
                {[2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    Pfingstlager {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-xl transition cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              mode === "full"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : mode === "shifts_only"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-amber-600 hover:bg-amber-500 text-white"
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Ausführen...</span>
              </>
            ) : (
              <span>Bestätigen & Ausführen</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
