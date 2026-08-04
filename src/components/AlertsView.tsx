import React from "react";
import { AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { User, Notification as DbNotification } from "../types";
import { sendLocalNotification, registerPushSubscription, unregisterPushSubscription, isInsideIframe } from "../utils";
import { useNotificationPermission } from "../hooks/useNotificationPermission";
import { useServiceWorkerStatus } from "../hooks/useServiceWorkerStatus";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import AlertsPushPermissionSection from "./AlertsPushPermissionSection";
import AlertsBrowserGuide from "./AlertsBrowserGuide";
import AlertsServiceWorkerSection from "./AlertsServiceWorkerSection";
import AlertsTestTriggerSection from "./AlertsTestTriggerSection";
import AlertsAdminComposer from "./AlertsAdminComposer";
import AlertsNotificationLog from "./AlertsNotificationLog";

interface AlertsViewProps {
  currentUser: User | null;
  users: User[];
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
}

export default function AlertsView({ currentUser, users, onUpdateUser }: AlertsViewProps) {
  const browserPermission = useNotificationPermission();
  const swStatus = useServiceWorkerStatus();
  const isOnline = useOnlineStatus();

  const [notifications, setNotifications] = React.useState<DbNotification[]>([]);
  const [loadingFeeds, setLoadingFeeds] = React.useState(false);
  const [testingStatus, setTestingStatus] = React.useState<"idle" | "sending" | "success" | "error">("idle");

  const [subStatus, setSubStatus] = React.useState<"idle" | "registering" | "success" | "error">("idle");
  const [subMessage, setSubMessage] = React.useState("");

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
      const defaultUser = users.find((u) => u.role !== "admin") || users[0];
      if (defaultUser) {
        setTargetUserId(defaultUser.id);
      }
    }
  }, [users, targetUserId]);

  const handleTriggerAdminTestNotification = async () => {
    if (!targetUserId) return;
    setAdminTestingStatus("sending");
    try {
      const targetUser = users.find((u) => u.id === targetUserId);
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          title: customTitle,
          body: customBody,
        }),
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
      if (perm === "granted") {
        sendLocalNotification("Perfekt! 🏕️", {
          body: "Dienstplan-Push-Benachrichtigungen sind jetzt für dieses Gerät aktiv.",
        });
        if (currentUser) {
          registerPushSubscription(currentUser.id).catch((err) => {
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
          body: `Moin ${currentUser.display_name}, deine Echtzeit-Alerts sind korrekt eingerichtet! Wenn dich die Leitung umteilt oder sich Schichten anpassen, erhältst du sofort diese Pushup-Mitteilung.`,
        }),
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
        body: JSON.stringify({ userId: currentUser.id }),
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
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error(err);
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
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all shadow-sm ${
            isOnline ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" : "bg-amber-950/40 text-amber-500 border-amber-500/30"
          }`}
        >
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
      {isInsideIframe() && (
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
          <AlertsPushPermissionSection browserPermission={browserPermission} onRequestPermission={requestBrowserPermission} />

          {browserPermission === "denied" && <AlertsBrowserGuide />}

          <AlertsServiceWorkerSection
            swStatus={swStatus}
            subStatus={subStatus}
            subMessage={subMessage}
            browserPermission={browserPermission}
            onForceRegisterPush={handleForceRegisterPush}
            onForceUnsubscribePush={handleForceUnsubscribePush}
          />

          <AlertsTestTriggerSection browserPermission={browserPermission} testingStatus={testingStatus} onTriggerTest={handleTriggerTestNotification} />

          {currentUser && currentUser.role === "admin" && (
            <AlertsAdminComposer
              users={users}
              targetUserId={targetUserId}
              onTargetUserIdChange={setTargetUserId}
              customTitle={customTitle}
              onCustomTitleChange={setCustomTitle}
              customBody={customBody}
              onCustomBodyChange={setCustomBody}
              adminTestingStatus={adminTestingStatus}
              adminSuccessMessage={adminSuccessMessage}
              onTriggerAdminTest={handleTriggerAdminTestNotification}
            />
          )}
        </div>

        {/* Right Column: Dynamic Notification Log List */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <AlertsNotificationLog
            notifications={notifications}
            loadingFeeds={loadingFeeds}
            onMarkAllRead={handleMarkAllRead}
            onClearNotifications={handleClearNotifications}
          />
        </div>
      </div>
    </div>
  );
}
