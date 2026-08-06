import { Router } from "express";
import { readDB, writeDB, saveResetBackup, readResetBackup, clearResetBackup } from "../db";
import { getDefaultSeedDB } from "../seed";
import { getLastChange, getStats } from "../firebase";
import { requireMinRole, requireRole } from "../auth";

const router = Router();

function calculateShiftHours(start: string, end: string): number {
  if (start === "Dauerhaft" || !start || !end) return 0;
  try {
    const [startH, startM] = start.split(":").map(Number);
    let [endH, endM] = end.split(":").map(Number);
    if (endH < startH || (endH === startH && endM < startM)) {
      endH += 24;
    }
    const totalMin = (endH * 60 + endM) - (startH * 60 + startM);
    return Math.round((totalMin / 60) * 10) / 10;
  } catch {
    return 1;
  }
}

// --- STATS (enthält Stunden/Schichten ALLER Helfer -> mind. Bereichsleitung) ---
router.get("/stats", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const activeCampId = db.activeCampId || "camp-2026";

  const shifts = db.shifts.filter((s) => s.camp_id === activeCampId);
  const campShiftIds = new Set(shifts.map((s) => s.id));
  const assignments = db.assignments.filter((a) => campShiftIds.has(a.shift_id));
  const activeWorkers = db.users.filter((u) => u.active);

  const totalShifts = shifts.length;
  const unassignedShifts = shifts.filter((s) => assignments.filter((a) => a.shift_id === s.id).length === 0).length;

  let totalHours = 0;
  shifts.forEach((s) => {
    totalHours += calculateShiftHours(s.start_time, s.end_time);
  });

  const totalWorkersCount = activeWorkers.length;
  const uniqueAssignedUserIds = new Set(assignments.map((a) => a.user_id));
  const assignedWorkersCount = uniqueAssignedUserIds.size;

  let understaffedShiftsCount = 0;
  shifts.forEach((s) => {
    const svc = db.services.find((sv) => sv.id === s.service_id);
    if (svc) {
      const assignedCount = assignments.filter((a) => a.shift_id === s.id).length;
      if (assignedCount < svc.min_persons) {
        understaffedShiftsCount++;
      }
    }
  });

  const avgShiftsPerWorker = totalWorkersCount > 0 ? Number((assignments.length / totalWorkersCount).toFixed(1)) : 0;

  const workerStatsList = activeWorkers.map((w) => {
    const userAssignments = assignments.filter((a) => a.user_id === w.id);
    const shiftsCount = userAssignments.length;

    let hoursCount = 0;
    userAssignments.forEach((a) => {
      const s = shifts.find((sh) => sh.id === a.shift_id);
      if (s) {
        hoursCount += calculateShiftHours(s.start_time, s.end_time);
      }
    });

    return {
      user_id: w.id,
      name: w.display_name,
      role: w.role,
      shiftsCount,
      hoursCount: Number(hoursCount.toFixed(1)),
    };
  });

  res.json({
    totalShifts,
    unassignedShifts,
    totalHours: Number(totalHours.toFixed(1)),
    totalWorkersCount,
    assignedWorkersCount,
    understaffedShiftsCount,
    avgShiftsPerWorker,
    workerStats: workerStatsList,
    serverStats: getStats(),
  });
});

// Sync checker endpoint for light polling
router.get("/sync-check", (req, res) => {
  res.json({ lastChange: getLastChange() });
});

// Backup database endpoint
router.get("/backup", requireRole("lagerleitung"), (req, res) => {
  const db = readDB();
  res.setHeader("Content-Disposition", `attachment; filename=pfingsten-app-backup-${new Date().toISOString().split('T')[0]}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(db, null, 2));
});

// Seed / reset database endpoint
router.post("/seed", requireRole("lagerleitung"), async (req, res) => {
  try {
    const { year = 2026, mode = "full" } = req.body || {};
    const targetYear = Number(year) || 2026;
    const currentDB = readDB();

    // Vor jedem Reset-Modus den bisherigen Stand sichern, damit er über
    // "Letzten Stand wiederherstellen" zurückgeholt werden kann - ein Reset
    // ist die folgenreichste Aktion der App und verdient mehr Schutz als
    // nur die Bestätigungsabfrage im Modal.
    saveResetBackup(currentDB);

    if (mode === "clear_assignments") {
      currentDB.assignments = [];
      writeDB(currentDB);
      return res.json({
        success: true,
        message: "Alle Helfer-Einteilungen wurden erfolgreich geleert! Schichten und Dienste bleiben erhalten.",
        db: currentDB
      });
    }

    if (mode === "shifts_only") {
      const seedDB = getDefaultSeedDB(targetYear);
      const targetCamp = seedDB.camps[0];
      if (!currentDB.camps) currentDB.camps = [];
      const campIdx = currentDB.camps.findIndex(c => c.id === targetCamp.id || c.year === targetYear);
      if (campIdx >= 0) {
        currentDB.camps[campIdx] = targetCamp;
      } else {
        currentDB.camps.push(targetCamp);
      }
      currentDB.activeCampId = targetCamp.id;

      currentDB.services = seedDB.services;
      currentDB.shifts = seedDB.shifts;
      currentDB.assignments = seedDB.assignments;

      writeDB(currentDB);
      return res.json({
        success: true,
        message: `Standard-Schichten & Dienste für Pfingsten ${targetYear} wurden erfolgreich eingespielt!`,
        db: currentDB
      });
    }

    const newDB = getDefaultSeedDB(targetYear);
    writeDB(newDB);
    return res.json({
      success: true,
      message: `Datenbank wurde vollständig auf das Muster Pfingsten ${targetYear} zurückgesetzt!`,
      db: newDB
    });

  } catch (err: any) {
    console.error("Error in /api/seed:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Status der automatischen Vor-Reset-Sicherung (für den "Wiederherstellen"-Hinweis in CampsView)
router.get("/seed/backup-status", requireRole("lagerleitung"), (req, res) => {
  const backup = readResetBackup();
  res.json({ available: !!backup, timestamp: backup?.timestamp || null });
});

// Letzten Stand vor dem zuletzt ausgeführten Reset wiederherstellen
router.post("/seed/restore", requireRole("lagerleitung"), async (req, res) => {
  const backup = readResetBackup();
  if (!backup) {
    return res.status(404).json({ error: "Keine Sicherung zum Wiederherstellen vorhanden." });
  }
  writeDB(backup.db);
  clearResetBackup();
  const ts = new Date(backup.timestamp).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
  res.json({ success: true, message: `Stand vom ${ts} wurde wiederhergestellt.`, db: backup.db });
});

export default router;
