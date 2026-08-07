import React from "react";
import { FunctionalRole } from "../types";

/**
 * Mutations-Funktionen für Funktionsrollen (z.B. "Einkauf"), extrahiert aus
 * useZeltlagerData. Aktualisiert den lokalen State direkt aus der Server-
 * Antwort statt nach jeder Mutation alle 13 API-Endpunkte neu zu laden
 * (siehe AUDIT.md, "Mutation-Reload"-Fund).
 */
export function useRolesData(setFunctionalRoles: React.Dispatch<React.SetStateAction<FunctionalRole[]>>) {
  const handleAddRole = async (name: string, userId: string | null) => {
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, user_id: userId }),
    });
    if (!res.ok) throw new Error("Adding role failed");
    const newRole: FunctionalRole = await res.json();
    setFunctionalRoles((prev) => [...prev, newRole]);
  };

  const handleUpdateRole = async (id: string, payload: Partial<FunctionalRole>) => {
    const res = await fetch(`/api/roles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Updating role failed");
    const updated: FunctionalRole = await res.json();
    setFunctionalRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const handleDeleteRole = async (id: string) => {
    const res = await fetch(`/api/roles/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting role failed");
    setFunctionalRoles((prev) => prev.filter((r) => r.id !== id));
  };

  return { handleAddRole, handleUpdateRole, handleDeleteRole };
}
