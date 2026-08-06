import { MaterialItem } from "../types";
import { queuedFetch } from "../lib/offlineQueue";

/**
 * Mutations-Funktionen für die Bestellliste (Materials), extrahiert aus
 * useZeltlagerData. Unkritisch & konfliktarm (meist eigene Bestellungen) ->
 * offline-fähig via queuedFetch (siehe CLAUDE.md Abschnitt 8 "Offline First").
 */
export function useMaterialsData(loadDatabase: (silent?: boolean) => Promise<void>) {
  const handleAddMaterial = async (materialPayload: Omit<MaterialItem, "id" | "created_at">) => {
    const res = await queuedFetch("POST", "/api/materials", materialPayload, "Materialbestellung eintragen");
    if (!res.ok) throw new Error("Adding material item failed");
    await loadDatabase(true);
  };

  const handleUpdateMaterial = async (id: string, materialPayload: Partial<MaterialItem>) => {
    const res = await queuedFetch("PUT", `/api/materials/${id}`, materialPayload, "Materialbestellung ändern");
    if (!res.ok) throw new Error("Updating material item failed");
    await loadDatabase(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    const res = await queuedFetch("DELETE", `/api/materials/${id}`, undefined, "Materialbestellung löschen");
    if (!res.ok) throw new Error("Deleting material item failed");
    await loadDatabase(true);
  };

  return { handleAddMaterial, handleUpdateMaterial, handleDeleteMaterial };
}
