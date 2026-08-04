import React from "react";
import { RefreshCw, Smartphone, Trash2 } from "lucide-react";
import { isInsideIframe } from "../utils";
import type { ServiceWorkerStatus } from "../hooks/useServiceWorkerStatus";

interface AlertsServiceWorkerSectionProps {
  swStatus: ServiceWorkerStatus;
  subStatus: "idle" | "registering" | "success" | "error";
  subMessage: string;
  browserPermission: string;
  onForceRegisterPush: () => void;
  onForceUnsubscribePush: () => void;
}

/** Abschnitt 3: Offline-/PWA-Status, Service-Worker-Live-Diagnose, Push-Abo verwalten. */
export default function AlertsServiceWorkerSection({
  swStatus,
  subStatus,
  subMessage,
  browserPermission,
  onForceRegisterPush,
  onForceUnsubscribePush,
}: AlertsServiceWorkerSectionProps) {
  return (
    <div className="tech-panel p-5 md:p-6 rounded-2xl border border-emerald-500/10 space-y-4">
      <h3 className="text-sm font-extrabold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
        <Smartphone className="h-4.5 w-4.5 text-emerald-400" /> 2. Offline-Fähigkeit & PWA Live-Status
      </h3>

      <p className="text-slate-350 text-xs leading-relaxed">
        Auf Zeltlagerplätzen ist der Netzempfang oft miserabel. Unsere <b>Service Worker Technologie</b> speichert deinen Dienstplan vollständig im lokalen Gerätespeicher deines Handys ab, damit du jederzeit darauf zugreifen kannst.
      </p>

      {/* LIVE SYSTEM STATUS PANEL requested by user */}
      <div className="p-4 bg-slate-950/65 rounded-xl border border-emerald-500/15 space-y-3">
        <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider uppercase block">
          🛠️ SERVICE WORKER LIVE-STATUS & DIAGNOSE
        </span>

        {isInsideIframe() && (
          <div id="iframe-warning-banner" className="p-3 bg-amber-950/50 border border-amber-500/30 text-amber-400 rounded-xl text-xs space-y-1.5 leading-normal">
            <div className="font-bold flex items-center gap-1.5 text-amber-300">
              <span className="animate-pulse">⚠️</span> iFrame-Vorschauspursperre aktiv!
            </div>
            <p className="text-[11px] text-slate-300">
              Du schaust dir die App gerade in einer <b>iFrame-Vorschau</b> an.
              Mobilgeräte (insbesondere Android-Chrome) verbieten aus Sicherheitsgründen die Registrierung von
              Service-Workern & Push-Diensten innerhalb eingebetteter Frames.
            </p>
            <p className="font-bold text-[11px] text-amber-200">
              💡 Lösung: Klicke oben rechts auf das Icon für "In neuem Tab öffnen" (oder rufe die geteilte URL direkt auf deinem Handy auf), um das Push-Abo & PWA-Hintergrunddienste fehlerfrei zu nutzen!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Registrierungs-Status */}
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 block font-mono">REGISTRIERUNG:</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-200">
              <span className={`h-2 w-2 rounded-full ${swStatus.registered ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span>{swStatus.state}</span>
            </div>
          </div>

          {/* Controller Status */}
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 block font-mono">SEITEN-STEUERUNG (CONTROLLER):</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-200">
              <span className={`h-2 w-2 rounded-full ${swStatus.controllerPresent ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span>{swStatus.controllerPresent ? "Ja (aktiv gesteuert)" : "Nein (nicht steuernd)"}</span>
            </div>
          </div>
        </div>

        {/* Live SW Message Ping-Pong */}
        <div className="bg-slate-900/40 px-3 py-2.5 rounded-lg border border-slate-850/70 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">PWA HINTERGRUND-DIAGNOSE:</span>
          <span
            className={`font-bold uppercase ${
              swStatus.pingStatus === "connected"
                ? "text-emerald-400"
                : swStatus.pingStatus === "checking"
                ? "text-amber-400 animate-pulse"
                : "text-rose-400"
            }`}
          >
            {swStatus.pingStatus === "connected" ? "✓ KANAL AKTIV" : swStatus.pingStatus === "checking" ? "PING..." : "INAKTIV - RESTART"}
          </span>
        </div>

        <p className="text-[10.5px] text-slate-400 font-mono italic leading-normal">
          <b>Hintergrund-Nachricht:</b> {swStatus.pingMessage}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60 mt-2">
        <span className="text-[10px] bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-md text-slate-300 block">
          Offline-Modus: <b>Automatisch aktiv ✓</b>
        </span>
        <span className="text-[10px] bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-md text-slate-300 block">
          Strategie: <b>Network-First mit local Cache-Fallback</b>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold hover:text-white transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
          Dienstplan-Cache jetzt aktualisieren
        </button>

        <button
          onClick={onForceRegisterPush}
          disabled={subStatus === "registering" || browserPermission !== "granted"}
          className="px-4 py-2 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/25 disabled:border-slate-800 disabled:bg-slate-900 disabled:opacity-50 text-xs font-semibold rounded-xl hover:text-white transition flex items-center gap-3 cursor-pointer disabled:cursor-not-allowed"
        >
          <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
          {subStatus === "registering" ? "Registriere..." : "Push-Abo registrieren (Android Fix)"}
        </button>

        <button
          onClick={onForceUnsubscribePush}
          disabled={subStatus === "registering"}
          className="px-4 py-2 bg-rose-950/20 hover:bg-rose-950/45 border border-rose-500/20 disabled:border-slate-800 disabled:bg-slate-900 disabled:opacity-50 text-xs font-semibold rounded-xl text-rose-400 hover:text-rose-100 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          Abo deaktivieren & cleanen
        </button>
      </div>

      {subMessage && (
        <div
          className={`text-[11px] p-3 rounded-lg border font-mono w-full ${
            subStatus === "success"
              ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400"
              : subStatus === "error"
              ? "bg-rose-950/30 border-rose-500/20 text-rose-400"
              : "bg-slate-900/60 border-slate-800 text-slate-300"
          }`}
        >
          <b>Status:</b> {subMessage}
        </div>
      )}
    </div>
  );
}
