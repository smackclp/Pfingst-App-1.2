/** Mutations-Funktionen für Lagerjahre (Camps), extrahiert aus useZeltlagerData. */
export function useCampsData(loadDatabase: (silent?: boolean) => Promise<void>) {
  const handleSetActiveCamp = async (campId: string) => {
    const res = await fetch("/api/camps/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeCampId: campId }),
    });
    if (!res.ok) throw new Error("Setting active camp failed");
    await loadDatabase(false);
  };

  const handleCreateCamp = async (year: number, copyFromCampId?: string) => {
    const res = await fetch("/api/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, copyFromCampId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Creating camp failed");
    }
    // Gemeinden, Talentshow-Beiträge, Bestellliste & Spiel-ohne-Grenzen-Daten
    // werden bereits serverseitig in POST /camps für das neue Jahr geleert.
    await loadDatabase(false);
  };

  return { handleSetActiveCamp, handleCreateCamp };
}
