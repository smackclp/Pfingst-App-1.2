import React from "react";
import { User, Service, Shift, ShiftAssignment, Conflict, Camp, MaterialItem, FunctionalRole, Community, TalentAct } from "../types";
import { safeStorage } from "../utils";
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

export type { AccessRole };

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
      const [rUsers, rServices, rShifts, rAssignments, rConflicts, rCampsInfo, rMaterials, rRoles, rCommunities, rTalentActs, rSync] = await Promise.all([
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

  // --- API Mutators ---
  // Users
  const handleAddUser = async (userPayload: Omit<User, "id">) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload),
    });
    if (!res.ok) throw new Error("Adding user failed");
    await loadDatabase(true);
  };

  const handleUpdateUser = async (id: string, userPayload: Partial<User>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload),
    });
    if (!res.ok) throw new Error("Updating user failed");
    await loadDatabase(true);
  };

  const handleDeleteUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting user failed");
    await loadDatabase(true);
  };

  // Nur Lagerleitung: Zugriffsrolle einer Person ändern (Helfer/Bereichsleiter/Lagerleitung)
  const handleUpdateAccessRole = async (id: string, role: AccessRole) => {
    const res = await fetch(`/api/auth/admin/access-role/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_role: role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Rolle konnte nicht geändert werden.");
    }
    await loadDatabase(true);
  };

  // Services
  const handleAddService = async (servicePayload: Omit<Service, "id">) => {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePayload),
    });
    if (!res.ok) throw new Error("Adding service failed");
    await loadDatabase(true);
  };

  const handleUpdateService = async (id: string, servicePayload: Partial<Service>) => {
    const res = await fetch(`/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePayload),
    });
    if (!res.ok) throw new Error("Updating service failed");
    await loadDatabase(true);
  };

  const handleDeleteService = async (id: string) => {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting service failed");
    await loadDatabase(true);
  };

  // Shifts
  const handleAddShift = async (shiftPayload: Omit<Shift, "id">) => {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftPayload),
    });
    if (!res.ok) throw new Error("Adding shift failed");
    await loadDatabase(true);
  };

  const handleUpdateShift = async (id: string, shiftPayload: Partial<Shift>) => {
    const res = await fetch(`/api/shifts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftPayload),
    });
    if (!res.ok) throw new Error("Updating shift failed");
    await loadDatabase(true);
  };

  const handleDeleteShift = async (id: string) => {
    const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting shift failed");
    await loadDatabase(true);
  };

  // Assignments
  const handleAddAssignment = async (shiftId: string, userId: string, force = false) => {
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, user_id: userId, force }),
    });

    if (res.status === 409) {
      const data = await res.json();
      throw { status: 409, message: data.message };
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Adding assignment failed");
    }

    await loadDatabase(true);
  };

  const handleRemoveAssignment = async (shiftId: string, userId: string) => {
    const res = await fetch("/api/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, user_id: userId }),
    });
    if (!res.ok) throw new Error("Removing assignment failed");
    await loadDatabase(true);
  };

  const handleToggleAssignmentAccepted = async (assignmentId: string, accepted: boolean) => {
    const res = await fetch(`/api/assignments/${assignmentId}/accepted`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepted }),
    });
    if (!res.ok) throw new Error("Toggling assignment accepted state failed");
    await loadDatabase(true);
  };

  const handleUpdateAssignmentStatus = async (
    assignmentId: string, 
    status: 'pending' | 'accepted' | 'declined' | 'maybe', 
    declineReason?: string
  ) => {
    const res = await fetch(`/api/assignments/${assignmentId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, decline_reason: declineReason }),
    });
    if (!res.ok) throw new Error("Updating assignment status failed");
    await loadDatabase(true);
  };

  const handleSetActiveCamp = async (campId: string) => {
    const res = await fetch("/api/camps/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeCampId: campId }),
    });
    if (!res.ok) throw new Error("Setting active camp failed");
    await loadDatabase(false);
  };

  const handleCreateCamp = async (year: number, copyFromCampId?: string) => {
    const res = await fetch("/api/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, copyFromCampId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Creating camp failed");
    }
    // Spiel-ohne-Grenzen-Daten liegen nur im Browser (LocalStorage), nicht in
    // der DB - müssen deshalb hier clientseitig zurückgesetzt werden. Gemeinden,
    // Talentshow-Beiträge und Bestellliste werden bereits serverseitig in
    // POST /camps für das neue Jahr geleert.
    safeStorage.removeItem("zeltlager_sog_groups_v1");
    safeStorage.removeItem("zeltlager_sog_stations_v1");
    await loadDatabase(false);
  };

  // Jumping to calendar view with highligh focus
  const handleSelectShift = (shiftId: string) => {
    setSelectShiftId(shiftId);
    setCurrentTab("calendar");
  };

  // --- Materials Ordering List Handlers ---
  const handleAddMaterial = async (materialPayload: Omit<MaterialItem, "id" | "created_at">) => {
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(materialPayload),
    });
    if (!res.ok) throw new Error("Adding material item failed");
    await loadDatabase(true);
  };

  const handleUpdateMaterial = async (id: string, materialPayload: Partial<MaterialItem>) => {
    const res = await fetch(`/api/materials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(materialPayload),
    });
    if (!res.ok) throw new Error("Updating material item failed");
    await loadDatabase(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    const res = await fetch(`/api/materials/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting material item failed");
    await loadDatabase(true);
  };

  // --- Functional Roles Handlers ---
  const handleAddRole = async (name: string, userId: string | null) => {
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, user_id: userId }),
    });
    if (!res.ok) throw new Error("Adding role failed");
    await loadDatabase(true);
  };

  const handleUpdateRole = async (id: string, payload: Partial<FunctionalRole>) => {
    const res = await fetch(`/api/roles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Updating role failed");
    await loadDatabase(true);
  };

  const handleDeleteRole = async (id: string) => {
    const res = await fetch(`/api/roles/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting role failed");
    await loadDatabase(true);
  };

  // Communities Handlers
  const handleAddCommunity = async (community: Omit<Community, "id">) => {
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(community),
    });
    if (!res.ok) throw new Error("Adding community failed");
    await loadDatabase(true);
  };

  const handleUpdateCommunity = async (id: string, payload: Partial<Community>) => {
    const res = await fetch(`/api/communities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Updating community failed");
    await loadDatabase(true);
  };

  const handleDeleteCommunity = async (id: string) => {
    const res = await fetch(`/api/communities/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting community failed");
    await loadDatabase(true);
  };

  const handleImportCommunities = async (items: Omit<Community, "id" | "camp_id">[]) => {
    const res = await fetch("/api/communities/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error("Importing communities failed");
    await loadDatabase(true);
  };

  const handleClearCommunities = async () => {
    const res = await fetch("/api/communities/clear", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Clearing communities failed");
    await loadDatabase(true);
  };

  // Talent Acts
  const handleAddTalentAct = async (actPayload: Omit<TalentAct, "id">) => {
    const res = await fetch("/api/talent-acts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actPayload),
    });
    if (!res.ok) throw new Error("Adding talent act failed");
    await loadDatabase(true);
  };

  const handleUpdateTalentAct = async (id: string, actPayload: Partial<TalentAct>) => {
    const res = await fetch(`/api/talent-acts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actPayload),
    });
    if (!res.ok) throw new Error("Updating talent act failed");
    await loadDatabase(true);
  };

  const handleDeleteTalentAct = async (id: string) => {
    const res = await fetch(`/api/talent-acts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting talent act failed");
    await loadDatabase(true);
  };

  const handleReorderTalentActs = async (orders: { [id: string]: number }) => {
    const res = await fetch("/api/talent-acts/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) throw new Error("Reordering talent acts failed");
    await loadDatabase(true);
  };

  const handleClearTalentActs = async () => {
    const res = await fetch("/api/talent-acts/clear", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Clearing talent acts failed");
    await loadDatabase(true);
  };

  const handleResetDatabase = async (year: number = 2026, mode: "full" | "shifts_only" | "clear_assignments" = "full") => {
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Reset der Daten ist fehlgeschlagen");
    }
    const data = await res.json();
    await loadDatabase(false);
    return data.message || "Erfolgreich zurückgesetzt!";
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
    handleToggleAssignmentAccepted,
    handleUpdateAssignmentStatus,
    handleSetActiveCamp,
    handleCreateCamp,
    handleSelectShift,
    // Materials
    materials,
    handleAddMaterial,
    handleUpdateMaterial,
    handleDeleteMaterial,
    // Functional Roles
    functionalRoles,
    handleAddRole,
    handleUpdateRole,
    handleDeleteRole,
    // Communities
    communities,
    handleAddCommunity,
    handleUpdateCommunity,
    handleDeleteCommunity,
    handleImportCommunities,
    handleClearCommunities,
    // Talent Acts
    talentActs,
    handleAddTalentAct,
    handleUpdateTalentAct,
    handleDeleteTalentAct,
    handleReorderTalentActs,
    handleClearTalentActs,
    handleResetDatabase,
  };
}
