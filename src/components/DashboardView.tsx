import React from "react";
import { QrCode } from "lucide-react";
import { User, Service, Shift, ShiftAssignment, Conflict, Camp, Community } from "../types";
import { addDays, timeToMinutes } from "../utils";
import DashboardStatsGrid from "./DashboardStatsGrid";
import DashboardFeedbacks from "./DashboardFeedbacks";
import DashboardPwaInstallBanner from "./DashboardPwaInstallBanner";
import DashboardPersonalSchedule from "./DashboardPersonalSchedule";
import DashboardConflicts from "./DashboardConflicts";
import DashboardFairShareBalancer from "./DashboardFairShareBalancer";
import DashboardUnderstaffedCard from "./DashboardUnderstaffedCard";
import DashboardMissingResponsible from "./DashboardMissingResponsible";
import DashboardQrSheet from "./DashboardQrSheet";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import { safeStorage } from "../utils";
import { STORAGE_KEYS } from "../constants";
import { AnimatePresence } from "motion/react";

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
  onUpdateAssignmentStatus: (assignmentId: string, status: "pending" | "accepted" | "declined" | "maybe", declineReason?: string) => Promise<void>;
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
  onOpenPwaOnboarding,
  onUpdateAssignmentStatus,
}: DashboardViewProps) {
  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  const { toastMessage, showToast } = useToast();

  // --- Proposal 3: Personal Schedule States (bewusst hier, nicht in DashboardPersonalSchedule.tsx,
  // da DashboardFairShareBalancer per Klick dieselbe Auswahl setzen können muss) ---
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
      const matched = users.find((u) => u.id === defaultId);
      if (matched) {
        setPersonalPlanQuery(matched.display_name);
      }
    }
  }, [users, currentUserId]);

  // Individual user stats helper - geteilt zwischen DashboardPersonalSchedule und DashboardFairShareBalancer
  const getUserWorkloadStats = React.useCallback(
    (userId: string) => {
      const userAssignments = assignments.filter((a) => a.user_id === userId);
      let totalMinutes = 0;
      const userShifts = userAssignments
        .map((a) => {
          const sh = shifts.find((s) => s.id === a.shift_id);
          if (sh) {
            const duration = timeToMinutes(sh.end_time) - timeToMinutes(sh.start_time);
            totalMinutes += duration;
          }
          return {
            assignment: a,
            shift: sh,
          };
        })
        .filter((x) => x.shift !== undefined) as { assignment: ShiftAssignment; shift: Shift }[];

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
        shiftsDetails: userShifts,
      };
    },
    [assignments, shifts]
  );

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
      totalUsersCount: users.filter((u) => u.active).length,
      totalInactiveUsersCount: users.filter((u) => !u.active).length,
      totalShiftsCount: shifts.length,
    };
  }, [users, services, shifts, assignments, conflicts]);

  // Find understaffed shifts
  const understaffedList = React.useMemo(() => {
    return shifts
      .map((s) => {
        const svc = services.find((sv) => sv.id === s.service_id);
        const assigned = assignments.filter((a) => a.shift_id === s.id);
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
          assignedPeople: assigned.map((a) => users.find((u) => u.id === a.user_id)?.display_name).filter(Boolean) as string[],
        };
      })
      .filter((item) => item.isUnderstaffed && item.service);
  }, [shifts, services, assignments, users]);

  // Find missing responsible persons
  const servicesMissingResponsible = React.useMemo(() => {
    return services.filter((s) => {
      if (!s.responsible_id) return true;
      const resp = users.find((u) => u.id === s.responsible_id);
      return !resp || !resp.active;
    });
  }, [services, users]);

  // Find declined or unsure assignment feedbacks for admin coordination
  const declinedOrUncertainAssignments = React.useMemo(() => {
    return assignments
      .filter((a) => a.status === "declined" || a.status === "maybe")
      .map((a) => {
        const u = users.find((usr) => usr.id === a.user_id);
        const s = shifts.find((sh) => sh.id === a.shift_id);
        const svc = s ? services.find((sv) => sv.id === s.service_id) : null;

        // Find other helpers currently assigned to this shift (active helpers)
        const activeAssCount = s ? assignments.filter((ass) => ass.shift_id === s.id && ass.user_id !== a.user_id && ass.status !== "declined").length : 0;

        const otherHelperNames = s
          ? (assignments
              .filter((ass) => ass.shift_id === s.id && ass.user_id !== a.user_id && ass.status !== "declined")
              .map((ass) => users.find((usr) => usr.id === ass.user_id)?.display_name)
              .filter(Boolean) as string[])
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
          updatedAt: a.status_updated_at || a.assigned_at,
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
      <DashboardPwaInstallBanner
        isStandalone={isStandalone}
        hideInstallBanner={hideInstallBanner}
        onHideBanner={() => setHideInstallBanner(true)}
        pwaInstallable={pwaInstallable}
        onTriggerPwaInstall={onTriggerPwaInstall}
        onOpenPwaOnboarding={onOpenPwaOnboarding}
      />

      {/* Grid für Statistiken */}
      <DashboardStatsGrid stats={stats} communities={communities} isAdmin={isAdmin} onNavigateToTab={onNavigateToTab} />

      {/* --- PROPOSAL 3 / VORSCHLAG 3: MEIN PERSÖNLICHER DIENSTPLAN --- */}
      <DashboardPersonalSchedule
        users={users}
        services={services}
        activeCampYear={activeCamp?.year}
        getUserWorkloadStats={getUserWorkloadStats}
        selectedUserPlanId={selectedUserPlanId}
        setSelectedUserPlanId={setSelectedUserPlanId}
        personalPlanQuery={personalPlanQuery}
        setPersonalPlanQuery={setPersonalPlanQuery}
        showPersonalSelector={showPersonalSelector}
        setShowPersonalSelector={setShowPersonalSelector}
        showToast={showToast}
        onUpdateAssignmentStatus={onUpdateAssignmentStatus}
      />

      {/* Hauptbereich: Warnungen & Schnellprüfung */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Row 1: Absagen & Unklare Rückmeldungen (die gesamte breite) */}
        {isAdmin && (
          <div className="col-span-12" id="feedback-overview-section">
            <DashboardFeedbacks items={declinedOrUncertainAssignments} onSelectShift={onSelectShift} />
          </div>
        )}

        {/* Row 2: Doppelbelegung und unterbesetzte Schichten */}
        <DashboardConflicts
          conflicts={conflicts}
          understaffedList={understaffedList}
          isAdmin={isAdmin}
          users={users}
          shifts={shifts}
          services={services}
          assignments={assignments}
          onSelectShift={onSelectShift}
          onAddAssignment={onAddAssignment}
          onRemoveAssignment={onRemoveAssignment}
          showToast={showToast}
        />

        {/* --- PROPOSAL 2: FAIR-SHARE HELFER-AUSLASTUNGSSPIEGEL (ADMIN ONLY) --- */}
        {isAdmin && (
          <DashboardFairShareBalancer
            users={users}
            getUserWorkloadStats={getUserWorkloadStats}
            setSelectedUserPlanId={setSelectedUserPlanId}
            setPersonalPlanQuery={setPersonalPlanQuery}
          />
        )}

        {/* Row 3 Left: Unterbesetzte Schichten (lg:col-span-7) */}
        <DashboardUnderstaffedCard understaffedList={understaffedList} onSelectShift={onSelectShift} />

        {/* Row 3 Right: Admin Coordination Controls & QR Printable Actions (lg:col-span-5) */}
        <div className="col-span-12 lg:col-span-5 space-y-6" id="dashboard-right-half-section">
          {/* Fehlende Dienst-Verantwortliche */}
          {isAdmin && <DashboardMissingResponsible servicesMissingResponsible={servicesMissingResponsible} onNavigateToTab={onNavigateToTab} />}

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
                Generiere für jeden aktiven Helfer eine ausdruckbare Karte mit individuellem QR-Code. Die Helfer scannen diese mit ihrem Smartphone, werden
                direkt eingeloggt, sehen ihren Schichtplan und können die App sofort ohne App Store als PWA auf ihrem Startbildschirm installieren!
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
        {showAdminQrSheet && <DashboardQrSheet users={users} activeCampYear={activeCamp?.year} onClose={() => setShowAdminQrSheet(false)} />}
      </AnimatePresence>

      <Toast message={toastMessage} />
    </div>
  );
}
