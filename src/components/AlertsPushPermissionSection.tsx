import React from "react";
import { Bell, Info } from "lucide-react";
import { isInsideIframe } from "../utils";

interface AlertsPushPermissionSectionProps {
  browserPermission: string;
  onRequestPermission: () => void;
}

/** Abschnitt 1: Browser-Push-Berechtigungsstatus + Anfordern-Button. */
export default function AlertsPushPermissionSection({ browserPermission, onRequestPermission }: AlertsPushPermissionSectionProps) {
  return (
    <div className="tech-panel p-5 md:p-6 rounded-2xl border border-emerald-500/10 space-y-4">
      <h3 className="text-sm font-extrabold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
        <Bell className="h-4.5 w-4.5 text-emerald-400" /> 1. Browser Push-Benachrichtigungen
      </h3>
      <p className="text-slate-350 text-xs leading-relaxed">
        Erhalte kleine Web-Pushups direkt auf deinem Gerät (Computer, Android oder iOS), sobald du einer neuen Schicht zugeordnet wirst, sich deine Dienstzeiten verschieben oder die Leitung dich kurzfristig umträgt.
      </p>

      <div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-slate-950/45 rounded-xl border border-slate-850">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-550 text-slate-500 font-mono">BERECHTIGUNGS-STATUS</span>
          <p className="text-xs font-extrabold text-white">
            {browserPermission === "granted" ? (
              <span className="text-emerald-400 flex items-center gap-1.5">✓ Erteilt (Aktiviert) 👍</span>
            ) : browserPermission === "denied" ? (
              <span className="text-rose-450 flex items-center gap-1.5">✕ Blockiert (Bitte in den Browser-Einstellungen erlauben)</span>
            ) : (
              <span className="text-slate-400">Noch nicht angefordert (Neutral)</span>
            )}
          </p>
        </div>

        {browserPermission !== "granted" && (
          <button
            onClick={onRequestPermission}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Popups aktivieren
          </button>
        )}
      </div>

      {isInsideIframe() && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-4.5 rounded-2xl flex items-start gap-3 mt-3 animate-pulse" id="alert-iframe-warn-box">
          <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 flex-none" />
          <div className="space-y-1.5 leading-relaxed">
            <p className="font-bold text-white uppercase text-[10px] font-mono tracking-wider text-amber-400">⚠️ WICHTIGER DIAGNOSE-HINWEIS FÜR DIE VORSCHAU:</p>
            <p>
              Du nutzt die App gerade <b>innerhalb des AI Studio Vorschauframes (Iframe)</b>. Aus Sicherheitsgründen blockieren Chrome, Safari & Co. die tatsächliche optische Anzeige von Pushups in solchen eingebetteten Frames!
            </p>
            <p className="font-bold text-white text-[11px]">
              👉 Klicke oben rechts im AI Studio auf den Button <span className="underline text-emerald-400 font-bold select-all">"In neuem Tab öffnen"</span> oder öffne den Shared-Link auf deinem Smartphone-Browser. Nur dort können der Service-Worker und echte Benachrichtigungen abgespielt werden!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
