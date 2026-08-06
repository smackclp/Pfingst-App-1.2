import { Router } from "express";
import { readDB, writeDB, timeToMinutes } from "../db";
import { computeConflicts } from "../conflicts";
import { sendNotificationToUser } from "../notifications";
import { Service, Shift, ShiftAssignment, Camp, DB } from "../types";
import { requireMinRole, isSelfOrManager } from "../auth";

const router = Router();

/** Titel des zu einer Service-ID gehörigen Dienstes, mit Fallback für gelöschte/fehlende Dienste. */
function getServiceTitle(db: DB, serviceId: string): string {
  return db.services.find((s) => s.id === serviceId)?.title || "Dienst";
}

// --- SERVICES ---
router.get("/services", (req, res) => {
  const db = readDB();
  res.json(db.services);
});

router.post("/services", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const { title, description, location, color, category, default_duration, min_persons, max_persons, responsible_id } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Missing required field: title" });
  }
  const newService: Service = {
    id: `service-${Date.now()}`,
    title,
    description: description || "",
    location: location || "",
    color: color || "#3b82f6",
    category: category || "Allgemein",
    default_duration: Number(default_duration) || 60,
    min_persons: Number(min_persons) || 1,
    max_persons: Number(max_persons) || 3,
    responsible_id: responsible_id || "",
  };
  if (newService.max_persons < newService.min_persons) {
    return res.status(400).json({ error: "Max. Helfer*innen darf nicht kleiner als Min. Helfer*innen sein." });
  }
  db.services.push(newService);
  writeDB(db);
  res.status(201).json(newService);
});

router.put("/services/:id", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const index = db.services.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Service not found" });
  }
  const updatedService = {
    ...db.services[index],
    ...req.body,
    id: req.params.id,
  };
  if (Number(updatedService.max_persons) < Number(updatedService.min_persons)) {
    return res.status(400).json({ error: "Max. Helfer*innen darf nicht kleiner als Min. Helfer*innen sein." });
  }
  db.services[index] = updatedService;
  writeDB(db);
  res.json(db.services[index]);
});

router.delete("/services/:id", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const serviceShifts = db.shifts.filter((s) => s.service_id === req.params.id);
  const sids = serviceShifts.map((s) => s.id);
  db.assignments = db.assignments.filter((a) => !sids.includes(a.shift_id));
  db.shifts = db.shifts.filter((s) => s.service_id !== req.params.id);
  db.services = db.services.filter((s) => s.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- SHIFTS ---
router.get("/shifts", (req, res) => {
  const db = readDB();
  const activeCampId = db.activeCampId || "camp-2026";
  const filtered = db.shifts.filter((s) => s.camp_id === activeCampId);
  res.json(filtered);
});

router.get("/shifts/:id/suggestions", (req, res) => {
  const db = readDB();
  const currentShift = db.shifts.find((s) => s.id === req.params.id);
  if (!currentShift) {
    return res.status(404).json({ error: "Schicht nicht gefunden" });
  }

  const currentCamp = db.camps ? db.camps.find((c) => c.id === currentShift.camp_id) : null;
  if (!currentCamp) {
    return res.json([]);
  }

  const previousCamps = db.camps
    ? db.camps.filter((c) => c.year < currentCamp.year).sort((a, b) => b.year - a.year)
    : [];

  if (previousCamps.length === 0) {
    return res.json([]);
  }

  const suggestions: Array<{ user_id: string; year: number; camp_title: string }> = [];
  const addedUserIds = new Set<string>();

  const getRelativeDay = (dateStr: string, camp: Camp): string => {
    if (dateStr === "Haupt") return "Haupt";
    if (dateStr === camp.start_date) return "day1";
    try {
      const sDate = new Date(camp.start_date);
      sDate.setDate(sDate.getDate() + 1);
      const day2 = sDate.toISOString().split("T")[0];
      if (dateStr === day2) return "day2";
    } catch (e) {}
    if (dateStr === camp.end_date) return "day3";
    return "other";
  };

  const currentRelativeDay = getRelativeDay(currentShift.date, currentCamp);

  for (const prevCamp of previousCamps) {
    const prevShifts = db.shifts.filter((s) => {
      if (s.camp_id !== prevCamp.id) return false;
      if (s.service_id !== currentShift.service_id) return false;
      if (s.start_time !== currentShift.start_time || s.end_time !== currentShift.end_time) return false;
      const relDay = getRelativeDay(s.date, prevCamp);
      return relDay === currentRelativeDay;
    });

    for (const prevShift of prevShifts) {
      const prevAssignments = db.assignments.filter((a) => a.shift_id === prevShift.id);
      for (const assign of prevAssignments) {
        if (!addedUserIds.has(assign.user_id)) {
          addedUserIds.add(assign.user_id);
          suggestions.push({
            user_id: assign.user_id,
            year: prevCamp.year,
            camp_title: prevCamp.title,
          });
        }
      }
    }
  }

  res.json(suggestions);
});

router.post("/shifts", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const { service_id, date, start_time, end_time, notes } = req.body;
  if (!service_id || !date || !start_time || !end_time) {
    return res.status(400).json({ error: "Missing required fields: service_id, date, start_time, end_time" });
  }

  const activeCampId = db.activeCampId || "camp-2026";
  const newShift: Shift = {
    id: `shift-${Date.now()}`,
    service_id,
    date,
    start_time,
    end_time,
    notes: notes || "",
    camp_id: activeCampId,
  };

  db.shifts.push(newShift);
  writeDB(db);
  res.status(201).json(newShift);
});

router.put("/shifts/:id", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const index = db.shifts.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Shift not found" });
  }

  const oldShift = db.shifts[index];
  const newShift = {
    ...oldShift,
    ...req.body,
    id: req.params.id,
  };

  db.shifts[index] = newShift;
  writeDB(db);

  const isTimeOrDateChanged =
    oldShift.start_time !== newShift.start_time ||
    oldShift.end_time !== newShift.end_time ||
    oldShift.date !== newShift.date ||
    oldShift.notes !== newShift.notes;

  if (isTimeOrDateChanged) {
    try {
      const assignedUserIds = db.assignments
        .filter((a) => a.shift_id === req.params.id)
        .map((a) => a.user_id);

      if (assignedUserIds.length > 0) {
        const srvTitle = getServiceTitle(db, newShift.service_id);
        const dateStr = newShift.date === "Haupt" ? "Hauptaufgabe 🏕️" : newShift.date.split("-").reverse().join(".");
        const shiftTime = newShift.date === "Haupt" ? "Dauerhaft" : `${newShift.start_time} - ${newShift.end_time}`;
        
        assignedUserIds.forEach((userId) => {
          sendNotificationToUser(
            userId,
            "Schichtzeit geändert! ⏰",
            `Die Zeiten oder Details für deinen Dienst "${srvTitle}" wurden angepasst.\n📅 Neues Datum: ${dateStr}\n⏰ Neue Uhrzeit: ${shiftTime}\n📝 Notiz: ${newShift.notes || "Keine"}`
          );
        });
      }
    } catch (err) {
      console.error("Failed to notify users on shift change:", err);
    }
  }

  res.json(newShift);
});

router.delete("/shifts/:id", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  db.assignments = db.assignments.filter((a) => a.shift_id !== req.params.id);
  db.shifts = db.shifts.filter((s) => s.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- ASSIGNMENTS ---
router.get("/assignments", (req, res) => {
  const db = readDB();
  const activeCampId = db.activeCampId || "camp-2026";
  const campShiftIds = new Set(db.shifts.filter((s) => s.camp_id === activeCampId).map((s) => s.id));
  const filtered = db.assignments.filter((a) => campShiftIds.has(a.shift_id));
  res.json(filtered);
});

router.post("/assignments", (req, res) => {
  const db = readDB();
  const { shift_id, user_id, force } = req.body;
  if (!shift_id || !user_id) {
    return res.status(400).json({ error: "Missing required fields: shift_id, user_id" });
  }

  // Jede Person darf sich selbst für eine Schicht eintragen. Andere Personen
  // einzuteilen ist Sache der Bereichsleitung/Lagerleitung (Schichtplanung).
  if (!isSelfOrManager(req, user_id)) {
    return res.status(403).json({ error: "Du kannst nur dich selbst für eine Schicht eintragen." });
  }

  const existing = db.assignments.find((a) => a.shift_id === shift_id && a.user_id === user_id);
  if (existing) {
    return res.status(400).json({ error: "Person ist dieser Schicht bereits zugeordnet." });
  }

  const activeShift = db.shifts.find((s) => s.id === shift_id);
  if (!activeShift) {
    return res.status(404).json({ error: "Schicht existiert nicht." });
  }

  const userShifts = db.assignments
    .filter((a) => a.user_id === user_id)
    .map((a) => db.shifts.find((s) => s.id === a.shift_id))
    .filter((s): s is Shift => !!s && s.date === activeShift.date);

  let hasOverlap = false;
  let overlappingServiceTitle = "";
  const startNew = timeToMinutes(activeShift.start_time);
  const endNew = timeToMinutes(activeShift.end_time);

  if (activeShift.date !== "Haupt") {
    for (const s of userShifts) {
      if (s.date === "Haupt") continue;
      const startExist = timeToMinutes(s.start_time);
      const endExist = timeToMinutes(s.end_time);

      if (startNew < endExist && startExist < endNew) {
        hasOverlap = true;
        overlappingServiceTitle = `${getServiceTitle(db, s.service_id)} (${s.start_time}-${s.end_time})`;
        break;
      }
    }
  }

  if (hasOverlap && !force) {
    const user = db.users.find((u) => u.id === user_id);
    return res.status(409).json({
      error: "CONFL_OVERLAP",
      message: `Konflikt: ${user?.display_name || "Person"} überschneidet sich mit '${overlappingServiceTitle}'. Trotzdem zuweisen?`,
    });
  }

  // Kapazität prüfen (Schicht-Override hat Vorrang vor dem Service-Standard,
  // gleiches Muster wie ShiftRow.tsx/CalendarCard.tsx). Bisher wurde das nur
  // im Frontend geprüft - zwei gleichzeitige Selbst-Eintragungen für den
  // letzten freien Platz konnten die Schicht dadurch beide durchkommen und
  // überbuchen. force=true erlaubt weiterhin ein bewusstes Übersteuern durch
  // die Schichtplanung (gleicher Mechanismus wie beim Überschneidungs-Konflikt).
  const activeService = db.services.find((sv) => sv.id === activeShift.service_id);
  if (activeService) {
    const maxPersons = activeShift.max_persons !== undefined ? activeShift.max_persons : activeService.max_persons;
    const currentCount = db.assignments.filter((a) => a.shift_id === shift_id).length;
    if (currentCount >= maxPersons && !force) {
      return res.status(409).json({
        error: "CONFL_CAPACITY",
        message: `Diese Schicht ist mit ${currentCount}/${maxPersons} Personen bereits voll besetzt. Trotzdem zuweisen?`,
      });
    }
  }

  const newAssignment: ShiftAssignment = {
    id: `ass-${Date.now()}`,
    shift_id,
    user_id,
    assigned_at: new Date().toISOString(),
  };

  db.assignments.push(newAssignment);
  writeDB(db);

  try {
    const srv = db.services.find((s) => s.id === activeShift.service_id);
    const srvTitle = getServiceTitle(db, activeShift.service_id);
    const dateStr = activeShift.date === "Haupt" ? "Hauptaufgabe 🏕️" : activeShift.date.split("-").reverse().join(".");
    const shiftTime = activeShift.date === "Haupt" ? "Dauerhaft" : `${activeShift.start_time} - ${activeShift.end_time}`;
    sendNotificationToUser(
      user_id,
      "Neue Schichteinteilung! 🏕️",
      `Du wurdest für die Schicht "${srvTitle}" eingeteilt.\n📅 Datum: ${dateStr}\n⏰ Uhrzeit: ${shiftTime}\n📍 Ort: ${srv?.location || "Zeltlager"}`
    );
  } catch (err) {
    console.error("Failed to trigger assignment notification", err);
  }

  res.status(201).json(newAssignment);
});

router.delete("/assignments", (req, res) => {
  const db = readDB();
  const { shift_id, user_id } = req.body;
  if (!shift_id || !user_id) {
    return res.status(400).json({ error: "Missing required fields: shift_id, user_id" });
  }

  if (!isSelfOrManager(req, user_id)) {
    return res.status(403).json({ error: "Du kannst nur deine eigene Zuordnung austragen." });
  }

  try {
    const activeShift = db.shifts.find((s) => s.id === shift_id);
    if (activeShift) {
      const srvTitle = getServiceTitle(db, activeShift.service_id);
      const dateStr = activeShift.date === "Haupt" ? "Campaufgabe 🏕️" : activeShift.date.split("-").reverse().join(".");
      sendNotificationToUser(
        user_id,
        "Aus Schicht ausgetragen ❌",
        `Du wurdest aus der Schicht "${srvTitle}" (${dateStr}) ausgetragen.`
      );
    }
  } catch (err) {
    console.error("Failed to trigger deletion notification", err);
  }

  db.assignments = db.assignments.filter((a) => !(a.shift_id === shift_id && a.user_id === user_id));
  writeDB(db);
  res.json({ success: true });
});

router.delete("/assignments/:id", (req, res) => {
  const db = readDB();
  const target = db.assignments.find((a) => a.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: "Zuordnung nicht gefunden." });
  }
  if (!isSelfOrManager(req, target.user_id)) {
    return res.status(403).json({ error: "Du kannst nur deine eigene Zuordnung austragen." });
  }

  try {
    const assignment = db.assignments.find((a) => a.id === req.params.id);
    if (assignment) {
      const activeShift = db.shifts.find((s) => s.id === assignment.shift_id);
      if (activeShift) {
        const srvTitle = getServiceTitle(db, activeShift.service_id);
        const dateStr = activeShift.date === "Camp" || activeShift.date === "Haupt" ? "Hauptaufgabe" : activeShift.date.split("-").reverse().join(".");
        sendNotificationToUser(
          assignment.user_id,
          "Aus Schicht ausgetragen ❌",
          `Du wurdest von der Schicht "${srvTitle}" (${dateStr}) ausgetragen.`
        );
      }
    }
  } catch (err) {
    console.error("Failed to trigger deletion-by-id notification", err);
  }

  db.assignments = db.assignments.filter((a) => a.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

router.put("/assignments/:id/accepted", (req, res) => {
  const db = readDB();
  const assignment = db.assignments.find((a) => a.id === req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: "Zuordnung nicht gefunden." });
  }
  if (!isSelfOrManager(req, assignment.user_id)) {
    return res.status(403).json({ error: "Du kannst nur deinen eigenen Status ändern." });
  }
  const isAccepted = !!req.body.accepted;
  assignment.accepted = isAccepted;
  assignment.status = isAccepted ? 'accepted' : 'pending';
  assignment.status_updated_at = new Date().toISOString();
  writeDB(db);
  res.json(assignment);
});

router.put("/assignments/:id/status", (req, res) => {
  const db = readDB();
  const assignment = db.assignments.find((a) => a.id === req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: "Zuordnung nicht gefunden." });
  }
  if (!isSelfOrManager(req, assignment.user_id)) {
    return res.status(403).json({ error: "Du kannst nur deinen eigenen Status ändern." });
  }
  const { status, decline_reason } = req.body;
  if (status) {
    assignment.status = status;
    assignment.accepted = status === 'accepted';
    assignment.status_updated_at = new Date().toISOString();
    if (status === 'declined') {
      assignment.decline_reason = decline_reason || '';
    } else {
      delete assignment.decline_reason;
    }
  }
  writeDB(db);
  res.json(assignment);
});

// --- CONFLICTS ---
router.get("/conflicts", (req, res) => {
  const db = readDB();
  const activeCampId = db.activeCampId || "camp-2026";
  const filteredShifts = db.shifts.filter((s) => s.camp_id === activeCampId);
  const campShiftIds = new Set(filteredShifts.map((s) => s.id));
  const filteredAssignments = db.assignments.filter((a) => campShiftIds.has(a.shift_id));

  const filteredDb: DB = {
    ...db,
    shifts: filteredShifts,
    assignments: filteredAssignments,
  };

  const list = computeConflicts(filteredDb);
  res.json(list);
});

export default router;
