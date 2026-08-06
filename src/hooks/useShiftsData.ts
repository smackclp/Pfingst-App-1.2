import { Shift } from "../types";
import { queuedFetch } from "../lib/offlineQueue";

/**
 * Mutations-Funktionen für Schichten & Zuordnungen (Shifts/Assignments),
 * extrahiert aus useZeltlagerData. Beide gehören fachlich eng zusammen
 * (Zuordnung = Helfer:in <-> Schicht), daher ein gemeinsamer Hook.
 */
export function useShiftsData(loadDatabase: (silent?: boolean) => Promise<void>) {
  const handleAddShift = async (shiftPayload: Omit<Shift, "id">) => {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftPayload),
    });
    if (!res.ok) throw new Error("Adding shift failed");
    await loadDatabase(true);
  };

  const handleUpdateShift = async (id: string, shiftPayload: Partial<Shift>) => {
    const res = await fetch(`/api/shifts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftPayload),
    });
    if (!res.ok) throw new Error("Updating shift failed");
    await loadDatabase(true);
  };

  const handleDeleteShift = async (id: string) => {
    const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting shift failed");
    await loadDatabase(true);
  };

  const handleAddAssignment = async (shiftId: string, userId: string, force = false) => {
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, user_id: userId, force }),
    });

    if (res.status === 409) {
      const data = await res.json();
      throw { status: 409, message: data.message };
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Adding assignment failed");
    }

    await loadDatabase(true);
  };

  const handleRemoveAssignment = async (shiftId: string, userId: string) => {
    const res = await fetch("/api/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, user_id: userId }),
    });
    if (!res.ok) throw new Error("Removing assignment failed");
    await loadDatabase(true);
  };

  const handleToggleAssignmentAccepted = async (assignmentId: string, accepted: boolean) => {
    const res = await fetch(`/api/assignments/${assignmentId}/accepted`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepted }),
    });
    if (!res.ok) throw new Error("Toggling assignment accepted state failed");
    await loadDatabase(true);
  };

  const handleUpdateAssignmentStatus = async (
    assignmentId: string,
    status: "pending" | "accepted" | "declined" | "maybe",
    declineReason?: string
  ) => {
    // Unkritische, konfliktarme Aktion (eigener Status) -> offline-fähig via
    // queuedFetch: wird bei fehlender Verbindung lokal gespeichert und
    // automatisch nachgesendet, statt sofort zu scheitern.
    const res = await queuedFetch("PUT", `/api/assignments/${assignmentId}/status`, { status, decline_reason: declineReason }, "Schicht-Status ändern");
    if (!res.ok) throw new Error("Updating assignment status failed");
    await loadDatabase(true);
  };

  return {
    handleAddShift,
    handleUpdateShift,
    handleDeleteShift,
    handleAddAssignment,
    handleRemoveAssignment,
    handleToggleAssignmentAccepted,
    handleUpdateAssignmentStatus,
  };
}
