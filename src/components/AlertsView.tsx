import React from "react";
import { 
  Bell, 
  Smartphone, 
  Send, 
  Check, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Info, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  Chrome,
  Compass,
  AlertCircle
} from "lucide-react";
import { User, Notification as DbNotification } from "../types";
import { sendLocalNotification, registerPushSubscription, unregisterPushSubscription, hasServiceWorkerSupport } from "../utils";

interface AlertsViewProps {
  currentUser: User | null;
  users: User[];
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
}

export default function AlertsView({ currentUser, users, onUpdateUser }: AlertsViewProps) {
  // Notification authorization status
  const [browserPermission, setBrowserPermission] = React.useState<string>(() => {
    return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
  });

  const [swStatus, setSwStatus] = React.useState<{
    supported: boolean;
    registered: boolean;
    state: string;
    controllerPresent: boolean;
    pingStatus: "checking" | "connected" | "failed" | "unsupported";
    pingMessage: string;
  }>({
    supported: false,
    registered: false,
    state: "Warte...",
    controllerPresent: false,
    pingStatus: "checking",
    pingMessage: "Prüfe Hintergrundverbindung..."
  });

  // Keep permission state updated dynamically
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const updatePermission = () => {
      if ("Notification" in window) {
        setBrowserPermission(Notification.permission);
      }
    };
    const interval = setInterval(updatePermission, 1500);
    return () => clearInterval(interval);
  }, []);

  // Monitor and ping Service Worker live
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!hasServiceWorkerSupport()) {
      setSwStatus(prev => ({
        ...prev,
        supported: false,
        state: "Vom Browser nicht unterstützt",
        pingStatus: "unsupported",
        pingMessage: "Ihr Browser blockiert Service Worker oder PWA-Komponenten."
      }));
      return;
    }

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PONG') {
        setSwStatus(prev => ({
          ...prev,
          pingStatus: "connected",
          pingMessage: "Kanal aktiv: PING-PONG erfolgreich bestätigt! ⛺"
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
              reg = await navigator.serviceWorker.register('/sw.js');
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
            setSwStatus(prev => ({
              ...prev,
              pingStatus: "checking",
              pingMessage: "Service Worker ist bereit. Beziehe Steuerung (Controller)..."
            }));
          } else {
            setSwStatus(prev => ({
              ...prev,
              pingStatus: "failed",
              pingMessage: "Warte auf aktiven Controller (Bitte Seite einmal neu laden)."
            }));
          }
        }

        setSwStatus(prev => ({
          ...prev,
          supported: true,
          registered: isReg,
          state: stateText,
          controllerPresent: hasController
        }));

      } catch (err: any) {
        setSwStatus(prev => ({
          ...prev,
          supported: true,
          registered: false,
          state: "Fehler beim Abrufen des SW-Status",
          pingStatus: "failed",
          pingMessage: err.message || "Fehler beim Auslesen"
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

  // Local notification list fetched from backend
  const [notifications, setNotifications] = React.useState<DbNotification[]>([]);
  const [loadingFeeds, setLoadingFeeds] = React.useState(false);
  const [testingStatus, setTestingStatus] = React.useState<"idle" | "sending" | "success" | "error">("idle");
  const [isOnline, setIsOnline] = React.useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);

  const [subStatus, setSubStatus] = React.useState<"idle" | "registering" | "success" | "error">("idle");
  const [subMessage, setSubMessage] = React.useState("");

  const isInIframe = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }, []);

  const handleForceRegisterPush = async () => {
    if (!currentUser) return;
    setSubStatus("registering");
    setSubMessage("Sende Registrierungsdaten...");
    try {
      await registerPushSubscription(currentUser.id);
      setSubStatus("success");
      setSubMessage("Abonnement erfolgreich auf dem Server registriert! ⛺✓");
      setTimeout(() => {
        setSubStatus("idle");
        setSubMessage("");
      }, 7000);
    } catch (e: any) {
      setSubStatus("error");
      setSubMessage(e.message || "Fehler beim Initialisieren der Push-Dienste.");
    }
  };

  const handleForceUnsubscribePush = async () => {
    if (!currentUser) return;
    setSubStatus("registering");
    setSubMessage("Lösche Push-Registrierungen vom Server...");
    try {
      const result = await unregisterPushSubscription(currentUser.id, true);
      if (result.success) {
        setSubStatus("success");
        setSubMessage(`${result.message} Alle Push-Abonnements zurückgesetzt. 🗑️✓`);
      } else {
        setSubStatus("error");
        setSubMessage(result.message);
      }
      setTimeout(() => {
        setSubStatus("idle");
        setSubMessage("");
      }, 7000);
    } catch (e: any) {
      setSubStatus("error");
      setSubMessage(e.message || "Fehler beim Abmelden der Push-Dienste.");
    }
  };

  // Admin debugger panel states
  const [targetUserId, setTargetUserId] = React.useState<string>("");
  const [customTitle, setCustomTitle] = React.useState("Dienstplan-Update! 🏕️⏰");
  const [customBody, setCustomBody] = React.useState("Moin! Deine Dienstzeiten für morgen wurden angepasst. Bitte checke kurz deinen Plan!");
  const [adminTestingStatus, setAdminTestingStatus] = React.useState<"idle" | "sending" | "success" | "error">("idle");
  const [adminSuccessMessage, setAdminSuccessMessage] = React.useState("");

  // Select initial target user
  React.useEffect(() => {
    if (users && users.length > 0 && !targetUserId) {
      const defaultUser = users.find(u => u.role !== "admin") || users[0];
      if (defaultUser) {
        setTargetUserId(defaultUser.id);
      }
    }
  }, [users, targetUserId]);

  const handleTriggerAdminTestNotification = async () => {
    if (!targetUserId) return;
    setAdminTestingStatus("sending");
    try {
      const targetUser = users.find(u => u.id === targetUserId);
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          title: customTitle,
          body: customBody
        })
      });

      if (res.ok) {
        setAdminTestingStatus("success");
        setAdminSuccessMessage(`Erfolgreich an ${targetUser?.display_name || "Helfer*in"} gesendet!`);
        if (currentUser && targetUserId === currentUser.id) {
          await fetchNotificationLogs();
        }
        setTimeout(() => {
          setAdminTestingStatus("idle");
          setAdminSuccessMessage("");
        }, 5000);
      } else {
        setAdminTestingStatus("error");
      }
    } catch (err) {
      console.error(err);
      setAdminTestingStatus("error");
    }
  };

  // Sync state with network
  React.useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Fetch notifications for the logged-in user
  const fetchNotificationLogs = React.useCallback(async () => {
    if (!currentUser) return;
    setLoadingFeeds(true);
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setNotifications(data);
        }
      }
    } catch (e) {
      console.error("Failed to load notifications list", e);
    } finally {
      setLoadingFeeds(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    fetchNotificationLogs();
  }, [currentUser, fetchNotificationLogs]);

  // Request browser notification perm
  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      alert("Dieses Gerät unterstützt leider keine automatischen Push-Benachrichtigungen.");
      return;
    }
    try {
      const perm = await window.Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === "granted") {
        sendLocalNotification("Perfekt! 🏕️", {
          body: "Dienstplan-Push-Benachrichtigungen sind jetzt für dieses Gerät aktiv.",
        });
        if (currentUser) {
          registerPushSubscription(currentUser.id).catch(err => {
            console.warn("Failed to subscribe push for target user:", err);
          });
        }
      }
    } catch (err) {
      console.error("Permission request error", err);
    }
  };

  // Triggers backend test notification
  const handleTriggerTestNotification = async () => {
    if (!currentUser) return;
    setTestingStatus("sending");
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          title: "Zeltlager Alarm-Test! 🏕️🔔",
          body: `Moin ${currentUser.display_name}, deine Echtzeit-Alerts sind korrekt eingerichtet! Wenn dich die Leitung umteilt oder sich Schichten anpassen, erhältst du sofort diese Pushup-Mitteilung.`
        })
      });

      if (res.ok) {
        setTestingStatus("success");
        // Also fire client-side browser Notification immediately
        if (browserPermission === "granted") {
          sendLocalNotification("Zeltlager Alarm-Test! 🏕️🔔", {
            body: `Moin ${currentUser.display_name}, deine Echtzeit-Alerts sind korrekt eingerichtet!`,
          });
        }
        await fetchNotificationLogs();
        setTimeout(() => setTestingStatus("idle"), 4000);
      } else {
        setTestingStatus("error");
      }
    } catch (err) {
      console.error(err);
      setTestingStatus("error");
    }
  };

  // Clear or mark as read notifications
  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        await fetchNotificationLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNotifications = async () => {
    if (!currentUser) return;
    if (!confirm("Möchtest du alle Benachrichtigungen in deinem Feed unwiderruflich löschen?")) return;
    try {
      const res = await fetch("/api/notifications/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Get date in readable format
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + 
        " - " + 
        date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    } catch (e) {
      return isoString;
    }
  };

  if (!currentUser) {
    return (
      <div className="tech-panel p-6 rounded-2xl max-w-xl mx-auto text-center space-y-4 shadow-xl">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Kein Helferprofil ausgewählt</h3>
        <p className="text-xs text-slate-400">
          Wähle ein Helferprofil über das obige Profil-Menü aus, um deine persönlichen Dienstplan-Benachrichtigungen zu verwalten.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] text-emerald-450 rounded-full text-[10px] text-emerald-400 font-mono font-bold tracking-wider uppercase inline-block mb-1.5">
            Realtime Push & Offline PWA Center
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            Benachrichtigungs-Zentrale 🔔
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Opt-In für Smartphone-Benachrichtigungen und Offline-Cache für deinen Pfingstlager-Dienstplan.
          </p>
        </div>

        {/* Offline Status indicator badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all shadow-sm ${
          isOnline 
            ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" 
            : "bg-amber-950/40 text-amber-500 border-amber-500/30"
        }`}>
          {isOnline ? (
            <>
              <Wifi className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
              <span>ONLINE: Plan synchronisiert</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span>OFFLINE: Zeige lokalen Cache</span>
            </>
          )}
        </div>
      </div>

      {/* Frame Sandboxing Detection Alert */}
      {typeof window !== "undefined" && window.self !== window.top && (
        <div className="tech-panel p-4.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-slate-300 text-xs shadow-[0_4px_25px_rgba(245,158,11,0.06)]">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <div className="space-y-1">
              <h4 className="font-extrabold text-white">Wichtiger Hinweis zur Browser-Sicherheit (AI Studio Vorschaufenster):</h4>
              <p className="text-[11px] text-slate-350 leading-relaxed">
                Da diese Anwendung innerhalb eines eingebetteten <b>Iframes</b> geladen ist, verbietet Chrome aus Sicherheitsgründen das Anfordern von neuen Push-Berechtigungen (<em>Permission Delegation Sandbox</em>). 
              </p>
              <p className="text-[11px] text-slate-350 leading-relaxed">
                Klicke einfach oben rechts in deinem Editor auf das Symbol <b>"In neuem Tab öffnen"</b> (oder die <b>"Ansehen"</b>-Schaltfläche). Auf der eigenständigen Web-Adresse (oder direkt auf deinem Smartphone) ist die Einschränkung gänzlich aufgehoben und die Push-Popups und Tests funktionieren vollautomatisch!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: PWA controls & Detailed Fix/Permission Guide */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          
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
                  onClick={requestBrowserPermission}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Popups aktivieren
                </button>
              )}
            </div>

            {typeof window !== "undefined" && window.self !== window.top && (
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

          {/* 2. Interactive Guide: How to unblock "Blockiert" notification warning */}
          {browserPermission === "denied" && (
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
          )}          {/* 3. Offline Mode Box (Service Worker details) */}
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

              {isInIframe && (
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
                <span className={`font-bold uppercase ${
                  swStatus.pingStatus === "connected" 
                    ? "text-emerald-400" 
                    : swStatus.pingStatus === "checking" 
                    ? "text-amber-400 animate-pulse" 
                    : "text-rose-400"
                }`}>
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
                onClick={handleForceRegisterPush} 
                disabled={subStatus === "registering" || browserPermission !== "granted"}
                className="px-4 py-2 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/25 disabled:border-slate-800 disabled:bg-slate-900 disabled:opacity-50 text-xs font-semibold rounded-xl hover:text-white transition flex items-center gap-3 cursor-pointer disabled:cursor-not-allowed"
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                {subStatus === "registering" ? "Registriere..." : "Push-Abo registrieren (Android Fix)"}
              </button>

              <button 
                onClick={handleForceUnsubscribePush} 
                disabled={subStatus === "registering"}
                className="px-4 py-2 bg-rose-950/20 hover:bg-rose-950/45 border border-rose-500/20 disabled:border-slate-800 disabled:bg-slate-900 disabled:opacity-50 text-xs font-semibold rounded-xl text-rose-400 hover:text-rose-100 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                Abo deaktivieren & cleanen
              </button>
            </div>

            {subMessage && (
              <div className={`text-[11px] p-3 rounded-lg border font-mono w-full ${
                subStatus === "success" 
                  ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400" 
                  : subStatus === "error"
                  ? "bg-rose-950/30 border-rose-500/20 text-rose-400"
                  : "bg-slate-900/60 border-slate-800 text-slate-300"
              }`}>
                <b>Status:</b> {subMessage}
              </div>
            )}
          </div>

          {/* 4. Test Trigger Area */}
          <div className="tech-panel p-5 md:p-6 rounded-2xl border border-emerald-500/10 space-y-4">
            <h3 className="text-sm font-extrabold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Send className="h-4.5 w-4.5 text-emerald-400" /> 3. Echtzeit-System live testen
            </h3>
            
            <p className="text-slate-300 text-xs leading-relaxed">
              Möchtest du testen, ob deine Benachrichtigungen funktionieren? Klicke auf den Button, um den Testlauf auf deinem Gerät zu simulieren und im Verlauf zu protokollieren.
            </p>

            {/* Detailed diagnostics panel for the user */}
            <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
              browserPermission === "granted"
                ? "bg-emerald-950/20 border-emerald-500/25 text-slate-300"
                : "bg-rose-950/10 border-rose-500/25 text-slate-300"
            }`}>
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
                  <p className="font-extrabold text-white text-[11px]">
                    💡 Handlungsbedarf für Android: Was ist hier los?
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Der Button unten wird nach dem Anklicken <b>"erfolgreich"</b> anzeigen. Das bedeutet aber *nur*, dass die Nachricht erfolgreich im Server-Verlauf (rechte Spalte) hinterlegt wurde.
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-200 font-bold">
                    Da die Browser-Erlaubnis blockiert oder inaktiv ist, kann dein Gerät KEIN Signal ausgeben!
                  </p>
                  <p className="text-[11px] leading-relaxed text-emerald-400 font-bold">
                    👉 Stelle bitte sicher, dass du unter Punkt 1 "Popups aktivieren" gedrückt hast und dass Mitteilungen für diese Web-Adresse in den Chrome/Android-Systemeinstellungen freigegeben sind!
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTriggerTestNotification}
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

          {/* 5. Admin-Leitstand: Helfer-Pushup Debugger & Live-Status */}
          {currentUser && currentUser.role === "admin" && (
            <div className="tech-panel p-5 md:p-6 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-950/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/35 rounded-full text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  Admin-Bereich 🛠️
                </span>
                <span className="text-slate-500 text-[10px] font-mono">Dienstplan-Koordinatoren Werkzeug</span>
              </div>
              <h3 className="text-sm font-extrabold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                📢 Live-Pushup Sende-Center & Helfer-Debugger
              </h3>
              <p className="text-slate-350 text-xs leading-relaxed">
                Als Camp-Administrator kannst du hier jedem Helfer im Zeltlager manuell eine Live-Pushup oder einen Testalarm auf sein Gerät senden. Perfekt, um im Feld zu prüfen, ob die Berechtigungen von verunsicherten Helfern richtig erteilt sind.
              </p>

              <div className="space-y-3.5 pt-2 border-t border-slate-900">
                {/* Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Ziel-Empfänger (Helfer auswählen):</label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="" disabled>-- Empfänger auswählen --</option>
                    {users.map(u => (
                      <option key={`admin-notif-user-${u.id}`} value={u.id}>
                        {u.display_name} ({u.role === "admin" ? "Admin-Leitung" : "Helfer*in"}) {u.active ? "• Aktiv ✓" : "• Inaktiv 💤"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Benachrichtigungs-Titel:</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-emerald-500"
                    placeholder="z.B. Dienstplan-Alarm! 🏕️"
                  />
                </div>

                {/* Content Message */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Inhalt & Nachricht:</label>
                  <textarea
                    rows={2}
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-emerald-500 resize-none"
                    placeholder="z.B. Deine Nachmittagsschicht hat sich um 30 Min verschoben..."
                  />
                </div>

                {/* Submit actions */}
                <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={handleTriggerAdminTestNotification}
                    disabled={adminTestingStatus === "sending" || !targetUserId}
                    className={`px-4.5 py-2.5 font-extrabold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
                      adminTestingStatus === "success"
                        ? "bg-emerald-600 border border-emerald-400 text-white"
                        : adminTestingStatus === "error"
                        ? "bg-rose-900 border border-rose-500 text-white"
                        : "bg-slate-900 hover:bg-slate-850 hover:text-emerald-450 text-white border border-slate-850"
                    }`}
                  >
                    {adminTestingStatus === "sending" ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Sende Live-Push...
                      </>
                    ) : adminTestingStatus === "success" ? (
                      <>
                        <Check className="h-3.5 w-3.5 animate-bounce text-white" />
                        Live-Push erfolgreich gesendet!
                      </>
                    ) : adminTestingStatus === "error" ? (
                      "Fehlgeschlagen ✕"
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-emerald-450 text-emerald-400" />
                        Live-Benachrichtigung losschicken!
                      </>
                    )}
                  </button>

                  <div className="text-[10px] text-slate-500 font-mono">
                    Empfänger-ID: <span className="text-emerald-400 font-bold">{targetUserId || "keine"}</span>
                  </div>
                </div>

                {adminSuccessMessage && (
                  <p className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/25 animate-fade-in text-center">
                    ✓ {adminSuccessMessage} Das Backend hat den Push-Auftrag entgegengenommen und im Verlauf gespeichert.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Dynamic Notification Log List */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <div className="tech-panel p-5 md:p-6 rounded-2xl border border-emerald-500/10 flex flex-col h-full min-h-[500px]">
            {/* Log Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-extrabold font-mono text-white tracking-tight">Deine empfangenen Alerts</h3>
                  <span className="text-[10px] text-slate-500 font-mono">NEUSTE DIENSTPLAN-BENACHRICHTIGUNGEN</span>
                </div>
              </div>

              {notifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleMarkAllRead} 
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    Gelesen
                  </button>
                  <span className="text-slate-700">|</span>
                  <button 
                    onClick={handleClearNotifications} 
                    className="text-[10px] font-bold text-rose-455 text-rose-400 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    Leeren
                  </button>
                </div>
              )}
            </div>

            {/* Notification logs list */}
            {loadingFeeds ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-20">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-mono text-slate-500">Lade Verlauf...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-20">
                <div className="p-3 bg-slate-950/40 rounded-full border border-slate-850">
                  <Bell className="h-6 w-6 text-slate-750 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">Dein Posteingang ist leer</p>
                  <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto mt-1 leading-normal">
                    Hier zeigen wir deine erhaltenen Alerts für eingeteilte Schichten, Verschiebungen und Lagerupdates an.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-3.5 rounded-xl border transition-all ${
                      n.read 
                        ? "bg-slate-950/10 border-slate-900 text-slate-500" 
                        : "bg-slate-950/60 border-emerald-500/20 text-white shadow-[0_2px_10px_rgba(16,185,129,0.03)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-extrabold flex items-center gap-1.5 leading-snug">
                        {!n.read && <span className="bg-emerald-500 h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" />}
                        {n.title}
                      </h4>
                      <span className="text-[9px] font-mono text-slate-500 flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    {/* Content text */}
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed whitespace-pre-line border-t border-slate-900/60 pt-1.5">
                      {n.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
