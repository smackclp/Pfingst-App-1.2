import { Router } from "express";
import { readDB, writeDB } from "../db";
import { getDefaultSeedDB } from "../seed";
import { getLastChange, getStats } from "../firebase";
import { sendNotificationToUser } from "../notifications";

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

// --- STATS ---
router.get("/stats", (req, res) => {
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

// --- NOTIFICATIONS ---
router.get("/notifications", (req, res) => {
  try {
    const db = readDB();
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }
    const notifications = db.notifications || [];
    const userNotifications = notifications
      .filter((n) => n && typeof n === "object" && n.userId === userId)
      .sort((a, b) => {
        const timeA = a && a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b && b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
    res.json(userNotifications);
  } catch (error: any) {
    console.error("CRITICAL ERROR IN GET /api/notifications:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

router.post("/notifications/test", async (req, res) => {
  try {
    const { userId, title, body } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const t = title || "Test-Benachrichtigung 🔔";
    const b = body || "Moin! Das ist eine Test-Benachrichtigung von deinem Pfingstlager Dienstplan-Planer. Alles funktioniert super!";
    await sendNotificationToUser(userId, t, b);
    res.json({ success: true, message: "Test-Benachrichtigung gesendet!" });
  } catch (error: any) {
    console.error("CRITICAL ERROR IN POST /api/notifications/test:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

router.post("/notifications/mark-all-read", (req, res) => {
  try {
    const db = readDB();
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    if (db.notifications) {
      db.notifications = db.notifications.map((n) => {
        if (n && typeof n === "object" && n.userId === userId) {
          return { ...n, read: true };
        }
        return n;
      });
      writeDB(db);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("CRITICAL ERROR IN POST /api/notifications/mark-all-read:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

router.post("/notifications/clear", (req, res) => {
  try {
    const db = readDB();
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    if (db.notifications) {
      db.notifications = db.notifications.filter((n) => n && typeof n === "object" && n.userId !== userId);
      writeDB(db);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("CRITICAL ERROR IN POST /api/notifications/clear:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

router.get("/notifications/vapid-public-key", (req, res) => {
  try {
    const db = readDB();
    if (db.vapidKeys) {
      return res.json({ publicKey: db.vapidKeys.publicKey });
    }
    res.status(404).json({ error: "VAPID key not found" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

router.post("/notifications/push-subscribe", (req, res) => {
  try {
    const db = readDB();
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
      return res.status(400).json({ error: "Missing userId or subscription details" });
    }
    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }
    const existingIndex = db.pushSubscriptions.findIndex(
      (sub) => sub.userId === userId && sub.subscription?.endpoint === subscription?.endpoint
    );
    if (existingIndex > -1) {
      db.pushSubscriptions[existingIndex].subscription = subscription;
    } else {
      db.pushSubscriptions.push({ userId, subscription });
    }
    writeDB(db);
    res.json({ success: true, message: "Abo erfolgreich registriert!" });
  } catch (error: any) {
    console.error("Error in push-subscribe:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

router.post("/notifications/push-unsubscribe", (req, res) => {
  try {
    const db = readDB();
    const { userId, endpoint, unsubscribeAll } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }
    const previousCount = db.pushSubscriptions.length;
    if (unsubscribeAll) {
      db.pushSubscriptions = db.pushSubscriptions.filter((sub) => sub.userId !== userId);
    } else if (endpoint) {
      db.pushSubscriptions = db.pushSubscriptions.filter(
        (sub) => !(sub.userId === userId && sub.subscription?.endpoint === endpoint)
      );
    } else {
      db.pushSubscriptions = db.pushSubscriptions.filter((sub) => sub.userId !== userId);
    }
    const removedCount = previousCount - db.pushSubscriptions.length;
    writeDB(db);
    res.json({ 
      success: true, 
      message: `Abo erfolgreich deinstalliert! ${removedCount} Registrierung(en) gelöscht.` 
    });
  } catch (error: any) {
    console.error("Error in push-unsubscribe:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Sync checker endpoint for light polling
router.get("/sync-check", (req, res) => {
  res.json({ lastChange: getLastChange() });
});

// Backup database endpoint
router.get("/backup", (req, res) => {
  const db = readDB();
  res.setHeader("Content-Disposition", `attachment; filename=pfingsten-app-backup-${new Date().toISOString().split('T')[0]}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(db, null, 2));
});

// Seed / reset database endpoint
router.post("/seed", async (req, res) => {
  try {
    const { year = 2026, mode = "full" } = req.body || {};
    const targetYear = Number(year) || 2026;
    const currentDB = readDB();

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

export default router;
