import React from "react";
import { RefreshCw } from "lucide-react";
import { Camp, User, Service, Shift, ShiftAssignment, MaterialItem, Community, TalentAct, SogStation } from "../types";
import { Tooltip } from "./Tooltip";
import HeaderGlobalSearch from "./HeaderGlobalSearch";

type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

interface HeaderProps {
  activeCampId: string | null;
  camps: Camp[];
  refreshing: boolean;
  accessRole?: AccessRole;
  onLogout?: () => void;
  loadDatabase: (force?: boolean) => Promise<void>;

  // Global search sources and actions
  users: User[];
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  materials: MaterialItem[];
  communities: Community[];
  talentActs: TalentAct[];
  sogStations: SogStation[];
  onSelectShift: (shiftId: string) => void;
  onSelectProgram: (subTab: "talentshow" | "spiel_ohne_grenzen") => void;
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
  accessRole = "helfer",
  onLogout,
  loadDatabase,
  users,
  services,
  shifts,
  assignments,
  materials,
  communities,
  talentActs,
  sogStations,
  onSelectShift,
  onSelectProgram,
  setCurrentTab,
  currentUserId,
  onOpenPwaOnboarding,
}: HeaderProps) {
  const activeCamp = camps.find((c) => c.id === activeCampId);
  const campYear = activeCamp?.year || 2026;
  const canManage = accessRole !== "helfer";
  const actUser = users.find((u) => u.id === currentUserId);

  return (
    <header className="bg-slate-900 border-b border-emerald-500/10 px-4 py-3 md:px-6 md:py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 lg:static z-20">
      {/* Rolle + Name (ersetzt die früher doppelte Anzeige) + Lagerjahr (nur Bereichsleitung+, Desktop) */}
      <div className="flex flex-wrap items-center gap-2 min-w-0 shrink-0">
        {actUser && (
          <Tooltip content={`Angemeldet als ${ACCESS_ROLE_LABEL[accessRole]}`} position="bottom" delay={200}>
            <span
              className="text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 py-1.5 px-3 rounded-lg border border-emerald-500/20 shadow-md flex items-center space-x-1.5"
              id="active-acting-profile-badge"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
              <span className="text-slate-400 font-normal hidden sm:inline">{ACCESS_ROLE_LABEL[accessRole]}:</span>
              <span>{actUser.display_name}</span>
            </span>
          </Tooltip>
        )}

        {canManage && (
          <span className="hidden md:inline-flex text-xs bg-slate-950 text-emerald-400 font-mono py-1.5 px-3 rounded-lg border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)] select-none">
            🏕️ Pfingstlager {campYear}
          </span>
        )}

        {refreshing && (
          <span className="text-xs text-emerald-400/80 flex items-center space-x-2 animate-pulse font-mono">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span className="hidden sm:inline">SYNC...</span>
          </span>
        )}
      </div>

      {/* Global Interactive Search Bar - min-w-0 damit sie schrumpft statt die Seite zu verbreitern */}
      <HeaderGlobalSearch
        users={users}
        services={services}
        shifts={shifts}
        assignments={assignments}
        materials={materials}
        communities={communities}
        talentActs={talentActs}
        sogStations={sogStations}
        activeCamp={activeCamp}
        onSelectShift={onSelectShift}
        onSelectProgram={onSelectProgram}
        setCurrentTab={setCurrentTab}
      />

      {/* Aktionen: App laden, Aktualisieren, Abmelden */}
      <div className="flex items-center gap-2 shrink-0">
        {/* PWA App Install Button */}
        {onOpenPwaOnboarding && (
          <Tooltip content="Zeltlager App auf dem Startbildschirm installieren & Push einrichten" position="bottom" delay={200}>
            <button
              onClick={onOpenPwaOnboarding}
              className="px-3 py-2 border border-emerald-500/25 bg-emerald-950/20 hover:bg-emerald-900/40 rounded-xl flex items-center space-x-2 transition text-emerald-400 hover:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.06)] cursor-pointer text-xs font-bold font-mono uppercase"
            >
              <span>⛺</span>
              <span className="hidden sm:inline">App laden</span>
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

        {onLogout && (
          <Tooltip content="Abmelden" position="bottom" delay={300}>
            <button
              onClick={onLogout}
              className="px-3 py-2 text-xs font-semibold rounded-xl transition-all bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-900 font-mono cursor-pointer print:hidden"
              id="logout-btn"
            >
              Abmelden
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
