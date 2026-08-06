import React from "react";
import Navigation from "./components/Navigation";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";
import TabContentManager from "./components/TabContentManager";
import ModalManager from "./components/ModalManager";
import LoginScreen from "./components/LoginScreen";
import PwaSetupModal from "./components/modals/PwaSetupModal";
import OnboardingModal from "./components/modals/OnboardingModal";
import { useZeltlagerData } from "./hooks/useZeltlagerData";
import { TooltipProvider } from "./components/Tooltip";
import { sendLocalNotification, registerPushSubscription, safeStorage, hasServiceWorkerSupport } from "./utils";
import { STORAGE_KEYS } from "./constants";
import { flushOfflineQueue, subscribeOfflineQueue, subscribeOfflineQueueFailure } from "./lib/offlineQueue";
import { useToast } from "./hooks/useToast";
import Toast from "./components/Toast";
import { useUndoableDelete } from "./hooks/useUndoableDelete";
import UndoToast from "./components/UndoToast";

export default function App() {
  const {
    currentTab,
    setCurrentTab,
    authStatus,
    authUser,
    accessRole,
    isAdmin,
    login,
    logoutUser,
    currentUserId,
    users,
    services,
    shifts,
    assignments,
    conflicts,
    camps,
    activeCampId,
    loading,
    refreshing,
    selectShiftId,
    setSelectShiftId,
    loadDatabase,
    handleAddUser,
    handleUpdateUser,
    handleUpdateAccessRole,
    handleDeleteUser,
    handleAddService,
    handleUpdateService,
    handleDeleteService,
    handleAddShift,
    handleUpdateShift,
    handleDeleteShift,
    handleAddAssignment,
    handleRemoveAssignment,
    handleUpdateAssignmentStatus,
    handleSetActiveCamp,
    handleCreateCamp,
    handleSelectShift,
    materials,
    handleAddMaterial,
    handleUpdateMaterial,
    handleDeleteMaterial,
    functionalRoles,
    handleAddRole,
    handleUpdateRole,
    handleDeleteRole,
    communities,
    handleAddCommunity,
    handleUpdateCommunity,
    handleDeleteCommunity,
    handleImportCommunities,
    handleClearCommunities,
    talentActs,
    handleAddTalentAct,
    handleUpdateTalentAct,
    handleDeleteTalentAct,
    handleReorderTalentActs,
    sogGroups,
    sogStations,
    sogSettings,
    handleUpdateSogGroups,
    handleUpdateSogStations,
    handleUpdateSogSettings,
    handleResetDatabase,
    handleRestoreLastReset,
  } = useZeltlagerData();

  // Jemanden von einer Schicht abmelden ist häufig und leicht aus Versehen
  // ausgelöst (ein Klick, keine Rückfrage) - deshalb hier zentral mit dem
  // gleichen 6-Sekunden-Undo-Sicherheitsnetz wie bei anderen Löschungen
  // versehen. Zentral in App.tsx statt einzeln in jeder View (Kalender,
  // Dashboard, Schichtplanung), damit die Absicherung überall gilt, wo
  // Zuweisungen entfernt werden können, nicht nur in der Schichtplanung.
  const {
    isPending: isAssignmentRemovalPending,
    scheduleDelete: scheduleAssignmentRemoval,
    undo: undoAssignmentRemoval,
    activeToast: assignmentRemovalToast,
  } = useUndoableDelete();

  const visibleAssignments = React.useMemo(
    () => assignments.filter((a) => !isAssignmentRemovalPending(`assignment-${a.shift_id}-${a.user_id}`)),
    [assignments, isAssignmentRemovalPending]
  );

  const handleRemoveAssignmentWithUndo = React.useCallback(
    (shiftId: string, userId: string): Promise<void> => {
      const user = users.find((u) => u.id === userId);
      scheduleAssignmentRemoval(`assignment-${shiftId}-${userId}`, user?.display_name || "Zuweisung", async () => {
        await handleRemoveAssignment(shiftId, userId);
      });
      return Promise.resolve();
    },
    [users, scheduleAssignmentRemoval, handleRemoveAssignment]
  );

  const [theme, setTheme] = React.useState<"dark" | "amoled" | "light font-sans" | "sunlight">(
    () => (safeStorage.getItem(STORAGE_KEYS.THEME) as any) || "light font-sans"
  );

  // Sonnenlicht-Modus braucht zusätzlich eine größere Basis-Schriftgröße (rem-basiert,
  // also am <html>-Element, nicht nur an der App-Container-Div - siehe index.css).
  React.useEffect(() => {
    document.documentElement.classList.toggle("theme-sunlight", theme === "sunlight");
  }, [theme]);

  const [statusEditingAssignmentId, setStatusEditingAssignmentId] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Falls beim App-Start bereits eine Verbindung besteht, wartende
    // Aktionen aus einer vorherigen Offline-Sitzung gleich nachsenden.
    if (typeof navigator !== "undefined" && navigator.onLine) {
      flushOfflineQueue();
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Offline-Warteschlange: Anzahl wartender Aktionen fürs Banner + Toast-
  // Hinweise beim Einreihen bzw. bei endgültigem Fehlschlagen (siehe CLAUDE.md
  // Abschnitt 8 "Offline First").
  const [offlineQueueLength, setOfflineQueueLength] = React.useState(0);
  const { toastMessage: queueToastMessage, showToast: showQueueToast } = useToast();
  const prevOfflineQueueLengthRef = React.useRef(0);

  React.useEffect(() => {
    const unsubscribe = subscribeOfflineQueue((queue) => {
      if (queue.length > prevOfflineQueueLengthRef.current) {
        showQueueToast("📥 Gespeichert - wird synchronisiert, sobald du wieder online bist.");
      }
      prevOfflineQueueLengthRef.current = queue.length;
      setOfflineQueueLength(queue.length);
    });
    return unsubscribe;
  }, [showQueueToast]);

  React.useEffect(() => {
    const unsubscribe = subscribeOfflineQueueFailure((action) => {
      showQueueToast(`⚠️ "${action.label}" konnte nicht übernommen werden - bitte im Netz erneut versuchen.`);
    });
    return unsubscribe;
  }, [showQueueToast]);
  
  const [showPwaSetupModal, setShowPwaSetupModal] = React.useState(() => {
    if (typeof window !== "undefined") {
      const dismissed = safeStorage.getItem(STORAGE_KEYS.PWA_SETUP_DISMISSED);
      let isStandalone = false;
      try {
        isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      } catch (e) {
        console.warn("matchMedia check failed:", e);
      }
      return dismissed !== "true" && !isStandalone;
    }
    return false;
  });

  // Onboarding wird pro Lagerjahr erneut gezeigt (nicht nur einmalig pro Gerät):
  // Rückkehrende Helfer nutzen die App oft nur einmal jährlich rund um Pfingsten
  // und haben die Bedienung nach der Pause meist vergessen.
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  React.useEffect(() => {
    if (loading || !activeCampId) return;
    const seenCampId = safeStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN_CAMP_ID);
    if (seenCampId === activeCampId) return;
    // Migration von Bestandsnutzern (altes Einmal-Flag ohne Lagerjahr-Bezug):
    // aktuelle Saison als bereits gesehen markieren, statt sie direkt nach dem
    // Update erneut zu unterbrechen. Ab dem nächsten Lagerjahr-Wechsel greift
    // dann wieder die reguläre Logik oben.
    if (seenCampId === null && safeStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN) === "true") {
      safeStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN_CAMP_ID, activeCampId);
      return;
    }
    setShowOnboarding(true);
  }, [activeCampId, loading]);

  // Sprungziel für die globale Suche: öffnet ProgramView direkt im richtigen
  // Unterbereich (Talentshow oder Spiel ohne Grenzen).
  const [programJumpTarget, setProgramJumpTarget] = React.useState<"talentshow" | "spiel_ohne_grenzen" | null>(null);

  const closeOnboarding = () => {
    safeStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, "true");
    if (activeCampId) safeStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN_CAMP_ID, activeCampId);
    setShowOnboarding(false);
  };

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [pwaInstallable, setPwaInstallable] = React.useState(false);
  const [pushPermStatus, setPushPermStatus] = React.useState<string>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return window.Notification.permission;
    }
    return "default";
  });

  const [isIOS] = React.useState(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    }
    return false;
  });

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Synchronise push subscription
  React.useEffect(() => {
    if (currentUserId && currentUserId !== "null" && currentUserId !== "undefined" && typeof window !== "undefined") {
      if ("Notification" in window && Notification.permission === "granted") {
        registerPushSubscription(currentUserId).catch(err => {
          console.warn("Failed to auto-register push subscription:", err);
        });
      }
    }
  }, [currentUserId]);

  // Automated background notifier poller
  React.useEffect(() => {
    if (!currentUserId || currentUserId === "null" || currentUserId === "undefined" || typeof window === "undefined") return;

    const notifiedIdsKey = STORAGE_KEYS.ALERTED_IDS_PREFIX + currentUserId + "_v2";
    let alertedIds = new Set<string>();
    try {
      const stored = safeStorage.getItem(notifiedIdsKey);
      if (stored) {
        alertedIds = new Set(JSON.parse(stored));
      }
    } catch (_) {}

    const pollNotificationsForPush = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${currentUserId}`);
        if (!res.ok) return;

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;

        const list = await res.json();
        if (!list || !Array.isArray(list)) return;

        let hasActivePushSub = false;
        try {
          if (hasServiceWorkerSupport() && "PushManager" in window) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              const sub = await reg.pushManager.getSubscription();
              if (sub) hasActivePushSub = true;
            }
          }
        } catch (e) {
          console.warn("Push sub check error:", e);
        }
        
        let newlyNotified = false;
        const unreadPending = list.filter((n: any) => n && !n.read && !alertedIds.has(n.id));
        
        if (unreadPending.length > 0) {
          unreadPending.forEach((n: any) => {
            alertedIds.add(n.id);
            if (!hasActivePushSub) {
              sendLocalNotification(n.title, { body: n.body, tag: n.id, renotify: true } as any);
            }
          });
          newlyNotified = true;
        }

        list.forEach((n: any) => alertedIds.add(n.id));

        if (newlyNotified || alertedIds.size > 0) {
          safeStorage.setItem(notifiedIdsKey, JSON.stringify(Array.from(alertedIds)));
        }
      } catch (err) {
        console.warn("Notification polling fetch skipped:", err);
      }
    };

    pollNotificationsForPush();
    const interval = setInterval(pollNotificationsForPush, 3000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleRequestPushPermission = async () => {
    if (!("Notification" in window)) {
      showQueueToast("Dieses Gerät unterstützt leider keine automatischen Push-Benachrichtigungen.");
      return;
    }
    try {
      const perm = await window.Notification.requestPermission();
      setPushPermStatus(perm);
      if (perm === "granted") {
        sendLocalNotification("Push aktiviert! 🔔", {
          body: "Spitze! Über anstehende Schichtänderungen informieren wir dich per Signalton.",
        });
        if (currentUserId) {
          registerPushSubscription(currentUserId).catch(err => console.warn(err));
        }
      }
    } catch (err) {
      console.error("Push activation request fail:", err);
    }
  };

  const handleTriggerPwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA user decision: ${outcome}`);
    setDeferredPrompt(null);
    setPwaInstallable(false);
  };

  // Umschalter zyklisch: Dunkel -> Hell -> Sonnenlicht -> Dunkel, entsprechend der
  // abgestimmten Design-Entscheidung #1 ("Hell als Standard, Dark Mode optional"),
  // erweitert um den Sonnenlicht-Modus für Außennutzung bei praller Sonne.
  // Der frühere dritte "amoled"-Zustand wurde bewusst entfernt, um weniger
  // Auswahloptionen für die Zielgruppe zu haben (Cycle überspringt ihn bewusst).
  const toggleTheme = () => {
    const nextTheme: "dark" | "light font-sans" | "sunlight" =
      theme === "dark" ? "light font-sans" : theme === "light font-sans" ? "sunlight" : "dark";
    setTheme(nextTheme);
    safeStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
  };

  const openStatusModal = React.useCallback(async (assignmentId: string): Promise<void> => {
    setStatusEditingAssignmentId(assignmentId);
  }, []);

  const closeStatusModal = React.useCallback(() => {
    setStatusEditingAssignmentId(null);
  }, []);

  // Solange die Session noch geprüft wird: neutraler Ladebildschirm (kein Layout-Flackern).
  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-mono">
        Lade…
      </div>
    );
  }

  // Nicht angemeldet: nur der Login-Bildschirm, keine Daten werden geladen/angezeigt.
  if (authStatus === "unauthenticated" || !authUser) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <TooltipProvider>
      <div
        className={`flex flex-col lg:flex-row min-h-screen ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100"
            : theme === "amoled"
            ? "theme-amoled bg-black text-white selection:bg-emerald-500/30"
            : theme === "sunlight"
            ? "theme-sunlight"
            : "theme-light"
        } font-sans tech-dot-grid`}
        id="zeltlager-app-container"
      >
        <Navigation
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          conflictCount={conflicts.length}
          theme={theme}
          onToggleTheme={toggleTheme}
          accessRole={accessRole}
          currentUserId={currentUserId}
          showToast={showQueueToast}
        />

        <BottomNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          accessRole={accessRole}
          currentUserId={currentUserId}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {!isOnline && (
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 animate-pulse border-b border-amber-500/30 shadow-md shrink-0">
              <span>📴</span>
              <span>
                <b>Offline-Modus aktiv:</b> Auf dem Zeltlagerplatz ist der Empfang oft miserabel. Dein Dienstplan wurde lokal gecached.
                {offlineQueueLength > 0 &&
                  ` ${offlineQueueLength} Aktion${offlineQueueLength === 1 ? "" : "en"} ${offlineQueueLength === 1 ? "wird" : "werden"} synchronisiert, sobald du wieder online bist.`}
              </span>
            </div>
          )}

          {isOnline && offlineQueueLength > 0 && (
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-emerald-500/30 shadow-md shrink-0" id="offline-queue-syncing-banner">
              <span>🔄</span>
              <span>
                {offlineQueueLength} wartende Aktion{offlineQueueLength === 1 ? "" : "en"} {offlineQueueLength === 1 ? "wird" : "werden"} gerade synchronisiert...
              </span>
            </div>
          )}

          <Header
            activeCampId={activeCampId}
            camps={camps}
            refreshing={refreshing}
            accessRole={accessRole}
            onLogout={logoutUser}
            loadDatabase={loadDatabase}
            users={users}
            services={services}
            shifts={shifts}
            assignments={assignments}
            materials={materials}
            communities={communities}
            talentActs={talentActs}
            sogStations={sogStations}
            onSelectShift={handleSelectShift}
            onSelectProgram={setProgramJumpTarget}
            setCurrentTab={setCurrentTab}
            currentUserId={currentUserId}
            onOpenPwaOnboarding={() => setShowPwaSetupModal(true)}
          />

          <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
            <TabContentManager
              currentTab={currentTab}
              loading={loading}
              users={users}
              services={services}
              shifts={shifts}
              assignments={visibleAssignments}
              conflicts={conflicts}
              activeCampId={activeCampId}
              camps={camps}
              isAdmin={isAdmin}
              accessRole={accessRole}
              currentUserId={currentUserId}
              selectShiftId={selectShiftId}
              programJumpTarget={programJumpTarget}
              setCurrentTab={setCurrentTab}
              setProgramJumpTarget={setProgramJumpTarget}
              setSelectShiftId={setSelectShiftId}
              openStatusModal={openStatusModal}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onUpdateAccessRole={handleUpdateAccessRole}
              onDeleteUser={handleDeleteUser}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onDeleteService={handleDeleteService}
              onAddShift={handleAddShift}
              onUpdateShift={handleUpdateShift}
              onDeleteShift={handleDeleteShift}
              onAddAssignment={handleAddAssignment}
              onRemoveAssignment={handleRemoveAssignmentWithUndo}
              onRemoveAssignmentImmediate={handleRemoveAssignment}
              onSetActiveCamp={handleSetActiveCamp}
              onCreateCamp={handleCreateCamp}
              onSelectShift={handleSelectShift}
              pwaInstallable={pwaInstallable}
              onTriggerPwaInstall={handleTriggerPwaInstall}
              onOpenPwaOnboarding={() => setShowPwaSetupModal(true)}
              materials={materials}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              functionalRoles={functionalRoles}
              onAddRole={handleAddRole}
              onUpdateRole={handleUpdateRole}
              onDeleteRole={handleDeleteRole}
              communities={communities}
              onAddCommunity={handleAddCommunity}
              onUpdateCommunity={handleUpdateCommunity}
              onDeleteCommunity={handleDeleteCommunity}
              onImportCommunities={handleImportCommunities}
              onClearCommunities={handleClearCommunities}
              talentActs={talentActs}
              onAddTalentAct={handleAddTalentAct}
              onUpdateTalentAct={handleUpdateTalentAct}
              onDeleteTalentAct={handleDeleteTalentAct}
              onReorderTalentActs={handleReorderTalentActs}
              sogGroups={sogGroups}
              sogStations={sogStations}
              sogSettings={sogSettings}
              onUpdateSogGroups={handleUpdateSogGroups}
              onUpdateSogStations={handleUpdateSogStations}
              onUpdateSogSettings={handleUpdateSogSettings}
              onResetDatabase={handleResetDatabase}
              onRestoreLastReset={handleRestoreLastReset}
              onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
            />
          </main>
        </div>

        <ModalManager
          statusEditingAssignmentId={statusEditingAssignmentId}
          onCloseStatusEditingModal={closeStatusModal}
          assignments={assignments}
          shifts={shifts}
          users={users}
          services={services}
          onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
        />

        {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}

        {showPwaSetupModal && !showOnboarding && (
          <PwaSetupModal
            pushPermStatus={pushPermStatus}
            isIOS={isIOS}
            pwaInstallable={pwaInstallable}
            onRequestPushPermission={handleRequestPushPermission}
            onTriggerPwaInstall={handleTriggerPwaInstall}
            onClose={() => setShowPwaSetupModal(false)}
          />
        )}

        <Toast message={queueToastMessage} />
        <UndoToast toast={assignmentRemovalToast} onUndo={undoAssignmentRemoval} />
      </div>
    </TooltipProvider>
  );
}
