import React from "react";
import { TalentAct } from "../types";
import { queuedFetch } from "../lib/offlineQueue";
import { throwIfNotOk } from "../lib/apiMutations";

/**
 * Mutations-Funktionen für Talentshow-Beiträge, extrahiert aus useZeltlagerData.
 * Anlegen/Ändern/Löschen einzelner Beiträge ist unkritisch & konfliktarm ->
 * offline-fähig via queuedFetch. Reorder/Clear betreffen alle Beiträge auf
 * einmal (kollisionsanfällig bei Offline-Wiederholung) und bleiben normal.
 * Aktualisiert den lokalen State direkt aus der Server-Antwort statt nach
 * jeder Mutation alle 13 API-Endpunkte neu zu laden (siehe AUDIT.md,
 * "Mutation-Reload"-Fund).
 */
export function useTalentActsData(setTalentActs: React.Dispatch<React.SetStateAction<TalentAct[]>>) {
  const handleAddTalentAct = async (actPayload: Omit<TalentAct, "id">) => {
    const res = await queuedFetch("POST", "/api/talent-acts", actPayload, "Talentshow-Beitrag eintragen");
    await throwIfNotOk(res, "Adding talent act failed");
    if (res.status === 202) {
      // Offline gequeut: der Server hat noch keine ID vergeben, daher kein
      // optimistischer Eintrag.
      return;
    }
    const newAct: TalentAct = await res.json();
    setTalentActs((prev) => [...prev, newAct]);
  };

  const handleUpdateTalentAct = async (id: string, actPayload: Partial<TalentAct>) => {
    const res = await queuedFetch("PUT", `/api/talent-acts/${id}`, actPayload, "Talentshow-Beitrag ändern");
    await throwIfNotOk(res, "Updating talent act failed");
    if (res.status === 202) {
      setTalentActs((prev) => prev.map((a) => (a.id === id ? { ...a, ...actPayload } : a)));
      return;
    }
    const updated: TalentAct = await res.json();
    setTalentActs((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleDeleteTalentAct = async (id: string) => {
    const res = await queuedFetch("DELETE", `/api/talent-acts/${id}`, undefined, "Talentshow-Beitrag löschen");
    await throwIfNotOk(res, "Deleting talent act failed");
    setTalentActs((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReorderTalentActs = async (orders: { [id: string]: number }) => {
    const res = await fetch("/api/talent-acts/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
    await throwIfNotOk(res, "Reordering talent acts failed");
    setTalentActs((prev) =>
      prev.map((a) => (orders[a.id] !== undefined ? { ...a, order_index: Number(orders[a.id]) } : a))
    );
  };

  const handleClearTalentActs = async () => {
    const res = await fetch("/api/talent-acts/clear", {
      method: "POST",
    });
    await throwIfNotOk(res, "Clearing talent acts failed");
    // GET /talent-acts liefert bereits nur die Beiträge des aktiven
    // Lagerjahrs (server/routes/program.ts) - "leeren" heißt hier schlicht "alles weg".
    setTalentActs([]);
  };

  return { handleAddTalentAct, handleUpdateTalentAct, handleDeleteTalentAct, handleReorderTalentActs, handleClearTalentActs };
}
