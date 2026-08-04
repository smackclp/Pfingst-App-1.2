import React from "react";
import { Check, RefreshCw, Send } from "lucide-react";

interface AlertsTestTriggerSectionProps {
  browserPermission: string;
  testingStatus: "idle" | "sending" | "success" | "error";
  onTriggerTest: () => void;
}

/** Abschnitt 4: Eigene Test-Benachrichtigung senden + Live-Diagnose. */
export default function AlertsTestTriggerSection({ browserPermission, testingStatus, onTriggerTest }: AlertsTestTriggerSectionProps) {
  return (
    <div className="tech-panel p-5 md:p-6 rounded-2xl border border-emerald-500/10 space-y-4">
      <h3 className="text-sm font-extrabold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
        <Send className="h-4.5 w-4.5 text-emerald-400" /> 3. Echtzeit-System live testen
      </h3>

      <p className="text-slate-300 text-xs leading-relaxed">
        Möchtest du testen, ob deine Benachrichtigungen funktionieren? Klicke auf den Button, um den Testlauf auf deinem Gerät zu simulieren und im Verlauf zu protokollieren.
      </p>

      {/* Detailed diagnostics panel for the user */}
      <div
        className={`p-4 rounded-xl border space-y-2.5 text-xs ${
          browserPermission === "granted" ? "bg-emerald-950/20 border-emerald-500/25 text-slate-300" : "bg-rose-950/10 border-rose-500/25 text-slate-300"
        }`}
      >
        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
          🔍 LIVE DIAGNOSE DEINES SMARTPHONES / GERÄTS:
        </span>

        <div className="space-y-1.5 leading-relaxed">
          <div>
            <span className="font-bold text-slate-200">1. Server loggt im Verlauf: </span>
            <span className="font-mono text-emerald-400 font-bold">✓ BEREIT (Eintragung klappt)</span>
          </div>

          <div>
            <span className="font-bold text-slate-200">2. Geräte-Pushup-Erlaubnis (Browser):</span>
            {browserPermission === "granted" ? (
              <span className="font-bold text-emerald-400"> ✓ AKTIVIERT (Browser darf Signale senden)</span>
            ) : browserPermission === "denied" ? (
              <span className="font-bold text-rose-400"> ✕ BLOCKIERT (Rechte entzogen oder blockiert)</span>
            ) : (
              <span className="font-bold text-amber-400"> ⚠️ INAKTIV (Nicht erlaubt - Bitte erst "Popups aktivieren" oben drücken)</span>
            )}
          </div>
        </div>

        {browserPermission !== "granted" && (
          <div className="bg-rose-950/45 p-3 rounded-lg border border-rose-500/15 space-y-1.5 mt-2 text-rose-200">
            <p className="font-extrabold text-white text-[11px]">💡 Handlungsbedarf für Android: Was ist hier los?</p>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Der Button unten wird nach dem Anklicken <b>"erfolgreich"</b> anzeigen. Das bedeutet aber *nur*, dass die Nachricht erfolgreich im Server-Verlauf (rechte Spalte) hinterlegt wurde.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-200 font-bold">Da die Browser-Erlaubnis blockiert oder inaktiv ist, kann dein Gerät KEIN Signal ausgeben!</p>
            <p className="text-[11px] leading-relaxed text-emerald-400 font-bold">
              👉 Stelle bitte sicher, dass du unter Punkt 1 "Popups aktivieren" gedrückt hast und dass Mitteilungen für diese Web-Adresse in den Chrome/Android-Systemeinstellungen freigegeben sind!
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onTriggerTest}
          disabled={testingStatus === "sending"}
          className={`px-5 py-3 ${
            testingStatus === "success"
              ? "bg-emerald-600 border border-emerald-400"
              : testingStatus === "error"
              ? "bg-rose-900 border border-rose-500"
              : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-500/10"
          } text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all text-center flex items-center gap-2 cursor-pointer`}
        >
          {testingStatus === "sending" ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Sende Test...
            </>
          ) : testingStatus === "success" ? (
            <>
              <Check className="h-3.5 w-3.5 animate-bounce" />
              Sendeauftrag erfolgreich! ✓
            </>
          ) : testingStatus === "error" ? (
            "Test fehlgeschlagen ✕"
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Jetzt Test-Benachrichtigung senden!
            </>
          )}
        </button>
      </div>

      {testingStatus === "success" && (
        <p className="text-[11.5px] font-mono text-emerald-400 font-semibold animate-fade-in bg-slate-950/40 p-2.5 rounded-lg border border-emerald-500/20 leading-relaxed">
          <b>Ergebnis:</b> Die Test-Mitteilung wurde generiert und in deinen <b>empfangenen Alerts (siehe rechte Box)</b> abgelegt. Falls du die Geräte-Erlaubnis erteilt hast, hat dein Smartphone zeitgleich vibriert bzw. ein Push-Fenster eingeblendet!
        </p>
      )}
    </div>
  );
}
