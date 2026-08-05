import React from "react";
import { User as UserIcon, ShieldCheck, RefreshCw } from "lucide-react";
import { Camp, User, Service, Shift, ShiftAssignment } from "../types";
import { Tooltip } from "./Tooltip";
import HeaderGlobalSearch from "./HeaderGlobalSearch";

type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

interface HeaderProps {
  activeCampId: string | null;
  camps: Camp[];
  refreshing: boolean;
  isAdmin: boolean;
  accessRole?: AccessRole;
  onLogout?: () => void;
  loadDatabase: (force?: boolean) => Promise<void>;

  // Global search sources and actions
  users: User[];
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  onSelectShift: (shiftId: string) => void;
  setCurrentTab: (tab: string) => void;
  currentUserId?: string | null;
  onOpenPwaOnboarding?: () => void;
}

const ACCESS_ROLE_LABEL: Record<AccessRole, string> = {
  helfer: "Helfer*in",
  bereichsleiter: "Bereichsleitung",
  lagerleitung: "Lagerleitung",
};

export default function Header({
  activeCampId,
  camps,
  refreshing,
  isAdmin,
  accessRole = "helfer",
  onLogout,
  loadDatabase,
  users,
  services,
  shifts,
  assignments,
  onSelectShift,
  setCurrentTab,
  currentUserId,
  onOpenPwaOnboarding,
}: HeaderProps) {
  const activeCamp = camps.find((c) => c.id === activeCampId);
  const campYear = activeCamp?.year || 2026;

  // Datum/Uhrzeit des letzten Code-Commits (NICHT der letzten Datenänderung),
  // zur Build-Zeit von vite.config.ts injiziert.
  const lastCommitDate = new Date(__LAST_COMMIT_DATE__);
  const lastCommitLabel = isNaN(lastCommitDate.getTime())
    ? "unbekannt"
    : `${lastCommitDate.toLocaleDateString("de-DE")}, ${lastCommitDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;

  return (
    <header className="bg-slate-900 border-b border-emerald-500/10 px-6 py-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sticky top-0 lg:static z-20">
      {/* Platform specifications */}
      <div className="flex flex-wrap items-center gap-2 shrink-0 justify-between md:justify-start">
        <span className="text-xs bg-slate-950 text-emerald-450 text-emerald-400 font-mono py-1.5 px-3 rounded-lg border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)] select-none">
          🏕️ Pfingstlager {campYear}
        </span>

        <Tooltip content={`Letzte Programm-Änderung (Code, nicht Daten) • Commit ${__LAST_COMMIT_HASH__}`} position="bottom" delay={200}>
          <span className="text-xs bg-slate-950 text-slate-400 font-mono py-1.5 px-3 rounded-lg border border-slate-800 select-none" id="build-version-badge">
            🛠️ Stand: {lastCommitLabel}
          </span>
        </Tooltip>

        {/* Angemeldetes Profil (echte Identität aus dem Login, nicht mehr frei wählbar) */}
        {(() => {
          const actUser = users.find((u) => u.id === currentUserId);
          if (!actUser) return null;
          return (
            <Tooltip content={`Angemeldet als ${ACCESS_ROLE_LABEL[accessRole]}`} position="bottom" delay={200}>
              <span className="text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 py-1.5 px-3 rounded-lg border border-emerald-500/20 shadow-md flex items-center space-x-1.5" id="active-acting-profile-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                <span className="text-slate-400 font-normal">{ACCESS_ROLE_LABEL[accessRole]}:</span>
                <span>{actUser.display_name}</span>
              </span>
            </Tooltip>
          );
        })()}

        {refreshing && (
          <span className="text-xs text-emerald-400/80 flex items-center space-x-2 animate-pulse font-mono">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>SYNCO...</span>
          </span>
        )}
      </div>

      {/* Global Interactive Search Bar */}
      <HeaderGlobalSearch users={users} services={services} shifts={shifts} assignments={assignments} activeCamp={activeCamp} onSelectShift={onSelectShift} setCurrentTab={setCurrentTab} />

      {/* Dynamic Sync actions and roles toggles */}
      <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start shrink-0">
        {/* PWA App Install Button */}
        {onOpenPwaOnboarding && (
          <Tooltip content="Zeltlager App auf dem Startbildschirm installieren & Push einrichten" position="bottom" delay={200}>
            <button
              onClick={onOpenPwaOnboarding}
              className="px-3.5 py-2 border border-emerald-500/25 bg-emerald-950/20 hover:bg-emerald-900/40 rounded-xl flex items-center space-x-2 transition text-emerald-400 hover:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.06)] cursor-pointer text-xs font-bold font-mono uppercase"
            >
              <span>⛺ App laden</span>
            </button>
          </Tooltip>
        )}

        {/* Quick Refresh Icon */}
        <Tooltip content="Macht eine Echtzeit-Synchronisierung der gesamten Zeltlager-Daten" position="bottom" delay={200}>
          <button
            onClick={() => loadDatabase(true)}
            className="p-2 border border-emerald-500/20 bg-slate-950/80 hover:bg-slate-800 rounded-xl transition text-emerald-400 hover:text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.03)] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </Tooltip>

        {/* Rollen-Anzeige (kein Umschalter mehr - die Rolle kommt aus dem echten Login) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-emerald-500/20 print:hidden">
          <span
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 font-mono ${
              isAdmin ? "bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/10" : "bg-slate-800 text-white font-bold ring-1 ring-slate-750"
            }`}
            id="role-badge"
          >
            {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
            <span>{ACCESS_ROLE_LABEL[accessRole]}</span>
          </span>

          {onLogout && (
            <Tooltip content="Abmelden" position="bottom" delay={300}>
              <button onClick={onLogout} className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-rose-400 hover:bg-slate-900 font-mono cursor-pointer" id="logout-btn">
                Abmelden
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
