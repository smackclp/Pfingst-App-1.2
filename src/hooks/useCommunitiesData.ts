import { Community } from "../types";

/** Mutations-Funktionen für Gemeinden (Communities), extrahiert aus useZeltlagerData. */
export function useCommunitiesData(loadDatabase: (silent?: boolean) => Promise<void>) {
  const handleAddCommunity = async (community: Omit<Community, "id">) => {
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(community),
    });
    if (!res.ok) throw new Error("Adding community failed");
    await loadDatabase(true);
  };

  const handleUpdateCommunity = async (id: string, payload: Partial<Community>) => {
    const res = await fetch(`/api/communities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Updating community failed");
    await loadDatabase(true);
  };

  const handleDeleteCommunity = async (id: string) => {
    const res = await fetch(`/api/communities/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting community failed");
    await loadDatabase(true);
  };

  const handleImportCommunities = async (items: Omit<Community, "id" | "camp_id">[]) => {
    const res = await fetch("/api/communities/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error("Importing communities failed");
    await loadDatabase(true);
  };

  const handleClearCommunities = async () => {
    const res = await fetch("/api/communities/clear", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Clearing communities failed");
    await loadDatabase(true);
  };

  return { handleAddCommunity, handleUpdateCommunity, handleDeleteCommunity, handleImportCommunities, handleClearCommunities };
}
