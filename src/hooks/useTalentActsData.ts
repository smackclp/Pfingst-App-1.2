import { TalentAct } from "../types";

/** Mutations-Funktionen für Talentshow-Beiträge, extrahiert aus useZeltlagerData. */
export function useTalentActsData(loadDatabase: (silent?: boolean) => Promise<void>) {
  const handleAddTalentAct = async (actPayload: Omit<TalentAct, "id">) => {
    const res = await fetch("/api/talent-acts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actPayload),
    });
    if (!res.ok) throw new Error("Adding talent act failed");
    await loadDatabase(true);
  };

  const handleUpdateTalentAct = async (id: string, actPayload: Partial<TalentAct>) => {
    const res = await fetch(`/api/talent-acts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actPayload),
    });
    if (!res.ok) throw new Error("Updating talent act failed");
    await loadDatabase(true);
  };

  const handleDeleteTalentAct = async (id: string) => {
    const res = await fetch(`/api/talent-acts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Deleting talent act failed");
    await loadDatabase(true);
  };

  const handleReorderTalentActs = async (orders: { [id: string]: number }) => {
    const res = await fetch("/api/talent-acts/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) throw new Error("Reordering talent acts failed");
    await loadDatabase(true);
  };

  const handleClearTalentActs = async () => {
    const res = await fetch("/api/talent-acts/clear", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Clearing talent acts failed");
    await loadDatabase(true);
  };

  return { handleAddTalentAct, handleUpdateTalentAct, handleDeleteTalentAct, handleReorderTalentActs, handleClearTalentActs };
}
