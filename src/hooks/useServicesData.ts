import React from "react";
import { Service, Shift, ShiftAssignment } from "../types";

/**
 * Mutations-Funktionen für Dienste (Services), extrahiert aus useZeltlagerData.
 * Aktualisiert den lokalen State direkt aus der Server-Antwort statt nach
 * jeder Mutation alle 13 API-Endpunkte neu zu laden (siehe AUDIT.md,
 * "Mutation-Reload"-Fund). `shifts` wird als aktueller Wert übergeben (nicht
 * nur der Setter), weil handleDeleteService vorher wissen muss, welche
 * Schichten kaskadierend mitgelöscht werden, um auch deren Zuweisungen
 * lokal zu entfernen - das lässt sich nicht sicher aus zwei unabhängigen
 * setState-Updater-Funktionen ableiten (keine garantierte Ausführungsreihenfolge).
 */
export function useServicesData(
  shifts: Shift[],
  setServices: React.Dispatch<React.SetStateAction<Service[]>>,
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>,
  setAssignments: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>,
  refreshConflicts: () => Promise<void>
) {
  const handleAddService = async (servicePayload: Omit<Service, "id">) => {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePayload),
    });
    if (!res.ok) throw new Error("Adding service failed");
    const newService: Service = await res.json();
    setServices((prev) => [...prev, newService]);
  };

  const handleUpdateService = async (id: string, servicePayload: Partial<Service>) => {
    const res = await fetch(`/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePayload),
    });
    if (!res.ok) throw new Error("Updating service failed");
    const updatedService: Service = await res.json();
    setServices((prev) => prev.map((s) => (s.id === id ? updatedService : s)));
    // min_persons/max_persons-Änderungen können Überbelegungs-Konflikte auslösen/auflösen.
    await refreshConflicts();
  };

  const handleDeleteService = async (id: string) => {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting service failed");
    setServices((prev) => prev.filter((s) => s.id !== id));
    // Server löscht kaskadierend auch alle Schichten dieses Diensts und
    // deren Zuweisungen (server/routes/shifts.ts) - hier mit derselben
    // Logik anhand des VOR der Löschung bekannten shifts-Stands nachgezogen.
    const deletedShiftIds = new Set(shifts.filter((s) => s.service_id === id).map((s) => s.id));
    setShifts((prev) => prev.filter((s) => s.service_id !== id));
    setAssignments((prev) => prev.filter((a) => !deletedShiftIds.has(a.shift_id)));
    await refreshConflicts();
  };

  return { handleAddService, handleUpdateService, handleDeleteService };
}
