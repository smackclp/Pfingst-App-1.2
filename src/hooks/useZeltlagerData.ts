import React from "react";
import { User, Service, Shift, ShiftAssignment, Conflict, Camp, MaterialItem, FunctionalRole, Community, TalentAct, SogTeamGroup, SogStation, SogSettings } from "../types";
import {
  getAuthToken,
  setAuthToken,
  fetchCurrentSession,
  loginWithPin,
  logout as apiLogout,
  setUnauthorizedHandler,
  type AuthUser,
  type AccessRole,
} from "../lib/apiAuth";
import { useUsersData } from "./useUsersData";
import { useServicesData } from "./useServicesData";
import { useShiftsData } from "./useShiftsData";
import { useCampsData } from "./useCampsData";
import { useMaterialsData } from "./useMaterialsData";
import { useRolesData } from "./useRolesData";
import { useCommunitiesData } from "./useCommunitiesData";
import { useTalentActsData } from "./useTalentActsData";
import { useSogData } from "./useSogData";
import { throwIfNotOk } from "../lib/apiMutations";

export type { AccessRole };

/**
 * Zentraler Datenzustand & Orchestrator. Hält bewusst alle Rohdaten
 * (users, shifts, ...) und das gemeinsame loadDatabase() selbst, da ein
 * einziger Fetch-Batch alles zusammen befüllt (siehe loadDatabase unten).
 * Die reinen Mutations-Funktionen (handleAdd/Update/Delete...) sind nach
 * Fachbereich in eigene Hooks ausgelagert (use<Domain>Data.ts), die
 * loadDatabase als Parameter bekommen und danach ein Neuladen auslösen.
 */
export function useZeltlagerData() {
  const [currentTab, setCurrentTab] = React.useState<string>("dashboard");

  // --- Auth-Status: kommt ausschließlich vom Server (kein clientseitiger Bypass mehr) ---
  const [authStatus, setAuthStatus] = React.useState<"checking" | "unauthenticated" | "authenticated">("checking");
  const [authUser, setAuthUser] = React.useState<AuthUser | null>(null);
  const [accessRole, setAccessRole] = React.useState<AccessRole>("helfer");

  const currentUserId = authUser?.id || null;
  const isAdmin = accessRole === "lagerleitung";

  // Beim Start: vorhandenes Login-Token prüfen (falls jemand die App neu öffnet).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) setAuthStatus("unauthenticated");
        return;
      }
      try {
        const session = await fetchCurrentSession();
        if (cancelled) return;
        if (session) {
          setAuthUser(session.user);
          setAccessRole(session.accessRole);
          setAuthStatus("authenticated");
        } else {
          setAuthStatus("unauthenticated");
        }
      } catch {
        if (!cancelled) setAuthStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Zentrale Reaktion auf abgelaufene/ungültige Session (z.B. Token abgelaufen,
  // Account deaktiviert): meldet automatisch ab und zeigt den Login-Bildschirm.
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthUser(null);
      setAccessRole("helfer");
      setAuthStatus("unauthenticated");
    });
  }, []);

  const login = React.useCallback(async (userId: string, pin: string) => {
    const { token, accessRole: role, user } = await loginWithPin(userId, pin);
    setAuthToken(token);
    setAuthUser(user);
    setAccessRole(role);
    setAuthStatus("authenticated");
  }, []);

  const logoutUser = React.useCallback(async () => {
    await apiLogout().catch(() => {});
    setAuthUser(null);
    setAccessRole("helfer");
    setAuthStatus("unauthenticated");
  }, []);

  // API State
  const [users, setUsers] = React.useState<User[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [assignments, setAssignments] = React.useState<ShiftAssignment[]>([]);
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [camps, setCamps] = React.useState<Camp[]>([]);
  const [activeCampId, setActiveCampId] = React.useState<string>("camp-2026");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [materials, setMaterials] = React.useState<MaterialItem[]>([]);
  const [functionalRoles, setFunctionalRoles] = React.useState<FunctionalRole[]>([]);
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [talentActs, setTalentActs] = React.useState<TalentAct[]>([]);
  const [sogGroups, setSogGroups] = React.useState<SogTeamGroup[]>([]);
  const [sogStations, setSogStations] = React.useState<SogStation[]>([]);
  const [sogSettings, setSogSettings] = React.useState<SogSettings>({ startTime: "10:00", roundDuration: 15, breakDuration: 5 });

  // Focus highlighed shift state
  const [selectShiftId, setSelectShiftId] = React.useState<string | null>(null);

  const lastChangeRef = React.useRef<number>(0);

  // Fetch all db tables
  const safeFetchJson = async (url: string, fallback: any) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return fallback;
      }
      return await res.json();
    } catch (e) {
      console.warn(`Safe fetch failed for ${url}:`, e);
      return fallback;
    }
  };

  // Gezielter Nachlade-Helfer für den Konflikt-Endpunkt allein - genutzt von
  // Mutations-Hooks, die den State lokal aus der Server-Antwort aktualisieren
  // (siehe useShiftsData.ts) statt der kompletten Datenbank neu zu laden,
  // aber trotzdem wissen müssen, ob sich dadurch Konflikte ergeben haben.
  const refreshConflicts = async () => {
    const data = await safeFetchJson("/api/conflicts", []);
    setConflicts(data);
  };

  const loadDatabase = async (isSilent = false, checkSync = false) => {
    if (checkSync) {
      try {
        const syncCheck = await safeFetchJson("/api/sync-check", { lastChange: 0 });
        if (syncCheck && syncCheck.lastChange && syncCheck.lastChange === lastChangeRef.current) {
          // Keine Änderungen auf dem Server seit dem letzten Fetch. Abbrechen, um Quota und Last zu sparen!
          return;
        }
      } catch (e) {
        console.warn("Failed checking sync status:", e);
      }
    }

    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [rUsers, rServices, rShifts, rAssignments, rConflicts, rCampsInfo, rMaterials, rRoles, rCommunities, rTalentActs, rSogGroups, rSogStations, rSogSettings, rSync] = await Promise.all([
        safeFetchJson("/api/users", []),
        safeFetchJson("/api/services", []),
        safeFetchJson("/api/shifts", []),
        safeFetchJson("/api/assignments", []),
        safeFetchJson("/api/conflicts", []),
        safeFetchJson("/api/camps", { camps: [], activeCampId: "camp-2026" }),
        safeFetchJson("/api/materials", []),
        safeFetchJson("/api/roles", []),
        safeFetchJson("/api/communities", []),
        safeFetchJson("/api/talent-acts", []),
        safeFetchJson("/api/sog-groups", []),
        safeFetchJson("/api/sog-stations", []),
        safeFetchJson("/api/sog-settings", { startTime: "10:00", roundDuration: 15, breakDuration: 5 }),
        safeFetchJson("/api/sync-check", { lastChange: 0 })
      ]);

      setUsers(rUsers);
      setServices(rServices);
      setShifts(rShifts);
      setAssignments(rAssignments);
      setConflicts(rConflicts);
      setCamps(rCampsInfo.camps || []);
      setActiveCampId(rCampsInfo.activeCampId || "camp-2026");
      setMaterials(rMaterials || []);
      setFunctionalRoles(rRoles || []);
      setCommunities(rCommunities || []);
      setTalentActs(rTalentActs || []);
      setSogGroups(rSogGroups || []);
      setSogStations(rSogStations || []);
      setSogSettings(rSogSettings || { startTime: "10:00", roundDuration: 15, breakDuration: 5 });

      if (rSync && rSync.lastChange) {
        lastChangeRef.current = rSync.lastChange;
      }
    } catch (err) {
      console.error("Failed to load zeltlager database API states", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Daten erst laden, sobald eine gültige Session besteht - vorher würden alle
  // Aufrufe ohnehin 401 zurückbekommen (siehe server/auth.ts).
  React.useEffect(() => {
    if (authStatus !== "authenticated") return;
    loadDatabase();

    // Automatisches Polling alle 5 Minuten (300.000 ms)
    const interval = setInterval(() => {
      console.log("Automatischer Abgleich der Cloud-Datenbank wird ausgeführt...");
      loadDatabase(true, true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [authStatus]);

  // --- Fachliche Mutations-Hooks (siehe use<Domain>Data.ts) ---
  const usersData = useUsersData(setUsers, setAssignments);
  const servicesData = useServicesData(shifts, setServices, setShifts, setAssignments, refreshConflicts);
  const shiftsData = useShiftsData(setShifts, setAssignments, refreshConflicts);
  // Camp-Wechsel/-Anlage bleibt bewusst beim vollen Reload: betrifft nahezu
  // alle camp-gebundenen Daten auf einmal (Schichten, Zuweisungen, Material,
  // Gemeinden, Talentshow, SoG), ist selten (Admin-Aktion) und zeigt ohnehin
  // einen Ladezustand - kein Fall für lokale Einzel-State-Updates.
  const campsData = useCampsData(loadDatabase);
  const materialsData = useMaterialsData(setMaterials);
  const rolesData = useRolesData(setFunctionalRoles);
  const communitiesData = useCommunitiesData(setCommunities);
  const talentActsData = useTalentActsData(setTalentActs);
  const sogData = useSogData(setSogGroups, setSogStations, setSogSettings);

  // Jumping to calendar view with highligh focus
  const handleSelectShift = (shiftId: string) => {
    setSelectShiftId(shiftId);
    setCurrentTab("calendar");
  };

  const handleResetDatabase = async (year: number = 2026, mode: "full" | "shifts_only" | "clear_assignments" = "full") => {
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, mode }),
    });
    await throwIfNotOk(res, "Reset der Daten ist fehlgeschlagen");
    const data = await res.json();
    await loadDatabase(false);
    return data.message || "Erfolgreich zurückgesetzt!";
  };

  const handleRestoreLastReset = async () => {
    const res = await fetch("/api/seed/restore", { method: "POST" });
    await throwIfNotOk(res, "Wiederherstellung ist fehlgeschlagen");
    const data = await res.json();
    await loadDatabase(false);
    return data.message || "Stand wiederhergestellt!";
  };

  return {
    currentTab,
    setCurrentTab,
    // Auth (echte, serverseitig geprüfte Session statt clientseitigem Bypass)
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
    ...usersData,
    ...servicesData,
    ...shiftsData,
    ...campsData,
    handleSelectShift,
    // Materials
    materials,
    ...materialsData,
    // Functional Roles
    functionalRoles,
    ...rolesData,
    // Communities
    communities,
    ...communitiesData,
    // Talent Acts
    talentActs,
    ...talentActsData,
    // Spiel ohne Grenzen
    sogGroups,
    sogStations,
    sogSettings,
    ...sogData,
    handleResetDatabase,
    handleRestoreLastReset,
  };
}
