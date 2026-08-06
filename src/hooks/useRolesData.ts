import { FunctionalRole } from "../types";

/** Mutations-Funktionen für Funktionsrollen (z.B. "Einkauf"), extrahiert aus useZeltlagerData. */
export function useRolesData(loadDatabase: (silent?: boolean) => Promise<void>) {
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

  return { handleAddRole, handleUpdateRole, handleDeleteRole };
}
