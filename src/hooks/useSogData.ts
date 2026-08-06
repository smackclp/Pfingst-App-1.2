import { SogTeamGroup, SogStation, SogSettings } from "../types";

/**
 * Mutations-Funktionen für "Spiel ohne Grenzen" (Gruppen, Stationen,
 * Rotationszeiten), extrahiert aus useZeltlagerData. Liegen serverseitig,
 * damit alle Beteiligten dieselbe Einteilung/Zuordnung sehen.
 */
export function useSogData(loadDatabase: (silent?: boolean) => Promise<void>) {
  const handleUpdateSogGroups = async (groups: SogTeamGroup[]) => {
    const res = await fetch("/api/sog-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    });
    if (!res.ok) throw new Error("Updating SoG groups failed");
    await loadDatabase(true);
  };

  const handleUpdateSogStations = async (stations: SogStation[]) => {
    const res = await fetch("/api/sog-stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stations }),
    });
    if (!res.ok) throw new Error("Updating SoG stations failed");
    await loadDatabase(true);
  };

  const handleUpdateSogSettings = async (settings: SogSettings) => {
    const res = await fetch("/api/sog-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Updating SoG settings failed");
    await loadDatabase(true);
  };

  return { handleUpdateSogGroups, handleUpdateSogStations, handleUpdateSogSettings };
}
