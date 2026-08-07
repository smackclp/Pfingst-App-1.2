import React from "react";
import { AlertTriangle } from "lucide-react";
import { reportClientError } from "../lib/errorReporting";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Fängt Render-Fehler irgendwo im Komponentenbaum ab, die sonst die
 * komplette App auf einen weißen Bildschirm ohne jede Meldung abstürzen
 * lassen würden (siehe AUDIT.md, "Fehler-Monitoring"). Zeigt stattdessen
 * eine freundliche Meldung mit Neu-laden-Button und meldet den Fehler ans
 * Backend, statt ihn nur in der (für Nutzer unsichtbaren) Browser-Konsole
 * verschwinden zu lassen.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Das Projekt hat kein @types/react installiert (nur JS-Typen via
  // impliziertem "any"), wodurch TypeScript die von React.Component
  // ererbten Felder "props"/"state" hier nicht automatisch erkennt -
  // deshalb explizit redeklariert ("declare" = zur Laufzeit von der
  // echten React-Basisklasse bereitgestellt, hier nur für den Typchecker).
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Unbehandelter Render-Fehler:", error);
    reportClientError(error.message, error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/20 rounded-2xl shadow-2xl p-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-rose-950/40 border border-rose-900/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-rose-500" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-sm font-bold text-white font-display">Etwas ist schiefgelaufen</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Die App ist auf einen unerwarteten Fehler gestoßen. Das Team wurde automatisch benachrichtigt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition cursor-pointer"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
