import { Router } from "express";
import { readDB, writeDB } from "../db";
import { sendNotificationToUser } from "../notifications";
import { isSelfOrManager } from "../auth";

const router = Router();

router.get("/notifications", (req, res) => {
  try {
    const db = readDB();
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }
    if (!isSelfOrManager(req, userId)) {
      return res.status(403).json({ error: "Du darfst nur deine eigenen Benachrichtigungen abrufen." });
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
    if (!isSelfOrManager(req, userId)) {
      return res.status(403).json({ error: "Du darfst nur dir selbst eine Test-Benachrichtigung senden." });
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
    if (!isSelfOrManager(req, userId)) {
      return res.status(403).json({ error: "Du darfst das nur für dich selbst tun." });
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
    if (!isSelfOrManager(req, userId)) {
      return res.status(403).json({ error: "Du darfst das nur für dich selbst tun." });
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
    if (!isSelfOrManager(req, userId)) {
      return res.status(403).json({ error: "Du darfst das nur für dich selbst tun." });
    }
    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }
    const existingIndex = db.pushSubscriptions.findIndex((sub) => sub.userId === userId && sub.subscription?.endpoint === subscription?.endpoint);
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
    if (!isSelfOrManager(req, userId)) {
      return res.status(403).json({ error: "Du darfst das nur für dich selbst tun." });
    }
    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }
    const previousCount = db.pushSubscriptions.length;
    if (unsubscribeAll) {
      db.pushSubscriptions = db.pushSubscriptions.filter((sub) => sub.userId !== userId);
    } else if (endpoint) {
      db.pushSubscriptions = db.pushSubscriptions.filter((sub) => !(sub.userId === userId && sub.subscription?.endpoint === endpoint));
    } else {
      db.pushSubscriptions = db.pushSubscriptions.filter((sub) => sub.userId !== userId);
    }
    const removedCount = previousCount - db.pushSubscriptions.length;
    writeDB(db);
    res.json({
      success: true,
      message: `Abo erfolgreich deinstalliert! ${removedCount} Registrierung(en) gelöscht.`,
    });
  } catch (error: any) {
    console.error("Error in push-unsubscribe:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

export default router;
