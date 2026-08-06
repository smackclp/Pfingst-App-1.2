import { MaterialItem } from "../types";

/** Mutations-Funktionen für die Bestellliste (Materials), extrahiert aus useZeltlagerData. */
export function useMaterialsData(loadDatabase: (silent?: boolean) => Promise<void>) {
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

  return { handleAddMaterial, handleUpdateMaterial, handleDeleteMaterial };
}
