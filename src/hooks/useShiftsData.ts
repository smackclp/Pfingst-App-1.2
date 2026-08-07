import React from "react";
import { Shift, ShiftAssignment } from "../types";
import { queuedFetch } from "../lib/offlineQueue";
import { createAndAppend, updateAndReplace, deleteAndFilter, throwIfNotOk } from "../lib/apiMutations";

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
 *
 * handleAddAssignment (Sonder-Fehlerform bei 409-Konflikten) und
 * handleUpdateAssignmentStatus (Offline-Queue mit synthetischer
 * 202-Antwort) bleiben handgeschrieben statt den generischen Helfer aus
 * lib/apiMutations.ts zu nutzen - siehe Kommentare dort dazu.
 */
export function useShiftsData(
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>,
  setAssignments: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>,
  refreshConflicts: () => Promise<void>
) {
  const handleAddShift = async (shiftPayload: Omit<Shift, "id">) => {
    await createAndAppend("/api/shifts", shiftPayload, setShifts, "Adding shift failed");
  };

  const handleUpdateShift = async (id: string, shiftPayload: Partial<Shift>) => {
    await updateAndReplace("/api/shifts/" + id, shiftPayload, id, setShifts, "Updating shift failed");
    // Zeiten-/Kapazitätsänderungen können Konflikte auslösen oder auflösen.
    await refreshConflicts();
  };

  const handleDeleteShift = async (id: string) => {
    await deleteAndFilter<Shift>("/api/shifts/" + id, setShifts, (s) => s.id !== id, "Deleting shift failed");
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

    // Sonder-Fehlerform statt normalem Error: der Aufrufer (CalendarCard.tsx
    // etc.) nutzt {status, message}, um bei Konflikten ein "Trotzdem
    // zuweisen?"-Nachfragen anzubieten - passt nicht in throwIfNotOk().
    if (res.status === 409) {
      const data = await res.json();
      throw { status: 409, message: data.message };
    }
    await throwIfNotOk(res, "Adding assignment failed");

    const newAssignment: ShiftAssignment = await res.json();
    setAssignments((prev) => [...prev, newAssignment]);
    await refreshConflicts();
  };

  const handleRemoveAssignment = async (shiftId: string, userId: string) => {
    await deleteAndFilter<ShiftAssignment>(
      "/api/assignments",
      setAssignments,
      (a) => !(a.shift_id === shiftId && a.user_id === userId),
      "Removing assignment failed",
      { shift_id: shiftId, user_id: userId }
    );
    await refreshConflicts();
  };

  const handleToggleAssignmentAccepted = async (assignmentId: string, accepted: boolean) => {
    await updateAndReplace(
      `/api/assignments/${assignmentId}/accepted`,
      { accepted },
      assignmentId,
      setAssignments,
      "Toggling assignment accepted state failed"
    );
  };

  const handleUpdateAssignmentStatus = async (
    assignmentId: string,
    status: "pending" | "accepted" | "declined" | "maybe",
    declineReason?: string
  ) => {
    // Unkritische, konfliktarme Aktion (eigener Status) -> offline-fähig via
    // queuedFetch: wird bei fehlender Verbindung lokal gespeichert und
    // automatisch nachgesendet, statt sofort zu scheitern. Nutzt deshalb
    // NICHT updateAndReplace() aus lib/apiMutations.ts (das kennt nur echtes
    // fetch(), keine synthetische 202-Antwort ohne Server-Objekt).
    const res = await queuedFetch("PUT", `/api/assignments/${assignmentId}/status`, { status, decline_reason: declineReason }, "Schicht-Status ändern");
    await throwIfNotOk(res, "Updating assignment status failed");

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
