import { Router } from "express";
import { readDB, writeDB } from "../db";
import { User, FunctionalRole, Community } from "../types";

const router = Router();

// --- USERS ---
router.get("/users", (req, res) => {
  const db = readDB();
  res.json(db.users);
});

router.post("/users", (req, res) => {
  const db = readDB();
  const { first_name, last_name, display_name, email, phone, role, active, notes, is_buyer } = req.body;
  if (!first_name || !last_name || !display_name) {
    return res.status(400).json({ error: "Missing required fields: first_name, last_name, display_name" });
  }
  const newUser: User = {
    id: `user-${Date.now()}`,
    first_name,
    last_name,
    display_name,
    email: email || "",
    phone: phone || "",
    role: role || "",
    active: active !== undefined ? active : true,
    notes: notes || "",
    is_buyer: !!is_buyer,
  };
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

router.put("/users/:id", (req, res) => {
  const db = readDB();
  const index = db.users.findIndex((u) => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  db.users[index] = {
    ...db.users[index],
    ...req.body,
    id: req.params.id,
  };
  writeDB(db);
  res.json(db.users[index]);
});

router.delete("/users/:id", (req, res) => {
  const db = readDB();
  db.assignments = db.assignments.filter((a) => a.user_id !== req.params.id);
  db.users = db.users.filter((u) => u.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- ROLES ---
router.get("/roles", (req, res) => {
  const db = readDB();
  res.json(db.functionalRoles || []);
});

router.post("/roles", (req, res) => {
  const db = readDB();
  const { name, user_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Rollenname ist erforderlich" });
  }
  const newRole: FunctionalRole = {
    id: `role-${Date.now()}`,
    name: name.trim(),
    user_id: user_id || null,
  };
  if (!db.functionalRoles) db.functionalRoles = [];
  db.functionalRoles.push(newRole);
  writeDB(db);
  res.status(201).json(newRole);
});

router.put("/roles/:id", (req, res) => {
  const db = readDB();
  if (!db.functionalRoles) db.functionalRoles = [];
  const index = db.functionalRoles.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Rolle nicht gefunden" });
  }
  db.functionalRoles[index] = {
    ...db.functionalRoles[index],
    ...req.body,
    id: req.params.id,
  };
  writeDB(db);
  res.json(db.functionalRoles[index]);
});

router.delete("/roles/:id", (req, res) => {
  const db = readDB();
  if (!db.functionalRoles) db.functionalRoles = [];
  db.functionalRoles = db.functionalRoles.filter((r) => r.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- COMMUNITIES ---
router.get("/communities", (req, res) => {
  const db = readDB();
  res.json(db.communities || []);
});

router.post("/communities", (req, res) => {
  const db = readDB();
  const { name, location, participants, camp_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Gemeindename ist erforderlich" });
  }
  const newCommunity: Community = {
    id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    location: location?.trim() || "",
    participants: Number(participants) || 0,
    camp_id: camp_id || db.activeCampId || "camp-2026",
  };
  if (!db.communities) db.communities = [];
  db.communities.push(newCommunity);
  writeDB(db);
  res.status(201).json(newCommunity);
});

router.post("/communities/import", (req, res) => {
  const db = readDB();
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Payload muss ein Array sein" });
  }
  if (!db.communities) db.communities = [];
  const imported: Community[] = [];

  for (const item of items) {
    if (!item.name || !item.name.trim()) continue;
    const newCommunity: Community = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: item.name.trim(),
      location: item.location?.trim() || "",
      participants: Number(item.participants) || 0,
      camp_id: item.camp_id || db.activeCampId || "camp-2026",
    };
    db.communities.push(newCommunity);
    imported.push(newCommunity);
  }
  writeDB(db);
  res.status(201).json({ success: true, count: imported.length, imported });
});

router.put("/communities/:id", (req, res) => {
  const db = readDB();
  if (!db.communities) db.communities = [];
  const index = db.communities.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Gemeinde nicht gefunden" });
  }
  const { name, location, participants, camp_id } = req.body;
  db.communities[index] = {
    ...db.communities[index],
    name: name !== undefined ? name.trim() : db.communities[index].name,
    location: location !== undefined ? location.trim() : db.communities[index].location,
    participants: participants !== undefined ? Number(participants) || 0 : db.communities[index].participants,
    camp_id: camp_id !== undefined ? camp_id : db.communities[index].camp_id,
  };
  writeDB(db);
  res.json(db.communities[index]);
});

router.delete("/communities/:id", (req, res) => {
  const db = readDB();
  if (!db.communities) db.communities = [];
  db.communities = db.communities.filter((c) => c.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

router.post("/communities/clear", (req, res) => {
  const db = readDB();
  db.communities = [];
  writeDB(db);
  res.json({ success: true });
});

export default router;
