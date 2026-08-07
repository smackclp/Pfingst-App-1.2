import React from "react";
import { Community } from "../types";
import { createAndAppend, updateAndReplace, deleteAndFilter, throwIfNotOk } from "../lib/apiMutations";

/**
 * Mutations-Funktionen für Gemeinden (Communities), extrahiert aus
 * useZeltlagerData. Aktualisiert den lokalen State direkt aus der Server-
 * Antwort statt nach jeder Mutation alle 13 API-Endpunkte neu zu laden
 * (siehe AUDIT.md, "Mutation-Reload"-Fund).
 */
export function useCommunitiesData(setCommunities: React.Dispatch<React.SetStateAction<Community[]>>) {
  const handleAddCommunity = async (community: Omit<Community, "id">) => {
    await createAndAppend("/api/communities", community, setCommunities, "Adding community failed");
  };

  const handleUpdateCommunity = async (id: string, payload: Partial<Community>) => {
    await updateAndReplace("/api/communities/" + id, payload, id, setCommunities, "Updating community failed");
  };

  const handleDeleteCommunity = async (id: string) => {
    await deleteAndFilter<Community>("/api/communities/" + id, setCommunities, (c) => c.id !== id, "Deleting community failed");
  };

  const handleImportCommunities = async (items: Omit<Community, "id" | "camp_id">[]) => {
    const res = await fetch("/api/communities/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    await throwIfNotOk(res, "Importing communities failed");
    const data: { imported: Community[] } = await res.json();
    setCommunities((prev) => [...prev, ...data.imported]);
  };

  const handleClearCommunities = async () => {
    const res = await fetch("/api/communities/clear", {
      method: "POST",
    });
    await throwIfNotOk(res, "Clearing communities failed");
    // GET /communities liefert bereits nur die Gemeinden des aktiven
    // Lagerjahrs (server/routes/people.ts) - der lokale State enthält also
    // nie welche aus anderen Jahren, "leeren" heißt hier schlicht "alles weg".
    setCommunities([]);
  };

  return { handleAddCommunity, handleUpdateCommunity, handleDeleteCommunity, handleImportCommunities, handleClearCommunities };
}
