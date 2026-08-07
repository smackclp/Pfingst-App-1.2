import React from "react";
import { MaterialItem } from "../types";
import { queuedFetch } from "../lib/offlineQueue";

/**
 * Mutations-Funktionen für die Bestellliste (Materials), extrahiert aus
 * useZeltlagerData. Unkritisch & konfliktarm (meist eigene Bestellungen) ->
 * offline-fähig via queuedFetch (siehe CLAUDE.md Abschnitt 8 "Offline First").
 * Aktualisiert den lokalen State direkt aus der Server-Antwort statt nach
 * jeder Mutation alle 13 API-Endpunkte neu zu laden (siehe AUDIT.md,
 * "Mutation-Reload"-Fund).
 */
export function useMaterialsData(setMaterials: React.Dispatch<React.SetStateAction<MaterialItem[]>>) {
  const handleAddMaterial = async (materialPayload: Omit<MaterialItem, "id" | "created_at">) => {
    const res = await queuedFetch("POST", "/api/materials", materialPayload, "Materialbestellung eintragen");
    if (!res.ok) throw new Error("Adding material item failed");
    if (res.status === 202) {
      // Offline gequeut: der Server hat noch keine ID vergeben, daher kein
      // optimistischer Eintrag - die Warteschlangen-Anzeige (BottomNav)
      // zeigt bereits, dass die Bestellung noch aussteht.
      return;
    }
    const newMaterial: MaterialItem = await res.json();
    setMaterials((prev) => [...prev, newMaterial]);
  };

  const handleUpdateMaterial = async (id: string, materialPayload: Partial<MaterialItem>) => {
    const res = await queuedFetch("PUT", `/api/materials/${id}`, materialPayload, "Materialbestellung ändern");
    if (!res.ok) throw new Error("Updating material item failed");
    if (res.status === 202) {
      setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...materialPayload } : m)));
      return;
    }
    const updated: MaterialItem = await res.json();
    setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleDeleteMaterial = async (id: string) => {
    const res = await queuedFetch("DELETE", `/api/materials/${id}`, undefined, "Materialbestellung löschen");
    if (!res.ok) throw new Error("Deleting material item failed");
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  return { handleAddMaterial, handleUpdateMaterial, handleDeleteMaterial };
}
