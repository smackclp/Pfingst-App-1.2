import React from "react";
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Layers, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle,
  TrendingUp,
  MapPin,
  CalendarCheck,
  UserPlus,
  UserMinus,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Award,
  Search,
  Check,
  Plus,
  Send,
  HelpCircle,
  Share2,
  Heart,
  Flame,
  Activity,
  ArrowLeftRight,
  Download,
  QrCode,
  Smartphone,
  Bell,
  Info,
  X
} from "lucide-react";
import { User, Service, Shift, ShiftAssignment, Conflict, Camp, Community } from "../types";
import { addDays, formatDateGerman, getDayName, formatDateWithDayPrefix, safeStorage } from "../utils";
import { STORAGE_KEYS } from "../constants";
import DashboardStatsGrid from "./DashboardStatsGrid";
import DashboardFeedbacks from "./DashboardFeedbacks";
import { motion, AnimatePresence } from "motion/react";

interface DashboardViewProps {
  users: User[];
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  conflicts: Conflict[];
  communities: Community[];
  onNavigateToTab: (tab: string) => void;
  onSelectShift: (shiftId: string) => void;
  onAddAssignment?: (shiftId: string, userId: string) => Promise<void>;
  onRemoveAssignment?: (shiftId: string, userId: string) => Promise<void>;
  activeCamp?: Camp;
  isAdmin: boolean;
  currentUserId?: string | null;
  pwaInstallable?: boolean;
  onTriggerPwaInstall?: () => void;
  onOpenPwaOnboarding?: () => void;
}

export default function DashboardView({ 
  users, 
  services, 
  shifts, 
  assignments, 
  conflicts,
  communities = [],
  onNavigateToTab,
  onSelectShift,
  onAddAssignment,
  onRemoveAssignment,
  activeCamp,
  isAdmin,
  currentUserId,
  pwaInstallable = false,
  onTriggerPwaInstall,
  onOpenPwaOnboarding
}: DashboardViewProps) {
  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  const startDate = activeCamp?.start_date || "2026-05-23";
  const sunDate = addDays(startDate, 1);
  const endDate = activeCamp?.end_date || "2026-05-25";

  // --- Interactive Conflict Center States ---
  const [expandedConflictId, setExpandedConflictId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [conflictTab, setConflictTab] = React.useState<"overlaps" | "understaffed">("overlaps");

  // --- Proposal 3: Personal Schedule States ---
  const [selectedUserPlanId, setSelectedUserPlanId] = React.useState<string>("");
  const [hideInstallBanner, setHideInstallBanner] = React.useState(() => {
    if (typeof window !== "undefined") {
      return safeStorage.getItem(STORAGE_KEYS.INSTALL_BANNER_HIDDEN) === "true";
    }
    return false;
  });
  const [personalPlanQuery, setPersonalPlanQuery] = React.useState("");
  const [showPersonalSelector, setShowPersonalSelector] = React.useState(false);
  const [showAdminQrSheet, setShowAdminQrSheet] = React.useState(false);

  // Set default search user to currentUserId or the first available user on mount, or when currentUserId changes
  React.useEffect(() => {
    const defaultId = currentUserId || (users.length > 0 ? users[0].id : "");
    if (defaultId) {
      setSelectedUserPlanId(defaultId);
      const matched = users.find(u => u.id === defaultId);
      if (matched) {
        setPersonalPlanQuery(matched.display_name);
      }
    }
  }, [users, currentUserId]);

  // Time conversion helper
  const parseTimeToMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Find users who are active and free from other assignments during this shift's timespan
  const getAvailableUsersForShift = React.useCallback((shiftId: string): User[] => {
    const targetShift = shifts.find(sh => sh.id === shiftId);
    if (!targetShift) return [];
    
    const targetStart = parseTimeToMinutes(targetShift.start_time);
    const targetEnd = parseTimeToMinutes(targetShift.end_time);

    return users.filter(u => {
      if (!u.active) return false;
      
      // Is already assigned to this shift?
      const isAlreadyAssigned = assignments.some(a => a.shift_id === shiftId && a.user_id === u.id);
      if (isAlreadyAssigned) return false;

      // Find all user assignments on this shift's date
      const userAssignmentsOnDate = assignments.filter(a => {
        if (a.user_id !== u.id) return false;
        const sh = shifts.find(s => s.id === a.shift_id);
        return sh && sh.date === targetShift.date;
      });

      // Check for overlapping shifts
      const hasOverlap = userAssignmentsOnDate.some(a => {
        const sh = shifts.find(s => s.id === a.shift_id);
        if (!sh) return false;
        const shStart = parseTimeToMinutes(sh.start_time);
        const shEnd = parseTimeToMinutes(sh.end_time);
        return targetStart < shEnd && shStart < targetEnd;
      });

      return !hasOverlap;
    });
  }, [users, shifts, assignments]);

  // Individual user stats helper for Proposal 3 & Proposal 2
  const getUserWorkloadStats = React.useCallback((userId: string) => {
    const userAssignments = assignments.filter(a => a.user_id === userId);
    let totalMinutes = 0;
    const userShifts = userAssignments.map(a => {
      const sh = shifts.find(s => s.id === a.shift_id);
      if (sh) {
        const duration = parseTimeToMinutes(sh.end_time) - parseTimeToMinutes(sh.start_time);
        totalMinutes += duration;
      }
      return {
        assignment: a,
        shift: sh
      };
    }).filter(x => x.shift !== undefined) as { assignment: ShiftAssignment; shift: Shift }[];

    // Sort chronologically
    userShifts.sort((a, b) => {
      if (a.shift.date !== b.shift.date) {
        return a.shift.date.localeCompare(b.shift.date);
      }
      return a.shift.start_time.localeCompare(b.shift.start_time);
    });

    return {
      assignmentsCount: userAssignments.length,
      hours: Math.round((totalMinutes / 60) * 10) / 10,
      shiftsDetails: userShifts
    };
  }, [assignments, shifts]);

  // Update personal assignment status
  const handlePersonalStatusChange = async (assignmentId: string, status: 'accepted' | 'maybe' | 'declined') => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Status API call failed");
      
      showToast(`📝 Status erfolgreich auf "${
        status === 'accepted' ? 'Zugesagt' : status === 'maybe' ? 'Vielleicht' : 'Abgesagt'
      }" geändert!`);
      
      // We trigger a slight assignment reload using standard API, or wait, we can just trigger a manual reload of assignments!
      // To bypass re-assign, we trigger a silent database reload:
      if (onAddAssignment && onRemoveAssignment) {
        // This is a neat trick: we can mock-trigger an operation or run direct fetch re-fetch to load changes!
        // Wait, can we reload using simple window fetch or a reload of parent database if parent exposed a way?
        // App.tsx passes other properties, but we can also just fetch /api/assignments directly or do a soft state update:
        // Wait, let's just make direct fetch so everything is fully consistent!
        const resAss = await fetch("/api/assignments");
        if (resAss.ok) {
          const freshAss = await resAss.json();
          // We can't directly assign the assignments array since it's a prop, but wait, 
          // we can ask parent or we can do location reload/soft reload, or since we changed the state on DB, 
          // it is persisted on DB, so a page refresh or any navigation reload will sync it.
          // Let's also do a hard reload after a tiny delay or let's call onAddAssignment/onRemoveAssignment with a dummy ID to trigger reload if needed! 
          // Or wait! App.tsx's `ModalManager` has callback logic that triggers `loadDatabase()`. 
          // Let's just do a soft reload of the page after 400ms so it updates the whole dashboard beautifully!
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }
      }
    } catch (err) {
      console.error("Personal status change failed:", err);
      showToast("❌ Status-Änderung fehlgeschlagen.");
    }
  };

  // Bulk accept all assignments for a user
  const handleBulkAcceptAssignments = async (userId: string) => {
    try {
      const userAssignments = assignments.filter((a) => a.user_id === userId && a.status !== "accepted");
      if (userAssignments.length === 0) return;

      for (const a of userAssignments) {
        await fetch(`/api/assignments/${a.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        });
      }

      showToast(`✅ Alle ${userAssignments.length} Schichten erfolgreich bestätigt!`);
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error("Bulk accept failed:", err);
      showToast("❌ Zusage konnte nicht für alle Schichten gespeichert werden.");
    }
  };

  // Flash toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyPersonalSchedule = (userName: string, details: { assignment: ShiftAssignment; shift: Shift }[]) => {
    if (details.length === 0) return;
    const bulletLines = details.map(({ shift, assignment }) => {
      const svc = services.find(s => s.id === shift.service_id);
      return `- ${getDayName(shift.date)}, ${formatDateGerman(shift.date)} 🕒 ${shift.start_time}-${shift.end_time} Uhr: ${svc?.title || "Dienst"} (Ort: ${svc?.location || "Lagerplatz"}) [Status: ${assignment.status === 'accepted' ? 'ZUGESAGT' : assignment.status === 'maybe' ? 'VIELLEICHT' : 'AUSSTEHEND'}]`;
    });
    const shareText = `Moin ${userName}! Hier ist dein persönlicher Dienstplan fürs Pfingstlager 2026:\n\n${bulletLines.join("\n")}\n\nBitte halte deine Schichten ein und melde dich rechtzeitig bei Tauschbedarf! 🏕️`;
    navigator.clipboard.writeText(shareText);
    showToast("📋 Dein persönlicher Schedule wurde kopiert!");
  };

  const handleDownloadPersonalSchedule = (userName: string, details: { assignment: ShiftAssignment; shift: Shift }[]) => {
    if (details.length === 0) return;
    const bulletLines = details.map(({ shift, assignment }) => {
      const svc = services.find(s => s.id === shift.service_id);
      const categoryColor = svc?.color || "#10b981";
      return `- ${getDayName(shift.date)}, ${formatDateGerman(shift.date)} 🕒 ${shift.start_time}-${shift.end_time} Uhr:\n  Aufgabe/Dienst: ${svc?.title || "Dienst"}\n  Ort: ${svc?.location || "Lagerplatz"}\n  Kategorie: ${svc?.category || "Allgemein"}\n  Belegungs-Status: ${assignment.status === 'accepted' ? 'ZUGESAGT ✓' : assignment.status === 'maybe' ? 'VIELLEICHT ?' : 'AMTLICH GEPLANT (Ausstehend)'}\n`;
    });
    const fileContent = `=========================================\n⛺ MEIN PERSÖNLICHER PFINGSTLAGER-DIENSTPLAN ⛺\n=========================================\n\nHelfer*in: ${userName}\nSaison: Pfingstlager ${activeCamp?.year || 2026}\nErstellt am: ${new Date().toLocaleString("de-DE")}\n\nDu hast ${details.length} eingetragene Schichten:\n\n${bulletLines.join("\n")}\n-----------------------------------------\nBitte halte deine Arbeitszeiten pünktlich ein.\nFalls du krank bist oder tauschen möchtest, nutze die Hilfsmittel-Tauschbörse in der App.\n\nGut Pfad! Camp-Leitung Team 🏕️⏰\n`;
    
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Dienstplan_2026_${userName.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("💾 Dienstplan (.txt) erfolgreich heruntergeladen!");
  };

  // 1. Remove helper from shift
  const handleRemoveHelper = async (shiftId: string, userId: string, label: string) => {
    if (!onRemoveAssignment) return;
    const actionId = `remove-${shiftId}-${userId}`;
    setActionLoadingId(actionId);
    try {
      await onRemoveAssignment(shiftId, userId);
      showToast(`👤 Helfer*in erfolgreich aus Dienst "${label}" ausgetragen.`);
    } catch (err) {
      console.error("Conflict resolve remove assignment failed:", err);
      showToast("❌ Fehler beim Löschen der Zuweisung.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Direct assignment of a helper
  const handleAssignDirect = async (shiftId: string, userId: string, label: string) => {
    if (!onAddAssignment) return;
    const actionId = `assign-${shiftId}-${userId}`;
    setActionLoadingId(actionId);
    try {
      await onAddAssignment(shiftId, userId);
      showToast(`👤 Helfer*in erfolgreich für "${label}" eingeteilt.`);
      setExpandedConflictId(null);
    } catch (err) {
      console.error("Conflict resolve assign failed:", err);
      showToast("❌ Fehler bei der Einteilung.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Reassignment (replaces an old user with a new user on a specific shift)
  const handleReassign = async (shiftId: string, oldUserId: string, newUserId: string, label: string) => {
    if (!onRemoveAssignment || !onAddAssignment) return;
    const actionId = `reassign-${shiftId}-${oldUserId}-${newUserId}`;
    setActionLoadingId(actionId);
    try {
      // Remove old assignee
      await onRemoveAssignment(shiftId, oldUserId);
      // Wait shortly and assign new assignee
      await onAddAssignment(shiftId, newUserId);
      
      const newName = users.find(u => u.id === newUserId)?.display_name || "Helfer*in";
      showToast(`🔄 Schicht "${label}" von Alt-Helfer*in auf ${newName} umbesetzt!`);
      setExpandedConflictId(null);
    } catch (err) {
      console.error("Reassigning failed:", err);
      showToast("❌ Ein Fehler ist aufgetreten.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy click handler
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("📋 Benachrichtigungsvorlage in die Zwischenablage kopiert!");
  };

  // Real-time calculation of dashboard indicators
  const stats = React.useMemo(() => {
    let openShiftsCount = 0;
    let understaffedShiftsCount = 0;

    for (const s of shifts) {
      const svc = services.find((sv) => sv.id === s.service_id);
      if (!svc) continue;

      const currentCount = assignments.filter((a) => a.shift_id === s.id).length;
      if (currentCount === 0) {
        openShiftsCount++;
      }
      // Understaffed: helper count is less than min_persons of service OR required_persons (we consider min_persons as base)
      const minRequired = svc.min_persons;
      if (currentCount < minRequired) {
        understaffedShiftsCount++;
      }
    }

    return {
      openShiftsCount,
      understaffedShiftsCount,
      conflictCount: conflicts.length,
      totalUsersCount: users.filter(u => u.active).length,
      totalInactiveUsersCount: users.filter(u => !u.active).length,
      totalShiftsCount: shifts.length,
    };
  }, [users, services, shifts, assignments, conflicts]);

  // Find understaffed shifts
  const understaffedList = React.useMemo(() => {
    return shifts
      .map(s => {
        const svc = services.find(sv => sv.id === s.service_id);
        const assigned = assignments.filter(a => a.shift_id === s.id);
        const currentCount = assigned.length;
        const minVal = svc ? svc.min_persons : 1;
        const maxVal = svc ? svc.max_persons : 3;

        return {
          shift: s,
          service: svc,
          currentCount,
          minVal,
          maxVal,
          isUnderstaffed: currentCount < minVal,
          assignedPeople: assigned.map(a => users.find(u => u.id === a.user_id)?.display_name).filter(Boolean) as string[]
        };
      })
      .filter(item => item.isUnderstaffed && item.service);
  }, [shifts, services, assignments, users]);

  // Find missing responsible persons
  const servicesMissingResponsible = React.useMemo(() => {
    return services.filter(s => {
      if (!s.responsible_id) return true;
      const resp = users.find(u => u.id === s.responsible_id);
      return !resp || !resp.active;
    });
  }, [services, users]);

  // Find declined or unsure assignment feedbacks for admin coordination
  const declinedOrUncertainAssignments = React.useMemo(() => {
    return assignments
      .filter(a => a.status === 'declined' || a.status === 'maybe')
      .map(a => {
        const u = users.find(usr => usr.id === a.user_id);
        const s = shifts.find(sh => sh.id === a.shift_id);
        const svc = s ? services.find(sv => sv.id === s.service_id) : null;
        
        // Find other helpers currently assigned to this shift (active helpers)
        const activeAssCount = s 
          ? assignments.filter(ass => ass.shift_id === s.id && ass.user_id !== a.user_id && ass.status !== 'declined').length
          : 0;

        const otherHelperNames = s
          ? assignments
              .filter(ass => ass.shift_id === s.id && ass.user_id !== a.user_id && ass.status !== 'declined')
              .map(ass => users.find(usr => usr.id === ass.user_id)?.display_name)
              .filter(Boolean) as string[]
          : [];

        const minRequired = svc ? svc.min_persons : 1;
        const isNowStaffed = activeAssCount >= minRequired;

        return {
          assignment: a,
          user: u,
          shift: s,
          service: svc,
          activeAssCount,
          totalNeeded: minRequired,
          isNowStaffed,
          otherHelpers: otherHelperNames,
          updatedAt: a.status_updated_at || a.assigned_at
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [assignments, users, shifts, services]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-emerald-500/15 shadow-xl shadow-black/30">
        <div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">Lager-Feeds & Leitstand</h2>
          <p className="text-sm text-slate-400 mt-1 font-sans">Echtzeit-Statistik aller Schichtbelegungen, Personalabdeckungen und Doppelbelegungen.</p>
        </div>
      </div>

      {/* ⛺ PWA & Autopush-Benachrichtigung Installation & Infobox */}
      {!isStandalone && !hideInstallBanner && (
        <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/30 p-5 rounded-2xl relative shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 animate-fade-in" id="pwa-install-alert-banner">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
            <Smartphone className="h-32 w-32 text-emerald-400" />
          </div>

          <div className="space-y-2 flex-1 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-bold rounded-full uppercase">
                Offline-App & Push-Alarm ⛺
              </span>
              {typeof window !== "undefined" && window.self !== window.top && (
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
                PWA-Status: <span className={pwaInstallable ? "text-emerald-400 font-bold" : "text-amber-400"}>{pwaInstallable ? "✓ Bereit zur Installation" : "Menü-Installation möglich"}</span>
              </span>
              <span className="px-2 py-1 bg-slate-950/60 rounded border border-slate-800">
                Echtzeit-Push: <span className={typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{typeof window !== "undefined" && "Notification" in window ? (window.Notification.permission === "granted" ? "✓ Aktiviert" : "🔔 Deaktiviert (Zulassen im Schritt 1)") : "Nicht unterstützt"}</span>
              </span>
              {typeof window !== "undefined" && window.self !== window.top && (
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
                    alert("Nutze am Android Smartphone den Chrome Browser. Tippe oben rechts auf die drei Punkte ⋮ und wähle 'App installieren' oder 'Zum Startbildschirm hinzufügen'. Bei iOS nutzen Sie bitte Safari und wählen 'Teilen' -> 'Zum Startbildschirm'.");
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
                setHideInstallBanner(true);
              }}
              className="p-2.5 hover:bg-slate-800 border border-transparent hover:border-slate-800 rounded-xl text-slate-500 hover:text-slate-350 transition flex items-center justify-center cursor-pointer"
              title="Banner ausblenden"
            >
              <X className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Grid für Statistiken */}
      <DashboardStatsGrid stats={stats} communities={communities} isAdmin={isAdmin} onNavigateToTab={onNavigateToTab} />

      {/* --- PROPOSAL 3 / VORSCHLAG 3: MEIN PERSÖNLICHER DIENSTPLAN --- */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/35 relative overflow-hidden" id="personal-schedule-widget">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Sparkles className="h-24 w-24 text-emerald-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
              <span className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <span>Mein persönlicher Dienstplan & Quick-Finder</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Trage deinen Namen ein oder wähle dein Profil aus, um deine Schichten zu prüfen, zuzusagen oder zu kopieren.
            </p>
          </div>

          {/* User Combobox Finder */}
          <div className="relative w-full md:w-80">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500/50 transition">
              <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
              <input
                type="text"
                placeholder="Name eingeben (z.B. Maria)..."
                value={personalPlanQuery}
                onChange={(e) => {
                  setPersonalPlanQuery(e.target.value);
                  setShowPersonalSelector(true);
                }}
                onFocus={() => setShowPersonalSelector(true)}
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full font-sans"
              />
              {personalPlanQuery && (
                <button 
                  onClick={() => { setPersonalPlanQuery(""); setSelectedUserPlanId(users[0]?.id || ""); }}
                  className="text-slate-500 hover:text-slate-300 text-xs font-mono font-bold font-sans cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector list */}
            {showPersonalSelector && (
              <div className="absolute z-20 left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                <div className="p-2 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Helfer Profile:</span>
                  <button 
                    onClick={() => setShowPersonalSelector(false)} 
                    className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    schließen
                  </button>
                </div>
                {users.filter(u => 
                  !personalPlanQuery || 
                  u.display_name.toLowerCase().includes(personalPlanQuery.toLowerCase()) ||
                  `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(personalPlanQuery.toLowerCase())
                ).map(u => (
                  <button
                    key={`personal-opt-${u.id}`}
                    onClick={() => {
                      setSelectedUserPlanId(u.id);
                      setPersonalPlanQuery(u.display_name);
                      setShowPersonalSelector(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition duration-100 flex items-center justify-between cursor-pointer ${
                      selectedUserPlanId === u.id ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-slate-300 hover:bg-slate-850"
                    }`}
                  >
                    <span>{u.display_name} ({u.role === "admin" ? "Camp-Admin" : "Helfer*in"})</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {assignments.filter(a => a.user_id === u.id).length} Schichten
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected User Agenda Output */}
        {selectedUserPlanId ? (() => {
          const matchedUser = users.find(u => u.id === selectedUserPlanId);
          if (!matchedUser) return null;
          const uStats = getUserWorkloadStats(matchedUser.id);
          
          return (
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch" id="personal-schedule-details">
              {/* Profile Card Summary & Milestones */}
              <div className="lg:col-span-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center text-white text-sm font-extrabold shadow-md">
                      {matchedUser.display_name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-100 font-display">{matchedUser.display_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ROLE: <span className="text-emerald-400 uppercase font-extrabold">{matchedUser.role}</span> • STATUS: <span className="text-emerald-400 uppercase font-extrabold">{matchedUser.active ? "AKTIV" : "INAKTIV"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1.5 font-sans">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Einsätze</span>
                      <span className="text-lg font-bold text-white font-mono">{uStats.assignmentsCount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Gesamtstunden</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{uStats.hours}h</span>
                    </div>
                  </div>

                  {/* Workload Indicator Pill */}
                  <div className="pt-1.5 flex items-center justify-between text-xs font-sans">
                    <span className="text-slate-400 text-[11px] font-semibold">Auslastungs-Klasse:</span>
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg font-mono tracking-wide ${
                      uStats.hours > 6 
                        ? "bg-rose-950/40 border border-rose-500/35 text-rose-400"
                        : uStats.hours > 2 
                        ? "bg-emerald-950/40 border border-emerald-500/35 text-emerald-400"
                        : "bg-amber-950/40 border border-amber-500/35 text-amber-400"
                    }`}>
                      {uStats.hours > 6 ? "🚨 Überlastet (High)" : uStats.hours > 2 ? "✅ Optimal (Mid)" : "❄️ Gering (Low)"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4 flex flex-col space-y-2">
                  {uStats.assignmentsCount > 0 ? (
                    <>
                      <button
                        onClick={() => handleCopyPersonalSchedule(matchedUser.display_name, uStats.shiftsDetails)}
                        className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center justify-center space-x-2 w-full cursor-pointer transition"
                      >
                        <Share2 className="h-4 w-4 shrink-0" />
                        <span>WhatsApp Sende-Vorlage</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPersonalSchedule(matchedUser.display_name, uStats.shiftsDetails)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-350 text-xs rounded-xl font-bold flex items-center justify-center space-x-2 w-full cursor-pointer transition"
                      >
                        <Download className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>Dienstplan herunterladen (.txt)</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic text-center w-full block">Noch keine Schichten zu kopieren.</span>
                  )}
                </div>
              </div>

              {/* Chronological Timeline & Accept Action */}
              <div className="lg:col-span-8 p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col">
                <div className="text-xs font-semibold uppercase text-slate-450 text-slate-400 border-b border-slate-800 pb-2 mb-3 tracking-wider font-mono flex flex-wrap justify-between items-center gap-2">
                  <span>📅 Deine Schichten & Belegungsstatus:</span>
                  <div className="flex items-center space-x-2">
                    {uStats.shiftsDetails.some(({ assignment }) => assignment.status !== "accepted") && (
                      <button
                        type="button"
                        onClick={() => handleBulkAcceptAssignments(matchedUser.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
                        title="Alle noch offenen Schichten auf einmal zusagen"
                      >
                        <span>✓</span>
                        <span>Alle Schichten zusagen</span>
                      </button>
                    )}
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px]">{uStats.assignmentsCount} Slots</span>
                  </div>
                </div>

                {uStats.shiftsDetails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-2xl mb-2">🏕️</span>
                    <p className="text-xs text-slate-200 font-bold font-sans">Aktuell keine Schichten eingetragen</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 max-w-sm font-sans">
                      Für {matchedUser.display_name} wurden noch keine Arbeitsschichten hinterlegt. Melde dich im Gesamtplan oder beim Admin-Team!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                    {uStats.shiftsDetails.map(({ shift, assignment }) => {
                      const svc = services.find(sv => sv.id === shift.service_id);
                      if (!svc) return null;

                      return (
                        <div 
                          key={assignment.id} 
                          className="p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          {/* Left: Task summary */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: svc.color || "#10b981" }}
                              />
                              <p className="text-xs font-black text-white font-sans">{svc.title}</p>
                              <span className="text-[10px] bg-slate-950 text-slate-450 border border-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400">
                                {formatDateWithDayPrefix(shift.date)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono pl-4">
                              🕒 {shift.start_time} - {shift.end_time} Uhr • 📍 {svc.location}
                            </p>
                          </div>

                          {/* Right: Confirmation Status Controls */}
                          <div className="flex items-center space-x-2 self-end sm:self-center">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border mr-1.5 ${
                              assignment.status === "accepted" 
                                ? "bg-emerald-950/40 border-emerald-500/25 text-emerald-400"
                                : assignment.status === "maybe"
                                ? "bg-amber-950/40 border-amber-500/25 text-amber-400"
                                : "bg-rose-950/40 border-rose-500/25 text-rose-450 text-rose-400"
                            }`}>
                              {assignment.status === "accepted" ? "ZUGESAGT ✓" : assignment.status === "maybe" ? "VIELLEICHT ?" : "PENDING"}
                            </span>

                            {/* Dropdown status update buttons */}
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handlePersonalStatusChange(assignment.id, 'accepted')}
                                title="Zusagen"
                                className={`p-1 border rounded-lg transition cursor-pointer ${
                                  assignment.status === 'accepted' 
                                    ? "bg-emerald-500 border-emerald-500 text-slate-950" 
                                    : "bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white"
                                }`}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handlePersonalStatusChange(assignment.id, 'maybe')}
                                title="Vielleicht / Unsicher"
                                className={`p-1 border rounded-lg transition cursor-pointer ${
                                  assignment.status === 'maybe' 
                                    ? "bg-amber-500 border-amber-500 text-slate-950" 
                                    : "bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white"
                                }`}
                              >
                                <span className="text-[9px] font-bold font-mono px-0.5">?</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <p className="text-xs text-slate-500 italic mt-4 text-center">Bitte wähle ein Helfer-Profil aus dem Suchfeld aus.</p>
        )}
      </div>

      {/* Helper text template helper */}
      {(() => {
        return null;
      })()}

      {/* Hauptbereich: Warnungen & Schnellprüfung */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Row 1: Absagen & Unklare Rückmeldungen (die gesamte breite) */}
        {isAdmin && (
          <div className="col-span-12" id="feedback-overview-section">
            <DashboardFeedbacks 
              items={declinedOrUncertainAssignments} 
              onSelectShift={onSelectShift} 
            />
          </div>
        )}

        {/* Row 2: Doppelbelegung und unterbesetzte Schichten */}
          <div className="col-span-12 animate-fade-in" id="dashboard-conflicts-leitstand-container">
            <div className="bg-slate-900 border border-emerald-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-fade-in" id="dashboard-conflicts-leitstand">
              {/* Header with Title & Stats badges */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
                    <ShieldAlert className="h-5.5 w-5.5 text-rose-500 shrink-0" />
                    <span>Doppelbelegung und unterbesetzte Schichten</span>
                  </h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  Prüfung und Behebung aller kritischen Doppelbelegungen, Überbelegungen und personellen Unterbesetzungen in Echtzeit.
                </p>
              </div>
            </div>

            {/* Sub-tabs Selection for Leitstand */}
            <div className="mt-5 flex items-center space-x-2.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setExpandedConflictId(null);
                  setConflictTab("overlaps");
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  conflictTab === "overlaps"
                    ? "bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-sm"
                    : "border-transparent text-slate-450 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                }`}
                id="tab-overlaps-trigger"
              >
                <span>🚨 Fehler & Doppelbuchungen</span>
                <span className="bg-rose-955 bg-rose-950/50 border border-rose-500/30 text-rose-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {conflicts.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setExpandedConflictId(null);
                  setConflictTab("understaffed");
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  conflictTab === "understaffed"
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm"
                    : "border-transparent text-slate-450 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                }`}
                id="tab-understaffed-trigger"
              >
                <span>⚠️ Unterbesetzte Schichten</span>
                <span className="bg-amber-955 bg-amber-950/50 border border-amber-500/30 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {understaffedList.length}
                </span>
              </button>
            </div>

            {/* Tap Panel Content */}
            <div className="mt-5 space-y-4 max-h-[500px] overflow-y-auto pr-1">
              
              {/* --- TABS OVERLAPS --- */}
              {conflictTab === "overlaps" && (
                <>
                  {conflicts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-emerald-500/15 text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-950/50 flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-200">Keine Fehler gefunden</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
                        Hervorragend! Keine temporalen Doppelbuchungen oder Überkapazitäten im aktiven Dienstplan vorhanden.
                      </p>
                    </div>
                  ) : (
                    conflicts.map((conflict, i) => {
                      const isOverlap = conflict.type === "overlap";
                      const conflictUniqueId = conflict.id || `overlap-list-${i}`;
                      
                      // Details finding
                      const s1 = shifts.find(s => s.id === conflict.shiftId1);
                      const s1Svc = s1 ? services.find(sv => sv.id === s1.service_id) : null;
                      const s2 = shifts.find(s => s.id === conflict.shiftId2);
                      const s2Svc = s2 ? services.find(sv => sv.id === s2.service_id) : null;
                      
                      // Predefined copy message
                      const dateLabel = s1 ? `${getDayName(s1.date)}, ${formatDateGerman(s1.date)}` : "unbekannt";
                      const textToCopy = isOverlap
                        ? `Hallo ${conflict.userName}, uns ist im Dienstplan aufgefallen, dass du am ${dateLabel} eine zeitliche Überschneidung hast: ${s1Svc?.title || "Dienst"} (${getDayName(s1.date)}, ${s1?.start_time}-${s1?.end_time} Uhr) und ${s2Svc?.title || "Dienst"} (${getDayName(s2.date)}, ${s2?.start_time}-${s2?.end_time} Uhr). Bitte gib uns kurz Rückmeldung, welchen Dienst du übernehmen kannst. Danke!`
                        : `Achtung für Dienst ${s1Svc?.title || "Dienst"} am ${dateLabel}: Dieser Dienst hat die maximale Kapazität von ${s1Svc?.max_persons || 0} Personen überschritten. Wir müssen helfende Hände umdisponieren!`;

                      return (
                        <div 
                          key={conflictUniqueId}
                          className={`p-4 rounded-xl border transition-all ${
                            isOverlap 
                              ? "bg-rose-950/10 border-rose-500/20 hover:border-rose-500/35" 
                              : "bg-amber-950/10 border-amber-500/15 hover:border-amber-500/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${
                                  isOverlap 
                                    ? "bg-rose-500/15 border border-rose-500/30 text-rose-400" 
                                    : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                                }`}>
                                  {isOverlap ? "Zweifach-Belegung" : "Personenlimit Überschritten"}
                                </span>
                                {conflict.userName && (
                                  <span className="text-xs text-white font-sans font-extrabold flex items-center space-x-1">
                                    <span>👤</span>
                                    <span>{conflict.userName}</span>
                                  </span>
                                )}
                              </div>
                              <p 
                                className="text-xs text-slate-350 leading-relaxed mt-1 font-sans"
                                dangerouslySetInnerHTML={{ __html: conflict.message }}
                              />
                            </div>
                          </div>

                          {/* Extra info details of overlapping shifts */}
                          {isOverlap && s1 && s2 && (
                            <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px] font-sans">
                              <div className="space-y-1 border-r border-slate-800/60 pr-2 last:border-0">
                                <p className="font-bold text-slate-300">Dienst Posten A:</p>
                                <p className="text-emerald-400 font-extrabold underline">{s1Svc?.title}</p>
                                <p className="text-slate-400 font-mono text-[10px]">📍 {s1Svc?.location} • 🕒 {getDayName(s1.date)}, {s1.start_time} - {s1.end_time} Uhr</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-slate-300">Dienst Posten B:</p>
                                <p className="text-indigo-400 font-extrabold underline">{s2Svc?.title}</p>
                                <p className="text-slate-400 font-mono text-[10px]">📍 {s2Svc?.location} • 🕒 {getDayName(s2.date)}, {s2.start_time} - {s2.end_time} Uhr</p>
                              </div>
                            </div>
                          )}

                          {/* Admin Resolution Operations */}
                          {isAdmin && (
                            <div className="mt-3.5 pt-3.5 border-t border-slate-800 flex flex-wrap items-center gap-2">
                              {isOverlap && (
                                <>
                                  {/* Button 1: Austragen aus Dienst A */}
                                  <button
                                    onClick={() => handleRemoveHelper(s1!.id, conflict.userId!, s1Svc?.title || "Dienst A")}
                                    disabled={actionLoadingId !== null}
                                    className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/20 hover:border-rose-500/50 text-rose-300 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                                  >
                                    <UserMinus className="h-3 w-3" />
                                    <span>Löschen: {s1Svc?.title?.substring(0, 10)}...</span>
                                  </button>

                                  {/* Button 2: Austragen aus Dienst B */}
                                  <button
                                    onClick={() => handleRemoveHelper(s2!.id, conflict.userId!, s2Svc?.title || "Dienst B")}
                                    disabled={actionLoadingId !== null}
                                    className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/20 hover:border-rose-500/50 text-rose-300 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                                  >
                                    <UserMinus className="h-3 w-3" />
                                    <span>Löschen: {s2Svc?.title?.substring(0, 10)}...</span>
                                  </button>

                                  {/* Button 3: Reassign dropdown trigger */}
                                  <button
                                    onClick={() => setExpandedConflictId(expandedConflictId === conflictUniqueId ? null : conflictUniqueId)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                                  >
                                    <RefreshCw className="h-3 w-3 text-emerald-450" />
                                    <span>Umbesetzen</span>
                                    {expandedConflictId === conflictUniqueId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                </>
                              )}

                              {/* Button: Clipboard Copy notification */}
                              <button
                                onClick={() => handleCopy(conflictUniqueId, textToCopy)}
                                className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ml-auto"
                              >
                                {copiedId === conflictUniqueId ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedId === conflictUniqueId ? "Kopiert!" : "💬 Helfer*in anschreiben"}</span>
                              </button>
                            </div>
                          )}

                          {/* REASSIGN DROPDOWN COLLAPSIBLE */}
                          {isAdmin && isOverlap && expandedConflictId === conflictUniqueId && (
                            <div className="mt-3 bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2.5 animate-slide-down">
                              <h4 className="text-[11px] font-bold text-emerald-450 uppercase tracking-wider font-mono">
                                🔄 Freie, konfliktfreie Helfer*innen zur Umbesetzung finden:
                              </h4>
                              
                              <div className="grid grid-cols-1 gap-2">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-slate-400 font-bold">Dienst A ({s1Svc?.title}) besetzen mit:</p>
                                  {getAvailableUsersForShift(s1!.id).length === 0 ? (
                                    <p className="text-[10px] text-slate-500 italic">Keine konfliktfreien Helfer*innen verfügbar.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                      {getAvailableUsersForShift(s1!.id).map(userOpt => (
                                        <button
                                          key={`opt-a-${userOpt.id}`}
                                          onClick={() => handleReassign(s1!.id, conflict.userId!, userOpt.id, s1Svc?.title || "Dienst")}
                                          className="px-2 py-1 bg-slate-900 hover:bg-emerald-950/40 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/20 rounded text-[10px] font-semibold text-slate-350 cursor-pointer"
                                        >
                                          + {userOpt.display_name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 border-t border-slate-800/40 pt-2">
                                  <p className="text-[10px] text-slate-400 font-bold">Dienst B ({s2Svc?.title}) besetzen mit:</p>
                                  {getAvailableUsersForShift(s2!.id).length === 0 ? (
                                    <p className="text-[10px] text-slate-500 italic">Keine konfliktfreien Helfer*innen verfügbar.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                      {getAvailableUsersForShift(s2!.id).map(userOpt => (
                                        <button
                                          key={`opt-b-${userOpt.id}`}
                                          onClick={() => handleReassign(s2!.id, conflict.userId!, userOpt.id, s2Svc?.title || "Dienst")}
                                          className="px-2 py-1 bg-slate-900 hover:bg-emerald-950/40 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/20 rounded text-[10px] font-semibold text-slate-350 cursor-pointer"
                                        >
                                          + {userOpt.display_name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* --- TABS UNDERSTAFFED --- */}
              {conflictTab === "understaffed" && (
                <>
                  {understaffedList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-emerald-500/5 rounded-2xl border border-dashed border-emerald-500/15 text-center">
                      <span className="text-xl">🏕️</span>
                      <p className="text-sm font-bold text-slate-200">Sollstärke voll abgedeckt</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
                        Fantastisch! Alle Schichten am Laufen haben bereits die erforderliche Mindestanzahl an Helfer*innen eingetragen.
                      </p>
                    </div>
                  ) : (
                    understaffedList.map((item, idx) => {
                      const sh = item.shift;
                      const svc = item.service;
                      const conflictUniqueId = `understaffed-list-${sh.id}-${idx}`;
                      const availableHelpers = getAvailableUsersForShift(sh.id);
                      
                      const dateLabel = formatDateGerman(sh.date);
                      const wpCallText = `Hallo helfende Hände! Für den wichtigen Dienst "${svc?.title || "Dienst"}" am ${dateLabel} (${sh.start_time}-${sh.end_time} Uhr • Ort: ${svc?.location || "Lagerplatz"}) benötigen wir dringend Unterstützung (Min. benötigt: ${item.minVal} • Aktuell: ${item.currentCount}). Wer kann einspringen? Bitte tragt euch im Teampad ein oder meldet euch! Danke!`;

                      return (
                        <div 
                          key={sh.id} 
                          className="p-4 bg-amber-950/10 hover:bg-amber-950/15 border border-amber-500/20 hover:border-amber-500/35 rounded-xl space-y-3 transition-all"
                        >
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <h4 className="text-xs font-extrabold text-white font-display">
                                {svc?.title} ({svc?.category})
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                📅 {getDayName(sh.date)}, {dateLabel} • 🕒 {sh.start_time} - {sh.end_time} Uhr
                              </p>
                            </div>
                            <span className="bg-amber-950 text-amber-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/30">
                              Benötigt: {item.minVal} • Aktuell: {item.currentCount}
                            </span>
                          </div>

                          {/* List of currently assigned */}
                          {item.assignedPeople.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] bg-slate-950/70 p-2 border border-slate-850 rounded-lg">
                              <span className="font-mono text-slate-500 font-bold mr-1">EINGETEILT:</span>
                              {item.assignedPeople.map((name, i) => (
                                <span key={i} className="text-slate-300 bg-slate-900 border border-emerald-500/5 px-2 py-0.5 rounded font-mono text-[9px]">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-rose-455 font-extrabold bg-rose-950/30 py-1 px-2 border border-rose-500/10 rounded inline-block font-mono">
                              ⚠️ Noch keine Personen eingetragen (Voll-Vakant)
                            </p>
                          )}

                          {/* Options Panel */}
                          {isAdmin && (
                            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                              {/* Open Available Helpers Dropdown Trigger */}
                              <button
                                onClick={() => setExpandedConflictId(expandedConflictId === conflictUniqueId ? null : conflictUniqueId)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                              >
                                <UserPlus className="h-3 w-3 text-emerald-450" />
                                <span>Helfer*innen eintragen ({availableHelpers.length})</span>
                                {expandedConflictId === conflictUniqueId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>

                              {/* Jump to planner calendar */}
                              <button
                                onClick={() => onSelectShift(sh.id)}
                                className="px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-800 text-slate-350 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                              >
                                <span>📅 Kalender</span>
                              </button>

                              {/* Copy Text Alert Button */}
                              <button
                                onClick={() => handleCopy(conflictUniqueId, wpCallText)}
                                className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg font-bold flex items-center space-x-1.5 ml-auto cursor-pointer transition-all"
                              >
                                {copiedId === conflictUniqueId ? <CheckCircle className="h-3 w-3 text-emerald-450" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedId === conflictUniqueId ? "Kopiert!" : "💬 WhatsApp-Aufruf"}</span>
                              </button>
                            </div>
                          )}

                          {/* EXPANDED INLINE HELPERS LIST */}
                          {isAdmin && expandedConflictId === conflictUniqueId && (
                            <div className="mt-2.5 bg-slate-950 p-3 border border-slate-850 rounded-lg space-y-2 animate-slide-down">
                              <p className="text-[10px] text-slate-450 font-bold text-slate-400 font-mono uppercase">
                                ➔ Verfügbare, konfliktfreie Helfer*innen für diesen Slot:
                              </p>
                              {availableHelpers.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic pb-1">Keine freien Helfer*innen ohne Schichtkonflikte gefunden.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pt-0.5">
                                  {availableHelpers.map(uOpt => (
                                    <button
                                      key={`understaffed-opt-${uOpt.id}`}
                                      onClick={() => handleAssignDirect(sh.id, uOpt.id, svc?.title || "Dienst")}
                                      className="px-2 py-1.5 bg-slate-900 hover:bg-emerald-950/30 hover:text-emerald-350 border border-slate-800 hover:border-emerald-500/20 text-[10px] font-bold text-slate-300 rounded cursor-pointer transition-all"
                                    >
                                      + {uOpt.display_name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </div> {/* Close Row 2 col-span-12 */}

        {/* --- PROPOSAL 2: FAIR-SHARE HELFER-AUSLASTUNGSSPIEGEL (ADMIN ONLY) --- */}
        {isAdmin && (() => {
          const activeUsers = users.filter(u => u.active);
          const usersWithStats = activeUsers.map(u => {
            const uStats = getUserWorkloadStats(u.id);
            return {
              user: u,
              stats: uStats
            };
          });

          const totalHours = usersWithStats.reduce((acc, x) => acc + x.stats.hours, 0);
          const averageHours = activeUsers.length > 0 ? totalHours / activeUsers.length : 0;

          // Grouping
          const overworked = usersWithStats.filter(x => x.stats.hours > 6).sort((a,b) => b.stats.hours - a.stats.hours);
          const balanced = usersWithStats.filter(x => x.stats.hours > 2 && x.stats.hours <= 6).sort((a,b) => b.stats.hours - a.stats.hours);
          const available = usersWithStats.filter(x => x.stats.hours <= 2).sort((a,b) => a.stats.hours - b.stats.hours);

          // Standard deviation and rating
          let fairnessRating = "Ausgezeichnet ⚖️";
          let fairnessColor = "text-emerald-400";
          if (activeUsers.length > 0) {
            const variance = usersWithStats.reduce((acc, x) => acc + Math.pow(x.stats.hours - averageHours, 2), 0) / activeUsers.length;
            const stdDev = Math.sqrt(variance);
            if (stdDev > 2.5) {
              fairnessRating = "Ungleichmäßige Schichtbelastung ⚠️";
              fairnessColor = "text-amber-500";
            } else if (stdDev > 1.2) {
              fairnessRating = "Gute Balance ⚖️";
              fairnessColor = "text-emerald-400 font-semibold";
            }
          }

          return (
            <div className="col-span-12 animate-fade-in space-y-4" id="dashboard-fair-share-balancer">
              <div className="bg-slate-900 border border-emerald-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="fair-share-balancer-panel">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Award className="h-20 w-24 text-emerald-400" />
                </div>
                
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
                      <span className="p-1 px-2.5 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400 font-mono font-bold text-xs">ADMIN TOOL</span>
                      <span>⚖️ Fair-Share Helfer-Auslastungsspiegel</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      Detaillierter Überblick über die Schicht-Stundenverteilung. Schütze dein Team vor Überlastung und finde freie Reserve-Kapazitäten.
                    </p>
                  </div>
                  
                  {/* Fairness rating Badge */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-right font-sans">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Pfad-Gerechtigkeit:</span>
                    <span className={`text-xs font-black ${fairnessColor} mt-0.5 inline-block`}>{fairnessRating}</span>
                  </div>
                </div>

                {/* Main analytical indicators */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 font-sans">
                  <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Helfer im Dienst</span>
                    <span className="text-xl font-bold text-white block mt-1 font-mono">{activeUsers.length}</span>
                    <span className="text-[9px] text-slate-500 block mt-1">Registrierte aktive Personen</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Gesamte Dienstleistung</span>
                    <span className="text-xl font-bold text-emerald-400 block mt-1 font-mono">{Math.round(totalHours * 10) / 10}h</span>
                    <span className="text-[9px] text-slate-500 block mt-1">Geleistete Arbeitszeit summiert</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Durchschnitt pro Person</span>
                    <span className="text-xl font-bold text-indigo-400 block mt-1 font-mono">{Math.round(averageHours * 10) / 10}h</span>
                    <span className="text-[9px] text-slate-500 block mt-1">Empfohlener Sollwert: ~4.0h</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Häufigste Helfer-Rolle</span>
                    <span className="text-xl font-bold text-violet-400 block mt-1 truncate font-display">Pfingsthelfer*in</span>
                    <span className="text-[9px] text-slate-500 block mt-1">100% ehrenamtlicher Einsatz</span>
                  </div>
                </div>

                {/* Workload zones Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pt-5 border-t border-slate-800">
                  {/* Overworked Red Zone */}
                  <div className="space-y-3.5 bg-rose-950/5 p-4 rounded-xl border border-rose-500/10">
                    <div className="flex items-center justify-between border-b border-rose-500/10 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                        <h4 className="text-xs font-extrabold text-rose-400 font-display uppercase tracking-wide">Überlastet (&gt; 6h)</h4>
                      </div>
                      <span className="bg-rose-500/10 text-rose-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">{overworked.length} Personen</span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {overworked.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic py-4 text-center">Hervorragend! Niemand ist überlastet.</p>
                      ) : (
                        overworked.map(({ user, stats: uStats }) => (
                          <div 
                            key={`fair-red-${user.id}`} 
                            onClick={() => { setSelectedUserPlanId(user.id); setPersonalPlanQuery(user.display_name); }}
                            className="p-2.5 bg-slate-950/40 border border-slate-800/60 hover:border-rose-500/30 rounded-lg flex items-center justify-between transition cursor-pointer"
                          >
                            <div className="truncate pr-2">
                              <p className="text-xs font-bold text-white truncate">{user.display_name}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">{user.role}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-rose-400 font-mono">{uStats.hours}h</span>
                              <p className="text-[9px] text-slate-500 font-mono">{uStats.assignmentsCount} Schichten</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Balanced Green Zone */}
                  <div className="space-y-3.5 bg-emerald-950/5 p-4 rounded-xl border border-emerald-500/10">
                    <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                        <h4 className="text-xs font-extrabold text-emerald-400 font-display uppercase tracking-wide font-sans">Idealbelastung (2-6h)</h4>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">{balanced.length} Personen</span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {balanced.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic py-4 text-center">Keine Personen in dieser Spanne.</p>
                      ) : (
                        balanced.map(({ user, stats: uStats }) => (
                          <div 
                            key={`fair-green-${user.id}`} 
                            onClick={() => { setSelectedUserPlanId(user.id); setPersonalPlanQuery(user.display_name); }}
                            className="p-2.5 bg-slate-950/40 border border-slate-800/60 hover:border-emerald-500/35 rounded-lg flex items-center justify-between transition cursor-pointer"
                          >
                            <div className="truncate pr-2">
                              <p className="text-xs font-extrabold text-white truncate">{user.display_name}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">{user.role}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-emerald-400 font-mono">{uStats.hours}h</span>
                              <p className="text-[9px] text-slate-500 font-mono">{uStats.assignmentsCount} Schichten</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Underloaded Yellow/Ice Zone */}
                  <div className="space-y-3.5 bg-amber-950/5 p-4 rounded-xl border border-amber-500/10">
                    <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                        <h4 className="text-xs font-extrabold text-amber-400 font-display uppercase tracking-wide font-sans">Verfügbare Reserven (&lt;= 2h)</h4>
                      </div>
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">{available.length} Personen</span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {available.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic py-4 text-center">Keine Reserven mehr verfügbar.</p>
                      ) : (
                        available.map(({ user, stats: uStats }) => (
                          <div 
                            key={`fair-yellow-${user.id}`} 
                            onClick={() => { setSelectedUserPlanId(user.id); setPersonalPlanQuery(user.display_name); }}
                            className="p-2.5 bg-slate-950/40 border border-slate-800/60 hover:border-amber-500/35 rounded-lg flex items-center justify-between transition cursor-pointer shadow-sm"
                          >
                            <div className="truncate pr-2">
                              <p className="text-xs font-bold text-white truncate">{user.display_name}</p>
                              <p className="text-[9px] text-slate-450 font-mono mt-0.5 uppercase">{user.role}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-amber-400 font-mono">{uStats.hours}h</span>
                              <p className="text-[9px] text-slate-500 font-mono">{uStats.assignmentsCount} Schichten</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Allocation Advice Card */}
                <div className="mt-5 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start space-x-3 text-xs leading-relaxed font-sans">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="font-bold text-slate-200">Camp-Leitungs Tipp für Belastungsausgleich:</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Teile Personen aus der Spalte <span className="text-amber-400 font-bold">Verfügbare Reserven</span> für offene oder vakante Schichten ein, um Helfer*innen der Spalte <span className="text-rose-400 font-bold">Überlastet</span> zu entlasten, bevor diese an ihre Leistungsgrenzen stoßen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Row 3 Left: Unterbesetzte Schichten (lg:col-span-7) */}
        <div className="col-span-12 lg:col-span-7 space-y-6" id="dashboard-left-half-section">
          
          {/* Card: Unterbesetzte Schichten */}
          <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl border border-emerald-500/10 p-6 shadow-xl shadow-black/35">
            <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <span>Unterbesetzte Schichten ({understaffedList.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">Schichten, die noch nicht die erforderliche Mindestanzahl an Helfer*innen erreicht haben.</p>

            <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {understaffedList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 bg-emerald-500/5 rounded-2xl border border-emerald-500/15 text-center">
                  <span className="text-xl">🏕️</span>
                  <p className="text-xs font-bold text-slate-200 mt-1">Sollstärke voll abgedeckt</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">Alle Dienste ausreichend besetzt</p>
                </div>
              ) : (
                understaffedList.map(item => (
                  <div 
                    key={item.shift.id} 
                    className="p-3 bg-amber-950/10 hover:bg-amber-950/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl space-y-2.5 transition-all cursor-pointer shadow-sm"
                    onClick={() => onSelectShift(item.shift.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate font-display">
                        {item.service?.title}
                      </span>
                      <span className="bg-amber-950 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-500/20 font-mono tracking-wide">
                        Min. benötigt: {item.minVal} • Aktuell: {item.currentCount}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                      <CalendarCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {getDayName(item.shift.date)}, {formatDateGerman(item.shift.date)} • {item.shift.start_time} - {item.shift.end_time} Uhr
                      </span>
                    </div>

                    {item.assignedPeople.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <span className="font-mono text-slate-500 font-bold mr-1">EINGETEILT:</span>
                        {item.assignedPeople.map((name, i) => (
                          <span key={i} className="text-slate-350 bg-slate-900 border border-emerald-500/10 px-1.5 py-0.5 rounded font-mono text-[9px]">{name}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-rose-400 font-extrabold bg-rose-950/40 py-1.5 px-2.5 rounded-lg border border-rose-500/20 inline-block font-mono">
                        ⚠️ Noch keine Helfer*innen eingetragen
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Row 3 Right: Admin Coordination Controls & QR Printable Actions (lg:col-span-5) */}
        <div className="col-span-12 lg:col-span-5 space-y-6" id="dashboard-right-half-section">
          {/* Fehlende Dienst-Verantwortliche */}
          {isAdmin && (
            <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl border border-emerald-500/10 p-6 shadow-xl shadow-black/35 space-y-5">
              <div>
                <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2.5">
                  <UserCheck className="h-5 w-5 text-indigo-400" />
                  <span>Hauptverantwortliche (HV) Zuteilung</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Überwachung der Abteilungsverantwortlichen für jeden dedizierten Dienstposten.</p>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
                {servicesMissingResponsible.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-xs text-emerald-450 bg-emerald-950/20 border border-emerald-500/25 rounded-xl font-mono">
                    ✓ ALL_POST_RESPONSIBLE_ASSIGNED
                  </div>
                ) : (
                  servicesMissingResponsible.map(svc => (
                    <div 
                      key={svc.id}
                      className="p-3 bg-indigo-950/20 border border-indigo-500/25 hover:border-indigo-500/45 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-white truncate font-display">{svc.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">📍 {svc.location || "LAGERPLATZ"}</p>
                      </div>
                      <button
                        onClick={() => onNavigateToTab("services")}
                        className="px-2.5 py-1 text-[9px] font-bold text-indigo-300 hover:text-indigo-100 bg-indigo-900/60 hover:bg-indigo-850 rounded border border-indigo-500/30 transition font-mono whitespace-nowrap"
                      >
                        HV_WÄHLEN
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 🖨️ ADMIN QR SCHICHTEN- & PWA-LOGIN-GENERATOR (NEU) */}
          {isAdmin && (
            <div className="bg-slate-900 border border-dashed border-emerald-500/40 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-500/35 rounded-full text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  QR-Druckzentrum 🖨️
                </span>
                <span className="text-[10px] text-slate-500 font-mono">PWA-Verteilungs-Karten</span>
              </div>
              <h3 className="text-sm font-extrabold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <QrCode className="h-4 w-4 text-emerald-400" />
                <span>Helfer-QuickLogin QR-Karten</span>
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Generiere für jeden aktiven Helfer eine ausdruckbare Karte mit individuellem QR-Code. Die Helfer scannen diese mit ihrem Smartphone, werden direkt eingeloggt, sehen ihren Schichtplan und können die App sofort ohne App Store als PWA auf ihrem Startbildschirm installieren!
              </p>
              
              <button
                onClick={() => setShowAdminQrSheet(true)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 hover:text-slate-900 font-black text-xs rounded-xl transition duration-150 shadow-lg shadow-emerald-950/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-mono"
              >
                <span>🖨️ QR-Anmeldekarten drucken / anzeigen</span>
              </button>
            </div>
          )}
        </div>


      </div>

      {/* 🖨️ Printable QR helper login card sheet */}
      <AnimatePresence>
        {showAdminQrSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-md overflow-y-auto p-4 sm:p-8 flex items-start justify-center"
            id="printable-qr-sheet-overlay"
          >
            <div 
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl shadow-black/90 p-6 md:p-8 space-y-6 relative"
              id="printable-qr-sheet-container"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 no-print">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white font-display">PWA-Quickaccess & QR-Ausweis Generierung</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Druckfertige Helfer-Anmeldekarten mit vorkonfigurierten Deep-Links</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.print();
                      }
                    }}
                    className="px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center gap-2 transition"
                  >
                    <span>🖨️ Jetzt drucken</span>
                  </button>
                  <button
                    onClick={() => setShowAdminQrSheet(false)}
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl border border-slate-800 active:scale-95 cursor-pointer text-xs font-bold leading-none font-mono"
                  >
                    Schließen ✕
                  </button>
                </div>
              </div>

              {/* Printable Note Header */}
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/5 p-4 text-xs leading-relaxed text-slate-300 space-y-2 no-print">
                <p className="font-bold text-white uppercase flex items-center gap-1.5 text-[11px] tracking-wider font-mono">
                  💡 Tipp für den perfekten Ausdruck:
                </p>
                <ul className="list-disc list-inside space-y-1 font-sans text-slate-350">
                  <li>Öffne dieses Druckcenter am Laptop/Desktop.</li>
                  <li>Klicke auf den Button <b>"Jetzt drucken"</b> oben rechts.</li>
                  <li>Wähle in den Druckereinstellungen das <b>Layout Hochformat</b> oder <b>Querformat</b>.</li>
                  <li>Setze die Ränder auf <b>"Keine"</b> oder <b>"Minimal"</b>.</li>
                  <li><b>Wichtig:</b> Aktiviere die Option <b>"Hintergrundgrafiken drucken"</b>, damit die Trennungslinien und Rahmen schön sichtbar gezeichnet werden!</li>
                </ul>
              </div>

              {/* Printable Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-mono">
                {users.filter(u => u.active).map(u => {
                  const quickUrl = `${window.location.origin}/?helper=${u.id}`;
                  const qrSrcUrl = `https://api.qrserver.com/v1/create-qr-code/?size=165x165&data=${encodeURIComponent(quickUrl)}`;

                  return (
                    <div 
                      key={`card-print-${u.id}`}
                      className="border border-dashed border-slate-700 bg-slate-950 p-5 rounded-2xl flex flex-row items-center gap-4 relative overflow-hidden break-inside-avoid print:bg-white print:text-black print:border-slate-400 print:shadow-none shadow-md shadow-black/25"
                      style={{ minHeight: "190px" }}
                    >
                      {/* Left: Metadata */}
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <span className="text-[8px] tracking-widest font-bold uppercase bg-emerald-500/10 print:bg-slate-100 border border-emerald-500/20 print:border-slate-300 text-emerald-450 text-emerald-400 print:text-slate-800 px-2 py-0.5 rounded-full inline-block">
                            CAMP HELFERAUSWEIS ⛺
                          </span>
                          <h4 className="text-sm font-black text-white print:text-black leading-tight truncate">
                            {u.display_name}
                          </h4>
                          <p className="text-[10px] text-slate-400 print:text-slate-600">
                            Rolle: <span className="font-bold uppercase text-emerald-400 print:text-emerald-700">{u.role}</span>
                          </p>
                        </div>

                        <div className="space-y-1 pr-1 border-t border-slate-900 print:border-slate-200 pt-2 text-[8px] text-slate-450 print:text-slate-600 leading-normal font-sans">
                          <p className="font-bold text-slate-300 print:text-slate-700 uppercase tracking-wide">PWA App-Installation & Schichten:</p>
                          <p>1. QR-Code scannen mit Kamera</p>
                          <p>2. Im Safari/Chrome "Optionen" &rarr; "Zum Startbildschirm" antippen</p>
                          <p>3. App im Fullscreen öffnen und Schichten direkt zusagen!</p>
                        </div>
                      </div>

                      {/* Right: QR Code Visual wrapper */}
                      <div className="flex flex-col items-center shrink-0 space-y-1.5 p-2 bg-white rounded-xl border border-slate-800 print:border-slate-300">
                        <img 
                          src={qrSrcUrl} 
                          alt={`QR-Code für ${u.display_name}`}
                          className="w-[120px] h-[120px] object-contain block"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] font-bold text-slate-500 print:text-slate-750 select-none uppercase">
                          SCANN & LOGIN
                        </span>
                      </div>

                      {/* Shearing guideline helper */}
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 border-r border-dashed border-slate-800 print:border-slate-300 pointer-events-none no-print" />
                    </div>
                  );
                })}
              </div>

              {/* Printable footer note */}
              <div className="pt-6 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono no-print">
                Saison Pfingstlager {activeCamp?.year || 2026} • Generiert mit System-Administrations-Rechten
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/30 text-white px-4.5 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center space-x-2.5 shadow-black/60 backdrop-blur-md animate-slide-up select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
