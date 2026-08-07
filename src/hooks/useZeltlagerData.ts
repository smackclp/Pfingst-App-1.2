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
import { safeStorage } from "../utils";
import { STORAGE_KEYS } from "../constants";

export type { AccessRole };

/**
 * Zuletzt geladener Datenstand fürs sofortige Anzeigen beim App-Start
 * (bevor die echte Sitzungsprüfung/Datenabfrage durch ist - relevant bei
 * einem gerade erst "aufgewachten" Gratis-Hosting-Server). An eine
 * userId gebunden, damit auf einem geteilten Gerät nie versehentlich der
 * Stand der vorherigen Person angezeigt wird, falls sich jemand anderes
 * mit einem neuen Token anmeldet.
 */
interface AppSnapshot {
  userId: string;
  authUser: AuthUser;
  accessRole: AccessRole;
  lastChange: number;
  data: {
    users: User[];
    services: Service[];
    shifts: Shift[];
    assignments: ShiftAssignment[];
    conflicts: Conflict[];
    camps: Camp[];
    activeCampId: string;
    materials: MaterialItem[];
    functionalRoles: FunctionalRole[];
    communities: Community[];
    talentActs: TalentAct[];
    sogGroups: SogTeamGroup[];
    sogStations: SogStation[];
    sogSettings: SogSettings;
  };
}

function loadSnapshot(): AppSnapshot | null {
  const raw = safeStorage.getItem(STORAGE_KEYS.APP_SNAPSHOT);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.userId && parsed.data) return parsed as AppSnapshot;
  } catch (e) {
    console.warn("Konnte App-Snapshot nicht lesen:", e);
  }
  return null;
}

function saveSnapshot(snapshot: AppSnapshot) {
  try {
    safeStorage.setItem(STORAGE_KEYS.APP_SNAPSHOT, JSON.stringify(snapshot));
  } catch (e) {
    console.warn("Konnte App-Snapshot nicht speichern:", e);
  }
}

function clearSnapshot() {
  safeStorage.removeItem(STORAGE_KEYS.APP_SNAPSHOT);
}

/**
 * Zentraler Datenzustand & Orchestrator. Hält bewusst alle Rohdaten
 * (users, shifts, ...) und das gemeinsame loadDatabase() selbst, da ein
 * einziger Fetch-Batch alles zusammen befüllt (siehe loadDatabase unten).
 * Die reinen Mutations-Funktionen (handleAdd/Update/Delete...) sind nach
 * Fachbereich in eigene Hooks ausgelagert (use<Domain>Data.ts), die
 * loadDatabase als Parameter bekommen und danach ein Neuladen auslösen.
 */
export function useZeltlagerData(onDataUpdated?: () => void) {
  const [currentTab, setCurrentTab] = React.useState<string>("dashboard");

  // --- Auth-Status: kommt ausschließlich vom Server (kein clientseitiger Bypass mehr) ---
  const [authStatus, setAuthStatus] = React.useState<"checking" | "unauthenticated" | "authenticated">("checking");
  const [authUser, setAuthUser] = React.useState<AuthUser | null>(null);
  const [accessRole, setAccessRole] = React.useState<AccessRole>("helfer");

  const currentUserId = authUser?.id || null;
  const isAdmin = accessRole === "lagerleitung";

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
  // true, solange die aktuell angezeigten Daten (noch) nur aus dem lokalen
  // Schnappschuss vom letzten Besuch stammen und noch nicht vom Server
  // bestätigt wurden (siehe Auth-Effekt unten).
  const hydratedFromSnapshotRef = React.useRef(false);

  /** Übernimmt einen gespeicherten Schnappschuss sofort in den React-State,
   * damit beim App-Start (z.B. während ein eingeschlafener Gratis-Server erst
   * aufwacht) sofort der zuletzt bekannte Stand sichtbar ist statt eines
   * leeren Ladebildschirms. */
  const hydrateFromSnapshot = React.useCallback((snapshot: AppSnapshot) => {
    setUsers(snapshot.data.users);
    setServices(snapshot.data.services);
    setShifts(snapshot.data.shifts);
    setAssignments(snapshot.data.assignments);
    setConflicts(snapshot.data.conflicts);
    setCamps(snapshot.data.camps);
    setActiveCampId(snapshot.data.activeCampId);
    setMaterials(snapshot.data.materials);
    setFunctionalRoles(snapshot.data.functionalRoles);
    setCommunities(snapshot.data.communities);
    setTalentActs(snapshot.data.talentActs);
    setSogGroups(snapshot.data.sogGroups);
    setSogStations(snapshot.data.sogStations);
    setSogSettings(snapshot.data.sogSettings);
    lastChangeRef.current = snapshot.lastChange;
    setLoading(false);
    hydratedFromSnapshotRef.current = true;
  }, []);

  // Beim Start: vorhandenes Login-Token prüfen (falls jemand die App neu öffnet).
  // Liegt zusätzlich ein lokaler Schnappschuss vor, wird sofort damit
  // gerendert - die echte Sitzungsprüfung läuft parallel im Hintergrund und
  // bestätigt/korrigiert das Ergebnis anschließend (siehe hydrateFromSnapshot).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) setAuthStatus("unauthenticated");
        return;
      }

      const snapshot = loadSnapshot();
      if (snapshot) {
        setAuthUser(snapshot.authUser);
        setAccessRole(snapshot.accessRole);
        hydrateFromSnapshot(snapshot);
        setAuthStatus("authenticated");
      }

      try {
        const session = await fetchCurrentSession();
        if (cancelled) return;
        if (session) {
          setAuthUser(session.user);
          setAccessRole(session.accessRole);
          setAuthStatus("authenticated");
        } else if (snapshot) {
          // Token war ungültig, obwohl ein Schnappschuss vorlag (z.B. Konto
          // zwischenzeitlich deaktiviert) - gecachten Stand verwerfen.
          clearSnapshot();
          setAuthUser(null);
          setAccessRole("helfer");
          setAuthStatus("unauthenticated");
        } else {
          setAuthStatus("unauthenticated");
        }
      } catch {
        if (cancelled) return;
        // Netzwerkfehler/Server noch nicht erreichbar: ohne Schnappschuss wie
        // bisher abmelden; mit Schnappschuss stattdessen mit dem gecachten
        // Stand weiterarbeiten lassen (wird automatisch bestätigt, sobald der
        // Server wieder antwortet - siehe Datenlade-Effekt/Polling unten).
        if (!snapshot) setAuthStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromSnapshot]);

  // Zentrale Reaktion auf abgelaufene/ungültige Session (z.B. Token abgelaufen,
  // Account deaktiviert): meldet automatisch ab und zeigt den Login-Bildschirm.
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSnapshot();
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
    clearSnapshot();
    setAuthUser(null);
    setAccessRole("helfer");
    setAuthStatus("unauthenticated");
  }, []);

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

  const loadDatabase = async (isSilent = false, checkSync = false, notifyIfChanged = false) => {
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

    const previousLastChange = lastChangeRef.current;

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

      const nextCamps = rCampsInfo.camps || [];
      const nextActiveCampId = rCampsInfo.activeCampId || "camp-2026";
      const nextSogSettings = rSogSettings || { startTime: "10:00", roundDuration: 15, breakDuration: 5 };

      setUsers(rUsers);
      setServices(rServices);
      setShifts(rShifts);
      setAssignments(rAssignments);
      setConflicts(rConflicts);
      setCamps(nextCamps);
      setActiveCampId(nextActiveCampId);
      setMaterials(rMaterials || []);
      setFunctionalRoles(rRoles || []);
      setCommunities(rCommunities || []);
      setTalentActs(rTalentActs || []);
      setSogGroups(rSogGroups || []);
      setSogStations(rSogStations || []);
      setSogSettings(nextSogSettings);

      const nextLastChange = rSync && rSync.lastChange ? rSync.lastChange : lastChangeRef.current;
      lastChangeRef.current = nextLastChange;

      // Für den nächsten App-Start lokal sichern (an die aktuelle Person
      // gebunden, siehe hydrateFromSnapshot oben), damit dort sofort mit dem
      // letzten bekannten Stand gerendert werden kann statt eines leeren
      // Ladebildschirms.
      if (currentUserId && authUser) {
        saveSnapshot({
          userId: currentUserId,
          authUser,
          accessRole,
          lastChange: nextLastChange,
          data: {
            users: rUsers,
            services: rServices,
            shifts: rShifts,
            assignments: rAssignments,
            conflicts: rConflicts,
            camps: nextCamps,
            activeCampId: nextActiveCampId,
            materials: rMaterials || [],
            functionalRoles: rRoles || [],
            communities: rCommunities || [],
            talentActs: rTalentActs || [],
            sogGroups: rSogGroups || [],
            sogStations: rSogStations || [],
            sogSettings: nextSogSettings,
          },
        });
      }

      // Nur hinweisen, wenn wirklich vorher schon ein (gecachter) Stand
      // sichtbar war UND sich seitdem tatsächlich etwas geändert hat - sonst
      // wäre der Hinweis bei jedem ganz normalen ersten Laden unnötiges Rauschen.
      if (notifyIfChanged && previousLastChange > 0 && nextLastChange !== previousLastChange) {
        onDataUpdated?.();
      }
    } catch (err) {
      console.error("Failed to load zeltlager database API states", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Daten erst laden, sobald eine gültige Session besteht - vorher würden alle
  // Aufrufe ohnehin 401 zurückbekommen (siehe server/auth.ts). War die Ansicht
  // bereits optimistisch aus einem lokalen Schnappschuss befüllt (siehe
  // hydrateFromSnapshot oben), lädt dieser erste Durchlauf still im
  // Hintergrund nach (checkSync=true bricht sogar ganz ab, falls sich seit
  // dem Schnappschuss serverseitig nichts geändert hat) statt erneut einen
  // Ladezustand zu zeigen.
  React.useEffect(() => {
    if (authStatus !== "authenticated") return;
    const wasHydratedFromCache = hydratedFromSnapshotRef.current;
    hydratedFromSnapshotRef.current = false;
    // Ohne Schnappschuss: Verhalten wie zuvor (normal laden, Ladezustand
    // zeigen). Mit Schnappschuss: still im Hintergrund abgleichen und nur
    // bei echten Änderungen etwas tun/anzeigen.
    loadDatabase(wasHydratedFromCache, wasHydratedFromCache, wasHydratedFromCache);

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
