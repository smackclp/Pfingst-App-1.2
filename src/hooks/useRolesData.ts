import React from "react";
import { FunctionalRole } from "../types";
import { createAndAppend, updateAndReplace, deleteAndFilter } from "../lib/apiMutations";

/**
 * Mutations-Funktionen für Funktionsrollen (z.B. "Einkauf"), extrahiert aus
 * useZeltlagerData. Aktualisiert den lokalen State direkt aus der Server-
 * Antwort statt nach jeder Mutation alle 13 API-Endpunkte neu zu laden
 * (siehe AUDIT.md, "Mutation-Reload"-Fund).
 */
export function useRolesData(setFunctionalRoles: React.Dispatch<React.SetStateAction<FunctionalRole[]>>) {
  const handleAddRole = async (name: string, userId: string | null) => {
    await createAndAppend(
      "/api/roles",
      { name, user_id: userId },
      setFunctionalRoles,
      "Adding role failed"
    );
  };

  const handleUpdateRole = async (id: string, payload: Partial<FunctionalRole>) => {
    await updateAndReplace("/api/roles/" + id, payload, id, setFunctionalRoles, "Updating role failed");
  };

  const handleDeleteRole = async (id: string) => {
    await deleteAndFilter<FunctionalRole>("/api/roles/" + id, setFunctionalRoles, (r) => r.id !== id, "Deleting role failed");
  };

  return { handleAddRole, handleUpdateRole, handleDeleteRole };
}
