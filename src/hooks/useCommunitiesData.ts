import React from "react";
import { Community } from "../types";

/**
 * Mutations-Funktionen für Gemeinden (Communities), extrahiert aus
 * useZeltlagerData. Aktualisiert den lokalen State direkt aus der Server-
 * Antwort statt nach jeder Mutation alle 13 API-Endpunkte neu zu laden
 * (siehe AUDIT.md, "Mutation-Reload"-Fund).
 */
export function useCommunitiesData(setCommunities: React.Dispatch<React.SetStateAction<Community[]>>) {
  const handleAddCommunity = async (community: Omit<Community, "id">) => {
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(community),
    });
    if (!res.ok) throw new Error("Adding community failed");
    const newCommunity: Community = await res.json();
    setCommunities((prev) => [...prev, newCommunity]);
  };

  const handleUpdateCommunity = async (id: string, payload: Partial<Community>) => {
    const res = await fetch(`/api/communities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Updating community failed");
    const updated: Community = await res.json();
    setCommunities((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleDeleteCommunity = async (id: string) => {
    const res = await fetch(`/api/communities/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting community failed");
    setCommunities((prev) => prev.filter((c) => c.id !== id));
  };

  const handleImportCommunities = async (items: Omit<Community, "id" | "camp_id">[]) => {
    const res = await fetch("/api/communities/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error("Importing communities failed");
    const data: { imported: Community[] } = await res.json();
    setCommunities((prev) => [...prev, ...data.imported]);
  };

  const handleClearCommunities = async () => {
    const res = await fetch("/api/communities/clear", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Clearing communities failed");
    // GET /communities liefert bereits nur die Gemeinden des aktiven
    // Lagerjahrs (server/routes/people.ts) - der lokale State enthält also
    // nie welche aus anderen Jahren, "leeren" heißt hier schlicht "alles weg".
    setCommunities([]);
  };

  return { handleAddCommunity, handleUpdateCommunity, handleDeleteCommunity, handleImportCommunities, handleClearCommunities };
}
