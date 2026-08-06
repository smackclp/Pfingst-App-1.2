import { User } from "../types";
import type { AccessRole } from "../lib/apiAuth";

/**
 * Mutations-Funktionen für Helfer*innen (Users), extrahiert aus useZeltlagerData.
 * loadDatabase kommt vom Orchestrator-Hook, da alle Daten gemeinsam neu geladen
 * werden (siehe useZeltlagerData.ts).
 */
export function useUsersData(loadDatabase: (silent?: boolean) => Promise<void>) {
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

  return { handleAddUser, handleUpdateUser, handleDeleteUser, handleUpdateAccessRole };
}
