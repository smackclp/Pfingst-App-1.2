import { Router } from "express";
import { readDB, writeDB } from "../db";
import {
  hashPin,
  verifyPin,
  createSession,
  destroySession,
  sanitizeUser,
  sanitizeUsers,
  authMiddleware,
  isLoginLocked,
  recordFailedLogin,
  clearFailedLogins,
} from "../auth";

const router = Router();

// Öffentlich: Liste der Namen für die Login-Auswahl (KEINE PINs oder sonstige Details).
router.get("/auth/login-directory", (req, res) => {
  const db = readDB();
  const list = db.users
    .filter((u) => u.active)
    .map((u) => ({ id: u.id, display_name: u.display_name }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));
  res.json(list);
});

// Öffentlich: Login mit Person + PIN.
router.post("/auth/login", (req, res) => {
  const { userId, pin } = req.body || {};
  if (!userId || !pin) {
    return res.status(400).json({ error: "Bitte Person und PIN angeben." });
  }
  if (isLoginLocked(userId)) {
    return res.status(429).json({ error: "Zu viele Fehlversuche. Bitte in einer Minute erneut versuchen." });
  }
  const db = readDB();
  const user = db.users.find((u) => u.id === userId) as any;
  if (!user || !user.active) {
    recordFailedLogin(userId);
    return res.status(401).json({ error: "Person oder PIN ist falsch." });
  }
  if (!verifyPin(String(pin), user.pin_hash)) {
    recordFailedLogin(userId);
    return res.status(401).json({ error: "Person oder PIN ist falsch." });
  }
  clearFailedLogins(userId);
  const accessRole = user.access_role || "helfer";
  const token = createSession(user.id, accessRole);
  res.json({ token, accessRole, user: sanitizeUser(user) });
});

router.post("/auth/logout", authMiddleware, (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  if (token) destroySession(token);
  res.json({ success: true });
});

router.get("/auth/me", authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.authUser!.id);
  if (!user) return res.status(404).json({ error: "Nutzer nicht gefunden." });
  res.json({ user: sanitizeUser(user as any), accessRole: req.authUser!.accessRole });
});

// Eigene PIN ändern (aktuelle PIN nötig, außer beim allerersten Setzen).
router.post("/auth/change-pin", authMiddleware, (req, res) => {
  const { currentPin, newPin } = req.body || {};
  if (!newPin || String(newPin).length < 4) {
    return res.status(400).json({ error: "Die neue PIN muss mindestens 4 Zeichen haben." });
  }
  const db = readDB();
  const idx = db.users.findIndex((u) => u.id === req.authUser!.id);
  if (idx === -1) return res.status(404).json({ error: "Nutzer nicht gefunden." });
  const user = db.users[idx] as any;
  if (user.pin_hash && !verifyPin(String(currentPin || ""), user.pin_hash)) {
    return res.status(401).json({ error: "Aktuelle PIN ist falsch." });
  }
  user.pin_hash = hashPin(String(newPin));
  writeDB(db);
  res.json({ success: true });
});

// Nur Lagerleitung: PIN einer anderen Person zurücksetzen (z. B. PIN vergessen).
router.post("/auth/admin/reset-pin/:userId", authMiddleware, (req, res) => {
  if (req.authUser!.accessRole !== "lagerleitung") {
    return res.status(403).json({ error: "Nur die Lagerleitung darf PINs zurücksetzen." });
  }
  const db = readDB();
  const idx = db.users.findIndex((u) => u.id === req.params.userId);
  if (idx === -1) return res.status(404).json({ error: "Nutzer nicht gefunden." });
  const tempPin = String(Math.floor(1000 + Math.random() * 9000)); // 4-stellige Zufalls-PIN
  (db.users[idx] as any).pin_hash = hashPin(tempPin);
  writeDB(db);
  res.json({ success: true, tempPin });
});

// Nur Lagerleitung: Zugriffsrolle einer Person ändern.
router.put("/auth/admin/access-role/:userId", authMiddleware, (req, res) => {
  if (req.authUser!.accessRole !== "lagerleitung") {
    return res.status(403).json({ error: "Nur die Lagerleitung darf Rollen ändern." });
  }
  const { access_role } = req.body || {};
  if (!["helfer", "bereichsleiter", "lagerleitung"].includes(access_role)) {
    return res.status(400).json({ error: "Ungültige Rolle." });
  }
  const db = readDB();
  const idx = db.users.findIndex((u) => u.id === req.params.userId);
  if (idx === -1) return res.status(404).json({ error: "Nutzer nicht gefunden." });
  (db.users[idx] as any).access_role = access_role;
  writeDB(db);
  res.json({ success: true, user: sanitizeUser(db.users[idx] as any) });
});

export default router;
