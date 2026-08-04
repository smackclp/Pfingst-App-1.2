import React from "react";
import { hasServiceWorkerSupport } from "../utils";

export interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  state: string;
  controllerPresent: boolean;
  pingStatus: "checking" | "connected" | "failed" | "unsupported";
  pingMessage: string;
}

/**
 * Überwacht und pingt den Service Worker live (Selbstheilung bei fehlender
 * Registrierung, Ping/Pong-Diagnose alle 3s). Extrahiert 1:1 aus AlertsView.tsx.
 */
export function useServiceWorkerStatus(): ServiceWorkerStatus {
  const [swStatus, setSwStatus] = React.useState<ServiceWorkerStatus>({
    supported: false,
    registered: false,
    state: "Warte...",
    controllerPresent: false,
    pingStatus: "checking",
    pingMessage: "Prüfe Hintergrundverbindung...",
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!hasServiceWorkerSupport()) {
      setSwStatus((prev) => ({
        ...prev,
        supported: false,
        state: "Vom Browser nicht unterstützt",
        pingStatus: "unsupported",
        pingMessage: "Ihr Browser blockiert Service Worker oder PWA-Komponenten.",
      }));
      return;
    }

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PONG") {
        setSwStatus((prev) => ({
          ...prev,
          pingStatus: "connected",
          pingMessage: "Kanal aktiv: PING-PONG erfolgreich bestätigt! ⛺",
        }));
      }
    };

    navigator.serviceWorker.addEventListener("message", handleSwMessage);

    const checkSW = async () => {
      try {
        let reg = await navigator.serviceWorker.getRegistration();

        // Plural fallbacks to detect existing service workers if single register check fails
        if (!reg && navigator.serviceWorker.getRegistrations) {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (regs && regs.length > 0) {
            reg = regs[0];
          }
        }

        // Auto-heal: If service worker is somehow missing and we are in a top-level tab, register right now!
        if (!reg) {
          const isTopWindow = typeof window !== "undefined" && window.self === window.top;
          if (isTopWindow) {
            console.log("[Diagnostics] No active service worker found. Attempting real-time self-healing registration...");
            try {
              reg = await navigator.serviceWorker.register("/sw.js");
              console.log("[Diagnostics] Self-healing registration triggered successfully scope:", reg.scope);
            } catch (regError) {
              console.warn("[Diagnostics] Self-healing auto-registration failure:", regError);
            }
          }
        }

        const hasController = !!navigator.serviceWorker.controller;

        let stateText = "Keine Registrierung";
        let isReg = false;

        if (reg) {
          isReg = true;
          if (reg.installing) {
            stateText = "Wird installiert (installing)...";
          } else if (reg.waiting) {
            stateText = "Wartet auf Aktivierung (waiting)...";
          } else if (reg.active) {
            stateText = "Aktiv & Bereit (active) ✓";
          }
        }

        // Try to trigger a ping if we have an active controller
        if (hasController && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "PING" });
        } else {
          // If no active controller but we have a registered page ready to claim, activate or ready the worker
          if (reg && reg.active && !hasController) {
            setSwStatus((prev) => ({
              ...prev,
              pingStatus: "checking",
              pingMessage: "Service Worker ist bereit. Beziehe Steuerung (Controller)...",
            }));
          } else {
            setSwStatus((prev) => ({
              ...prev,
              pingStatus: "failed",
              pingMessage: "Warte auf aktiven Controller (Bitte Seite einmal neu laden).",
            }));
          }
        }

        setSwStatus((prev) => ({
          ...prev,
          supported: true,
          registered: isReg,
          state: stateText,
          controllerPresent: hasController,
        }));
      } catch (err: any) {
        setSwStatus((prev) => ({
          ...prev,
          supported: true,
          registered: false,
          state: "Fehler beim Abrufen des SW-Status",
          pingStatus: "failed",
          pingMessage: err.message || "Fehler beim Auslesen",
        }));
      }
    };

    // Run check and poll
    checkSW();
    const interval = setInterval(checkSW, 3000);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      clearInterval(interval);
    };
  }, []);

  return swStatus;
}
