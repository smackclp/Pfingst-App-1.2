import React from "react";
import { User, ShiftAssignment } from "../types";
import type { AccessRole } from "../lib/apiAuth";

/**
 * Mutations-Funktionen für Helfer*innen (Users), extrahiert aus useZeltlagerData.
 * Aktualisiert den lokalen State direkt aus der Server-Antwort statt nach
 * jeder Mutation alle 13 API-Endpunkte neu zu laden (siehe AUDIT.md,
 * "Mutation-Reload"-Fund).
 */
export function useUsersData(
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
  setAssignments: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>
) {
  const handleAddUser = async (userPayload: Omit<User, "id">) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload),
    });
    if (!res.ok) throw new Error("Adding user failed");
    const newUser: User = await res.json();
    setUsers((prev) => [...prev, newUser]);
  };

  const handleUpdateUser = async (id: string, userPayload: Partial<User>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload),
    });
    if (!res.ok) throw new Error("Updating user failed");
    const updatedUser: User = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
  };

  const handleDeleteUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting user failed");
    setUsers((prev) => prev.filter((u) => u.id !== id));
    // Server löscht kaskadierend auch alle Zuweisungen dieser Person (server/routes/people.ts).
    setAssignments((prev) => prev.filter((a) => a.user_id !== id));
  };

  // Nur Lagerleitung: Zugriffsrolle einer Person ändern (Helfer/Bereichsleiter/Lagerleitung)
  const handleUpdateAccessRole = async (id: string, role: AccessRole) => {
    const res = await fetch(`/api/auth/admin/access-role/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_role: role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Rolle konnte nicht geändert werden.");
    }
    const updatedUser: User = data.user;
    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
  };

  return { handleAddUser, handleUpdateUser, handleDeleteUser, handleUpdateAccessRole };
}
