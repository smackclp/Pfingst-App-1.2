import React from "react";
import { Shift, ShiftAssignment } from "../types";
import { queuedFetch } from "../lib/offlineQueue";

/**
 * Mutations-Funktionen für Schichten & Zuordnungen (Shifts/Assignments),
 * extrahiert aus useZeltlagerData. Beide gehören fachlich eng zusammen
 * (Zuordnung = Helfer:in <-> Schicht), daher ein gemeinsamer Hook.
 *
 * Aktualisiert den lokalen State direkt aus der Server-Antwort statt nach
 * jeder Mutation alle 13 API-Endpunkte neu zu laden (siehe AUDIT.md,
 * "Mutation-Reload"-Fund) - schneller und Offline-First-tauglich.
 * Konflikte hängen von Zeiten/Kapazität/Zuordnungen ab und werden deshalb
 * gezielt über den einzelnen /api/conflicts-Endpunkt neu berechnet, statt
 * die Logik aus server/conflicts.ts im Client zu duplizieren.
 */
export function useShiftsData(
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>,
  setAssignments: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>,
  refreshConflicts: () => Promise<void>
) {
  const handleAddShift = async (shiftPayload: Omit<Shift, "id">) => {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftPayload),
    });
    if (!res.ok) throw new Error("Adding shift failed");
    const newShift: Shift = await res.json();
    setShifts((prev) => [...prev, newShift]);
  };

  const handleUpdateShift = async (id: string, shiftPayload: Partial<Shift>) => {
    const res = await fetch(`/api/shifts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftPayload),
    });
    if (!res.ok) throw new Error("Updating shift failed");
    const updatedShift: Shift = await res.json();
    setShifts((prev) => prev.map((s) => (s.id === id ? updatedShift : s)));
    // Zeiten-/Kapazitätsänderungen können Konflikte auslösen oder auflösen.
    await refreshConflicts();
  };

  const handleDeleteShift = async (id: string) => {
    const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting shift failed");
    setShifts((prev) => prev.filter((s) => s.id !== id));
    // Server löscht kaskadierend auch alle Zuweisungen dieser Schicht (server/routes/shifts.ts).
    setAssignments((prev) => prev.filter((a) => a.shift_id !== id));
    await refreshConflicts();
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

    const newAssignment: ShiftAssignment = await res.json();
    setAssignments((prev) => [...prev, newAssignment]);
    await refreshConflicts();
  };

  const handleRemoveAssignment = async (shiftId: string, userId: string) => {
    const res = await fetch("/api/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, user_id: userId }),
    });
    if (!res.ok) throw new Error("Removing assignment failed");
    setAssignments((prev) => prev.filter((a) => !(a.shift_id === shiftId && a.user_id === userId)));
    await refreshConflicts();
  };

  const handleToggleAssignmentAccepted = async (assignmentId: string, accepted: boolean) => {
    const res = await fetch(`/api/assignments/${assignmentId}/accepted`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepted }),
    });
    if (!res.ok) throw new Error("Toggling assignment accepted state failed");
    const updated: ShiftAssignment = await res.json();
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));
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

    if (res.status === 202) {
      // Offline gequeut - der Server hat noch nicht wirklich geantwortet.
      // Lokal exakt wie der Server-Handler aktualisieren (PUT
      // /assignments/:id/status in server/routes/shifts.ts), wird beim
      // Nachsenden final vom Server bestätigt.
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id !== assignmentId) return a;
          const updated: ShiftAssignment = {
            ...a,
            status,
            accepted: status === "accepted",
            status_updated_at: new Date().toISOString(),
          };
          if (status === "declined") {
            updated.decline_reason = declineReason || "";
          } else {
            delete updated.decline_reason;
          }
          return updated;
        })
      );
      return;
    }

    const updated: ShiftAssignment = await res.json();
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));
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
