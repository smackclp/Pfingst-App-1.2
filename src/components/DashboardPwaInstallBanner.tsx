import React from "react";
import { Bell, Download, Smartphone, X } from "lucide-react";
import { isInsideIframe, safeStorage } from "../utils";
import { STORAGE_KEYS } from "../constants";
import ConfirmDialog from "./ConfirmDialog";

interface DashboardPwaInstallBannerProps {
  isStandalone: boolean;
  hideInstallBanner: boolean;
  onHideBanner: () => void;
  pwaInstallable: boolean;
  onTriggerPwaInstall?: () => void;
  onOpenPwaOnboarding?: () => void;
}

/** PWA-/Push-Installations-Hinweisbanner am Dashboard-Kopf. Extrahiert aus DashboardView.tsx. */
export default function DashboardPwaInstallBanner({
  isStandalone,
  hideInstallBanner,
  onHideBanner,
  pwaInstallable,
  onTriggerPwaInstall,
  onOpenPwaOnboarding,
}: DashboardPwaInstallBannerProps) {
  const [showInstallInstructions, setShowInstallInstructions] = React.useState(false);
  const pushGranted = typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted";
  // Nichts mehr zu tun (App installiert UND Push aktiv) oder manuell ausgeblendet -> Banner weg.
  if ((isStandalone && pushGranted) || hideInstallBanner) return null;

  return (
    <div
      className="md:hidden bg-gradient-to-r from-teal-950/40 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/30 p-5 rounded-2xl relative shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 animate-fade-in"
      id="pwa-install-alert-banner"
    >
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Smartphone className="h-32 w-32 text-emerald-400" />
      </div>

      <div className="space-y-2 flex-1 z-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-bold rounded-full uppercase">
            Offline-App & Push-Alarm ⛺
          </span>
          {isInsideIframe() && (
            <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-400 font-mono font-bold rounded-full uppercase animate-pulse">
              ⚠️ Vorschau-Iframe (Push blockiert)
            </span>
          )}
        </div>
        <h3 className="text-base font-black text-white tracking-tight font-display flex items-center gap-1.5 mt-1">
          <span>App auf dem Smartphone laden?</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-3xl">
          Füge die <b>Pfingstlager App</b> direkt zu deinem Startbildschirm (Homescreen) hinzu! Läuft blitzschnell im AMOLED-Design, funktioniert offline am Zeltplatz ohne Internetleitung und alarmiert dich sofort per Vibrations-Push bei Schichtwechseln!
        </p>

        {/* Diagnostics Panel */}
        <div className="flex flex-wrap gap-2 text-[10px] pt-1.5 font-mono text-slate-400">
          <span className="px-2 py-1 bg-slate-950/60 rounded border border-slate-800">
            PWA-Status:{" "}
            <span className={pwaInstallable ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {pwaInstallable ? "✓ Bereit zur Installation" : "Menü-Installation möglich"}
            </span>
          </span>
          <span className="px-2 py-1 bg-slate-950/60 rounded border border-slate-800">
            Echtzeit-Push:{" "}
            <span className={pushGranted ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {typeof window !== "undefined" && "Notification" in window
                ? pushGranted
                  ? "✓ Aktiviert"
                  : "🔔 Deaktiviert (Zulassen im Schritt 1)"
                : "Nicht unterstützt"}
            </span>
          </span>
          {isInsideIframe() && (
            <span className="text-amber-350 font-bold animate-pulse text-[9px]">
              👉 Tipp: Klicke oben rechts im Editor auf "In neuem Tab öffnen" für echten Android Push!
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch gap-2 shrink-0 z-10 w-full sm:w-auto">
        {onOpenPwaOnboarding && (
          <button
            onClick={onOpenPwaOnboarding}
            className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 text-xs font-bold font-mono rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Bell className="h-4 w-4 text-emerald-400 inline shrink-0" />
            <span>Schritt-für-Schritt Setup ➔</span>
          </button>
        )}

        {pwaInstallable && onTriggerPwaInstall ? (
          <button
            onClick={onTriggerPwaInstall}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>Direkt Installieren</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (onOpenPwaOnboarding) {
                onOpenPwaOnboarding();
              } else {
                setShowInstallInstructions(true);
              }
            }}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide"
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Jetzt App laden ⛺</span>
          </button>
        )}

        <button
          onClick={() => {
            safeStorage.setItem(STORAGE_KEYS.INSTALL_BANNER_HIDDEN, "true");
            onHideBanner();
          }}
          className="p-2.5 hover:bg-slate-800 border border-transparent hover:border-slate-800 rounded-xl text-slate-500 hover:text-slate-350 transition flex items-center justify-center cursor-pointer"
          title="Banner ausblenden"
        >
          <X className="h-4 w-4 shrink-0" />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showInstallInstructions}
        variant="info"
        title="App installieren"
        message="Nutze am Android Smartphone den Chrome Browser. Tippe oben rechts auf die drei Punkte ⋮ und wähle 'App installieren' oder 'Zum Startbildschirm hinzufügen'. Bei iOS nutzen Sie bitte Safari und wählen 'Teilen' -> 'Zum Startbildschirm'."
        onCancel={() => setShowInstallInstructions(false)}
      />
    </div>
  );
}
