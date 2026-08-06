import React from "react";
import { Bell, Smartphone, ArrowUpRight, Download, RefreshCw, Play, Trash2, HelpCircle, Info } from "lucide-react";
import { safeStorage, hasServiceWorkerSupport } from "../../utils";
import { STORAGE_KEYS } from "../../constants";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface PwaSetupModalProps {
  pushPermStatus: string;
  isIOS: boolean;
  pwaInstallable: boolean;
  onRequestPushPermission: () => Promise<void>;
  onTriggerPwaInstall: () => Promise<void>;
  onClose: () => void;
}

export default function PwaSetupModal({
  pushPermStatus,
  isIOS,
  pwaInstallable,
  onRequestPushPermission,
  onTriggerPwaInstall,
  onClose,
}: PwaSetupModalProps) {
  // Telemetry state
  const [diagSwStatus, setDiagSwStatus] = React.useState<string>("Ungeprüft");
  const [diagMsgStatus, setDiagMsgStatus] = React.useState<string>("Bereit");
  const [diagTestStatus, setDiagTestStatus] = React.useState<string>("Bereit");
  const [diagLogs, setDiagLogs] = React.useState<string[]>([]);

  const addDiagLog = (text: string) => {
    const logLine = `[${new Date().toLocaleTimeString('de-DE')}] ${text}`;
    console.log(`[Push Diagnostics] ${text}`);
    setDiagLogs(prev => [...prev, logLine]);
  };

  const runDiagnosticsCheck = async () => {
    addDiagLog("Starte Service-Worker & Push-Zustand-Diagnose...");
    
    if (!("Notification" in window)) {
      addDiagLog("❌ Fehler: Notification API wird von diesem Browser gar nicht unterstützt.");
      return;
    }
    
    addDiagLog(`Notification API: Unterstützt. Aktueller Status: "${window.Notification.permission}"`);

    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (inIframe) {
      addDiagLog("⚠️ Warnung: App läuft im AI Studio Vorschau-Iframe. Die Vorschau-Sandbox unterdrückt Notification Banners aus Sicherheitsgründen!");
    }

    if (!hasServiceWorkerSupport()) {
      addDiagLog("❌ Fehler: Service Worker werden in diesem Browser nicht unterstützt oder sind im Inkognito-Modus deaktiviert.");
      setDiagSwStatus("Nicht unterstützt");
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      addDiagLog(`Anzahl registrierter Service-Worker: ${registrations.length}`);
      
      if (registrations.length === 0) {
        addDiagLog("⚠️ Kein Service-Worker registriert. Lade neu oder registriere...");
        setDiagSwStatus("Nicht registriert");
        return;
      }

      const activeReg = registrations[0];
      let state = "Unbekannt";
      if (activeReg.active) {
        state = "Aktiv ✓";
        addDiagLog(`✓ Aktiver Service-Worker gefunden! Scope: "${activeReg.scope}"`);
      } else if (activeReg.installing) {
        state = "Wird installiert...";
        addDiagLog("⏳ Service-Worker wird gerade installiert...");
      } else if (activeReg.waiting) {
        state = "Wartend";
        addDiagLog("⚠️ Service-Worker wartet (Schließe andere Tabs des Dienstplans zum Updaten).");
      }
      
      setDiagSwStatus(state);
    } catch (err: any) {
      addDiagLog(`❌ Fehler bei SW-Abfrage: ${err.message || String(err)}`);
      setDiagSwStatus("Fehler");
    }
  };

  const triggerDiagnosticMsgTest = async () => {
    addDiagLog("Führe Bidirektionalen Messaging-Test an den Service-Worker aus...");
    setDiagMsgStatus("Sende PING...");

    if (!hasServiceWorkerSupport()) {
      addDiagLog("❌ Abbruch: Kein navigator.serviceWorker vorhanden.");
      setDiagMsgStatus("Abgebrochen");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sw = reg?.active || navigator.serviceWorker.controller;

      if (!sw) {
        addDiagLog("❌ Abbruch: Kein aktiver / steuernder Service-Worker gefunden. Registrierung existiert eventuell nicht.");
        setDiagMsgStatus("Kein aktiver SW");
        return;
      }

      const onPongMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PONG') {
          addDiagLog(`✓ Erfolgreich! PONG-Antwort vom SW erhalten: "${event.data.message}"`);
          setDiagMsgStatus("Erfolgreich ✓");
          navigator.serviceWorker.removeEventListener("message", onPongMessage);
        }
      };

      navigator.serviceWorker.addEventListener("message", onPongMessage);
      
      addDiagLog("Sende Nachricht {type: 'PING'}...");
      sw.postMessage({ type: 'PING' });

      setTimeout(() => {
        navigator.serviceWorker.removeEventListener("message", onPongMessage);
        setDiagMsgStatus(current => {
          if (current === "Sende PING...") {
            addDiagLog("⚠️ Timeout nach 4s: Der Service Worker hat nicht geantwortet. Ist er suspendiert?");
            return "Timeout ✕";
          }
          return current;
        });
      }, 4000);

    } catch (err: any) {
      addDiagLog(`❌ Fehler im Messaging-Transport: ${err.message || String(err)}`);
      setDiagMsgStatus("Fehler");
    }
  };

  const triggerDiagnosticSwNotification = async () => {
    addDiagLog("Triggere Test-Alarm direkt über Service-Worker-Hintergrund...");
    setDiagTestStatus("Löse aus...");

    if (window.Notification.permission !== "granted") {
      addDiagLog("⚠️ Warnung: Berechtigung ist NICHT auf 'granted' gesetzt. Windows/Android unterdrückt dies!");
    }

    if (!hasServiceWorkerSupport()) {
      addDiagLog("❌ Abbruch: Service-Worker nicht unterstützt.");
      setDiagTestStatus("Fehler");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg?.active || navigator.serviceWorker.controller;

      if (!sw) {
        addDiagLog("❌ Abbruch: Kein aktiver Service-Worker.");
        setDiagTestStatus("Kein aktiver SW");
        return;
      }

      const onNotifyResult = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TEST_NOTIFICATION_SENT') {
          if (event.data.success) {
            addDiagLog("✓ SW-Rückmeldung: showNotification() wurde ohne API-Fehler aufgerufen!");
            setDiagTestStatus("Ausgelöst ✓");
          } else {
            addDiagLog(`❌ SW-Rückmeldung Fehler: ${event.data.error}`);
            setDiagTestStatus("Fehlgeschlagen ✕");
          }
          navigator.serviceWorker.removeEventListener("message", onNotifyResult);
        }
      };

      navigator.serviceWorker.addEventListener("message", onNotifyResult);

      addDiagLog("Sende Nachricht {type: 'TEST_NOTIFICATION'}...");
      sw.postMessage({
        type: 'TEST_NOTIFICATION',
        title: 'Diagnose Test-Alarm ⛺',
        body: 'Wenn du diesen Banner siehst, funktionieren deine Push-Alarme einwandfrei!'
      });

      setTimeout(() => {
        navigator.serviceWorker.removeEventListener("message", onNotifyResult);
        setDiagTestStatus(current => {
          if (current === "Löse aus...") {
            addDiagLog("⚠️ Keine Bestätigung vom SW erhalten (Auslösung wurde gesendet).");
            return "Gesendet";
          }
          return current;
        });
      }, 4000);

    } catch (err: any) {
      addDiagLog(`❌ Trigger-Fehler: ${err.message || String(err)}`);
      setDiagTestStatus("Fehler");
    }
  };

  const handleDismiss = () => {
    safeStorage.setItem(STORAGE_KEYS.PWA_SETUP_DISMISSED, "true");
    onClose();
  };

  const titleId = React.useId();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(true);
  useEscapeKey(true, handleDismiss);

  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80 animate-fade-in"
      id="pwa-setup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 shrink-0" />

        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 font-mono font-extrabold tracking-wider uppercase inline-block">
              Pfingstlager App-Setup ⛺
            </span>
            <h2 id={titleId} className="text-xl md:text-2xl font-black font-display text-white tracking-tight">
              Hol dir das native App-Gefühl!
            </h2>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-normal">
              Damit du am Zeltplatz deine Schichten sekundenschnell abrufen kannst und sofort lautstark benachrichtigt wirst!
            </p>
          </div>

          <div className="space-y-4 font-sans">
            {/* 1. Push notification helper card */}
            <div className={`p-4 rounded-2xl border transition-all duration-200 ${
              pushPermStatus === "granted" 
                ? "bg-emerald-950/15 border-emerald-500/30" 
                : "bg-slate-950 border-slate-800"
            }`}>
              <div className="flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-xl border ${
                  pushPermStatus === "granted" 
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Schritt 1: Signalton & Push-Alarme
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-normal">
                      Erhalte sofort ein Popup und Ton, sobald die Campleitung neue Funktionen freischaltet oder dir Schichten zuteilt.
                    </p>
                  </div>

                  {pushPermStatus === "granted" ? (
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase select-none">
                      <span>✓ Push-Benachrichtigungen aktiv</span>
                    </div>
                  ) : (
                    <button
                      onClick={onRequestPushPermission}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] rounded-lg tracking-wide uppercase cursor-pointer transition active:scale-97"
                    >
                      Push-Alarme erlauben 🔔
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. PWA installation guidelines card */}
            <div className={`p-4 rounded-2xl border transition-all duration-200 ${
              typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches 
                ? "bg-emerald-950/15 border-emerald-500/30" 
                : "bg-slate-950 border-slate-800"
            }`}>
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Schritt 2: Homescreen Installation (PWA)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-normal">
                      Füge die App zu deinem Startbildschirm hinzu. Läuft offline im AMOLED "True Black" Batteriespar-Modus ohne störende Browserzeilen!
                    </p>
                  </div>

                  {isIOS ? (
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans leading-relaxed">
                      <p className="font-bold text-white flex items-center gap-1">
                        <span>Anleitung für iPhone / Safari:</span>
                        <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                      </p>
                      <p>1. Tippe unten im Safari auf den <b>Teilen-Button</b> 📤</p>
                      <p>2. Scrolle runter und wähle <b>"Zum Startbildschirm"</b> 📱</p>
                      <p>3. Tippe oben auf <b>"Hinzufügen"</b>. Fertig! 🎉</p>
                    </div>
                  ) : pwaInstallable ? (
                    <button
                      onClick={onTriggerPwaInstall}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[10px] rounded-lg tracking-wide uppercase cursor-pointer transition active:scale-97 flex items-center gap-1.5"
                    >
                      <Download className="h-3 w-3 shrink-0" />
                      <span>App jetzt installieren</span>
                    </button>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-[10px] text-slate-350 space-y-1.5 font-sans leading-relaxed">
                      <p className="font-bold text-white flex items-center gap-1">
                        <span>Anleitung für Android / Chrome:</span>
                      </p>
                      <p>1. Tippe oben rechts im Chrome auf das <b>Menü (Drei Punkte)</b> ⁝</p>
                      <p>2. Wähle die Option <b>"App installieren"</b> oder <b>"Zum Startbildschirm hinzufügen"</b></p>
                      <p>3. Bestätige die Installation. Viel Spaß! 🏕️</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🛠️ Live Diagnostic Panel */}
            <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-4 font-sans text-left" id="pwa-diagnostic-panel">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-xs font-black font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 animate-pulse text-emerald-400" />
                  <span>Echtzeit-Push & SW Diagnose-Zentrale</span>
                </h3>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded-full uppercase font-bold">
                  Telemetry v2.0
                </span>
              </div>

              <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                Wenn Benachrichtigungen trotz Erteilung nicht aufploppen, hilft dir dieses Live-Diagnosetool, den genauen Fehler aufzuspüren.
              </p>

              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Browser-Rechte (Permission):</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${pushPermStatus === 'granted' ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : pushPermStatus === 'denied' ? 'bg-rose-500' : 'bg-slate-500'}`} />
                    <span className="text-xs font-black text-white capitalize font-mono">{pushPermStatus}</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Service-Worker (SW):</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${diagSwStatus.includes('Aktiv') ? 'bg-emerald-400 shadow-sm' : 'bg-amber-400'}`} />
                    <span className="text-xs font-black text-white font-mono truncate max-w-[140px]">{diagSwStatus}</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">SW Messaging - PING/PONG:</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${diagMsgStatus.includes('Erfolgreich') ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className="text-xs font-black text-white font-mono">{diagMsgStatus}</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">SW Test-Alarm (Hintergrund):</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${diagTestStatus.includes('Ausgelöst') ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className="text-xs font-black text-white font-mono">{diagTestStatus}</span>
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-900">
                <button
                  type="button"
                  onClick={runDiagnosticsCheck}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-white text-[10px] font-bold font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer max-w-full"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>1. Status prüfen</span>
                </button>

                <button
                  type="button"
                  onClick={triggerDiagnosticMsgTest}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-white text-[10px] font-bold font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer max-w-full"
                >
                  <Play className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>2. SW Ping</span>
                </button>

                <button
                  type="button"
                  onClick={triggerDiagnosticSwNotification}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase cursor-pointer max-w-full block"
                >
                  <Bell className="h-3.5 w-3.5 shrink-0" />
                  <span>3. SW Test-Alarm feuer*n</span>
                </button>
              </div>

              {/* Live Log Terminal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider font-bold">LIVE TELEMETRY LOGS (CONSOLE REDIRECT):</span>
                  {diagLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiagLogs([])}
                      className="text-[9px] text-rose-450 hover:text-rose-400 font-mono transition cursor-pointer flex items-center gap-0.5"
                    >
                      <Trash2 className="h-3 w-3 inline" /> Logs leeren
                    </button>
                  )}
                </div>
                
                <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl font-mono text-[10px] text-slate-300 leading-relaxed max-h-[140px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {diagLogs.length === 0 ? (
                    <div className="text-slate-500 italic text-center py-4">
                      Noch keine Logs. Klicke auf "1. Status prüfen" für den Selbsttest!
                    </div>
                  ) : (
                    diagLogs.map((log, idx) => (
                      <div key={idx} className={`border-b border-slate-900/40 pb-0.5 ${log.includes("❌") ? "text-rose-450 font-bold" : log.includes("⚠️") ? "text-amber-400 font-semibold" : log.includes("✓") ? "text-emerald-400 font-bold" : "text-slate-350"}`}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Expert Troubleshoot Checklist */}
              <div className="bg-slate-900/50 border border-slate-850/50 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider font-mono">Expert-Problemlösung für Android & Desktop Chrome</span>
                </div>

                <div className="text-[10px] text-slate-350 space-y-2 leading-relaxed">
                  <div className="border-l-2 border-emerald-500/40 pl-2">
                    <p className="font-bold text-white text-[11px]">Constraint 1: Der AI Studio / Vorschau-Iframe ⚠️</p>
                    <p className="mt-0.5">
                      Deine Vorschau im Browser läuft eingebettet in ein Iframe. Klicke auf <span className="text-emerald-400 font-mono font-bold font-semibold select-all">"In neuem Tab öffnen"</span> für volle Funktionalität.
                    </p>
                  </div>

                  <div className="border-l-2 border-indigo-500/40 pl-2">
                    <p className="font-bold text-white text-[11px]">Constraint 2: Android 13+ Standalone PWA & Chrome App Systemrechte 📱</p>
                    <p className="mt-0.5">
                      Stelle in den Android-Systemeinstellungen sicher, dass Benachrichtigungen für Chrome/App zugelassen sind.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 font-mono">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer transition"
            >
              Überspringen ➔
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Alles eingerichtet! ✓
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
