import React from "react";
import { User, ShiftAssignment } from "../types";
import type { AccessRole } from "../lib/apiAuth";
import { createAndAppend, updateAndReplace, deleteAndFilter } from "../lib/apiMutations";

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
    await createAndAppend("/api/users", userPayload, setUsers, "Adding user failed");
  };

  const handleUpdateUser = async (id: string, userPayload: Partial<User>) => {
    await updateAndReplace("/api/users/" + id, userPayload, id, setUsers, "Updating user failed");
  };

  const handleDeleteUser = async (id: string) => {
    await deleteAndFilter<User>("/api/users/" + id, setUsers, (u) => u.id !== id, "Deleting user failed");
    // Server löscht kaskadierend auch alle Zuweisungen dieser Person (server/routes/people.ts).
    setAssignments((prev) => prev.filter((a) => a.user_id !== id));
  };

  // Nur Lagerleitung: Zugriffsrolle einer Person ändern (Helfer/Bereichsleiter/Lagerleitung)
  const handleUpdateAccessRole = async (id: string, role: AccessRole) => {
    await updateAndReplace(
      "/api/auth/admin/access-role/" + id,
      { access_role: role },
      id,
      setUsers,
      "Rolle konnte nicht geändert werden.",
      (data) => data.user
    );
  };

  return { handleAddUser, handleUpdateUser, handleDeleteUser, handleUpdateAccessRole };
}
