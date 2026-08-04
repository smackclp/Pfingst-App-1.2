import React from "react";
import { AlertCircle, Chrome, Compass, Info } from "lucide-react";

/**
 * Statische Anleitung zum Aufheben einer blockierten Benachrichtigungs-
 * Berechtigung, je Browser. Wird nur gezeigt, wenn browserPermission === "denied".
 * Extrahiert aus AlertsView.tsx (Abschnitt 2).
 */
export default function AlertsBrowserGuide() {
  return (
    <div className="tech-panel p-5 md:p-6 rounded-2xl border-2 border-rose-500/20 bg-rose-950/10 space-y-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-450 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-white">
            Warum steht bei mir "Blockiert ✕" und wie behebe ich das?
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            Sobald man einmal versehentlich auf <b>"Blockieren"</b> oder <b>"Nein"</b> im Browser-Popup geklickt hat, verbieten Webbrowser der Website aus Sicherheitsgründen, dich erneut danach zu fragen. Du musst die Blockierung <b>manuell aufheben</b>.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">
          Anleitung zur Freischaltung auf deinen Geräten:
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Google Chrome & Android */}
          <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-900 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Chrome className="h-4 w-4" />
              <span className="font-extrabold text-xs">Google Chrome (PC & Android)</span>
            </div>
            <ol className="list-decimal pl-4.5 space-y-1 text-slate-350 text-[11px] leading-relaxed">
              <li>Klicke ganz oben links in der Adressleiste auf das <b>Schieberegler-Symbol</b> oder das kleine <b>Schloss-Symbol</b> direkt links neben der Internetadresse (URL).</li>
              <li>Aktiviere dort den Schalter bei <b>"Benachrichtigungen"</b> (auf Erlauben stellen).</li>
              <li>Sollte der Schalter dort fehlen, klicke auf <b>"Website-Einstellungen"</b> und setze "Benachrichtigungen" auf "Zulassen".</li>
              <li>Lade die Seite neu.</li>
            </ol>
          </div>

          {/* Safari / iOS / iPhone */}
          <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-900 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Compass className="h-4 w-4" />
              <span className="font-extrabold text-xs">Apple Safari (iPhone / iOS)</span>
            </div>
            <p className="text-slate-300 text-[11px] font-semibold leading-relaxed">
              *Wichtig für iPhones:* iOS erlaubt Web-Push nur, wenn die App zum Homescreen hinzugefügt wurde!
            </p>
            <ol className="list-decimal pl-4.5 space-y-1 text-slate-350 text-[11px] leading-relaxed">
              <li>Tippe im Safari-Browser unten auf das <b>Teilen-Symbol</b> (Viereck mit Pfeil nach oben).</li>
              <li>Tippe auf <b>"Zum Home-Bildschirm"</b> und öffne die neu erstellte App von deinem Startbildschirm.</li>
              <li>Gehe in die iOS <b>"Einstellungen" → "Mitteilungen" → "Dienstplan"</b> und stelle sicher, dass Mitteilungen erlaubt sind.</li>
            </ol>
          </div>

          {/* Firefox */}
          <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-900 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
              💬 <span className="font-extrabold text-xs">Mozilla Firefox (PC & Mobile)</span>
            </div>
            <ol className="list-decimal pl-4.5 space-y-1 text-slate-350 text-[11px] leading-relaxed">
              <li>Klicke links in der Adressleiste auf das kleine <b>Sprechblasen-Symbol</b> oder das Schloss-Symbol.</li>
              <li>Entferne die Blockierung durch Klick auf das <b>"X"-Symbol</b> neben "Blockiert".</li>
              <li>Lade die Seite neu und klicke oben auf "Popups aktivieren".</li>
            </ol>
          </div>

          {/* Windows Edge */}
          <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-900 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
              🌐 <span className="font-extrabold text-xs">Microsoft Edge</span>
            </div>
            <ol className="list-decimal pl-4.5 space-y-1 text-slate-350 text-[11px] leading-relaxed">
              <li>Klicke auf das <b>Schloss-Symbol</b> links neben der Internetadresse.</li>
              <li>Stelle im Dropdown-Menü "Berechtigungen für diese Website" die Benachrichtigungen auf <b>Zulassen</b>.</li>
              <li>Seite neu laden und Test-Alarm senden!</li>
            </ol>
          </div>
        </div>

        <div className="text-[11px] text-amber-450 text-amber-400 bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl mt-2 flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <b>Tipp:</b> Sobald du die Erlaubnis in den Geräteeinstellungen deines Browsers erteilt hast, verschwindet die rote "Blockiert"-Warnung und verwandelt sich in ein grünes "Aktiviert"!
          </span>
        </div>
      </div>
    </div>
  );
}
