import React from "react";
import { SogTeamGroup, SogStation, SogSettings } from "../types";

/**
 * Mutations-Funktionen für "Spiel ohne Grenzen" (Gruppen, Stationen,
 * Rotationszeiten), extrahiert aus useZeltlagerData. Liegen serverseitig,
 * damit alle Beteiligten dieselbe Einteilung/Zuordnung sehen. Alle drei
 * Endpunkte ersetzen den kompletten Datensatz des aktiven Lagerjahrs, der
 * Client kennt das neue Ergebnis also bereits aus dem eigenen Aufruf-
 * Argument - kein Reload aller 13 API-Endpunkte nötig (siehe AUDIT.md,
 * "Mutation-Reload"-Fund).
 */
export function useSogData(
  setSogGroups: React.Dispatch<React.SetStateAction<SogTeamGroup[]>>,
  setSogStations: React.Dispatch<React.SetStateAction<SogStation[]>>,
  setSogSettings: React.Dispatch<React.SetStateAction<SogSettings>>
) {
  const handleUpdateSogGroups = async (groups: SogTeamGroup[]) => {
    const res = await fetch("/api/sog-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    });
    if (!res.ok) throw new Error("Updating SoG groups failed");
    setSogGroups(groups);
  };

  const handleUpdateSogStations = async (stations: SogStation[]) => {
    const res = await fetch("/api/sog-stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stations }),
    });
    if (!res.ok) throw new Error("Updating SoG stations failed");
    setSogStations(stations);
  };

  const handleUpdateSogSettings = async (settings: SogSettings) => {
    const res = await fetch("/api/sog-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Updating SoG settings failed");
    // Server wendet bei ungültigen Typen Defaults an (server/routes/program.ts)
    // - die zurückgegebenen sogSettings sind daher maßgeblich, nicht das
    // ungeprüfte Eingabe-Argument.
    const data: { sogSettings: SogSettings } = await res.json();
    setSogSettings(data.sogSettings);
  };

  return { handleUpdateSogGroups, handleUpdateSogStations, handleUpdateSogSettings };
}
