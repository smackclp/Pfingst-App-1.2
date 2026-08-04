import { Router } from "express";
import { readDB, writeDB } from "../db";
import { sendNotificationToUser } from "../notifications";
import { MaterialItem, TalentAct } from "../types";
import { requireMinRole, requireRole } from "../auth";

const router = Router();

function canManageMaterial(req: any, materialUserId: string): boolean {
  if (req.authUser.id === materialUserId) return true;
  if (req.authUser.accessRole === "bereichsleiter" || req.authUser.accessRole === "lagerleitung") return true;
  const db = readDB();
  const me = db.users.find((u) => u.id === req.authUser.id) as any;
  return !!me?.is_buyer; // Für den Einkauf zuständige Helfer dürfen Status pflegen
}

// --- MATERIALS ---
router.get("/materials", (req, res) => {
  const db = readDB();
  res.json(db.materials || []);
});

router.post("/materials", async (req, res) => {
  const db = readDB();
  const { user_id, item_name, url, purpose, quantity, price, status } = req.body;
  if (!user_id || !item_name || !purpose) {
    return res.status(400).json({ error: "Fehlende Pflichtfelder: Besteller (user_id), Artikel (item_name), Verwendungszweck (purpose)" });
  }
  // Jede Person darf nur für sich selbst bestellen; Leitung darf auch für andere eintragen.
  if (req.authUser!.id !== user_id && req.authUser!.accessRole === "helfer") {
    return res.status(403).json({ error: "Du kannst nur für dich selbst Materialien bestellen." });
  }
  const newMaterial: MaterialItem = {
    id: `material-${Date.now()}`,
    user_id,
    item_name,
    url: url || "",
    purpose,
    quantity: quantity ? Number(quantity) : 1,
    price: price || "",
    created_at: new Date().toISOString(),
    status: status || "pending",
  };
  if (!db.materials) db.materials = [];
  db.materials.push(newMaterial);
  writeDB(db);

  try {
    const requester = db.users.find((u) => u.id === user_id);
    const requesterName = requester ? requester.display_name : "Ein Helfer";
    const einkaufRole = (db.functionalRoles || []).find(
      (r) => r.name.toLowerCase() === "einkauf" || r.id === "role-einkauf"
    );
    const assignedBuyerId = einkaufRole ? einkaufRole.user_id : null;
    const notificationTargetIds = new Set<string>();
    if (assignedBuyerId) {
      notificationTargetIds.add(assignedBuyerId);
    }
    db.users.forEach((u) => {
      if (u.is_buyer && u.active) {
        notificationTargetIds.add(u.id);
      }
    });

    const buyersToNotify = db.users.filter((u) => notificationTargetIds.has(u.id) && u.active);
    if (buyersToNotify.length > 0) {
      console.log(`Sending new material push notification to ${buyersToNotify.length} buyers`);
      const quantityStr = newMaterial.quantity && newMaterial.quantity > 1 ? ` (${newMaterial.quantity}x)` : "";
      const title = "Neue Materialbestellung 📦";
      const body = `${requesterName} benötigt "${newMaterial.item_name}"${quantityStr} für "${newMaterial.purpose}".`;
      const notificationPromises = buyersToNotify.map((buyer) => 
        sendNotificationToUser(buyer.id, title, body)
      );
      await Promise.all(notificationPromises);
    }
  } catch (err) {
    console.error("Failed to notify buyers for new material item:", err);
  }

  res.status(201).json(newMaterial);
});

router.put("/materials/:id", (req, res) => {
  const db = readDB();
  if (!db.materials) db.materials = [];
  const index = db.materials.findIndex((m) => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Bestellartikel nicht gefunden" });
  }
  if (!canManageMaterial(req, db.materials[index].user_id)) {
    return res.status(403).json({ error: "Du darfst diese Bestellung nicht bearbeiten." });
  }
  db.materials[index] = {
    ...db.materials[index],
    ...req.body,
    id: req.params.id,
  };
  writeDB(db);
  res.json(db.materials[index]);
});

router.delete("/materials/:id", (req, res) => {
  const db = readDB();
  if (!db.materials) db.materials = [];
  const item = db.materials.find((m) => m.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Bestellartikel nicht gefunden" });
  }
  if (!canManageMaterial(req, item.user_id)) {
    return res.status(403).json({ error: "Du darfst diese Bestellung nicht löschen." });
  }
  db.materials = db.materials.filter((m) => m.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- TALENT ACTS (Programm-Verwaltung: mind. Bereichsleiter) ---
router.get("/talent-acts", (req, res) => {
  const db = readDB();
  res.json(db.talentActs || []);
});

router.post("/talent-acts", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const {
    community_name,
    talents_names,
    act_type,
    song_title,
    play_until,
    fade_out,
    fade_out_desc,
    microphones_count,
    instruments,
    lighting_mood,
    spotify_link,
    without_rating,
    order_index,
  } = req.body;

  if (!talents_names || !talents_names.trim()) {
    return res.status(400).json({ error: "Namen der Talente sind erforderlich" });
  }

  const newAct: TalentAct = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    camp_id: db.activeCampId || "camp-2026",
    community_name: community_name?.trim() || "Unbekannte Gemeinde",
    talents_names: talents_names.trim(),
    act_type: act_type?.trim() || "Sonstiges",
    song_title: song_title?.trim() || "",
    play_until: play_until?.trim() || "",
    fade_out: !!fade_out,
    fade_out_desc: fade_out_desc?.trim() || "",
    microphones_count: Number(microphones_count) || 0,
    instruments: instruments?.trim() || "",
    lighting_mood: lighting_mood?.trim() || "",
    spotify_link: spotify_link?.trim() || "",
    without_rating: !!without_rating,
    order_index: typeof order_index === "number" ? order_index : (db.talentActs?.length || 0),
  };

  if (!db.talentActs) db.talentActs = [];
  db.talentActs.push(newAct);
  writeDB(db);
  res.status(201).json(newAct);
});

router.put("/talent-acts/:id", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  if (!db.talentActs) db.talentActs = [];
  const index = db.talentActs.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Talentact nicht gefunden" });
  }

  const {
    community_name,
    talents_names,
    act_type,
    song_title,
    play_until,
    fade_out,
    fade_out_desc,
    microphones_count,
    instruments,
    lighting_mood,
    spotify_link,
    without_rating,
    order_index,
  } = req.body;

  db.talentActs[index] = {
    ...db.talentActs[index],
    community_name: community_name !== undefined ? community_name.trim() : db.talentActs[index].community_name,
    talents_names: talents_names !== undefined ? talents_names.trim() : db.talentActs[index].talents_names,
    act_type: act_type !== undefined ? act_type.trim() : db.talentActs[index].act_type,
    song_title: song_title !== undefined ? song_title.trim() : db.talentActs[index].song_title,
    play_until: play_until !== undefined ? play_until.trim() : db.talentActs[index].play_until,
    fade_out: fade_out !== undefined ? !!fade_out : db.talentActs[index].fade_out,
    fade_out_desc: fade_out_desc !== undefined ? fade_out_desc.trim() : db.talentActs[index].fade_out_desc,
    microphones_count: microphones_count !== undefined ? Number(microphones_count) || 0 : db.talentActs[index].microphones_count,
    instruments: instruments !== undefined ? instruments.trim() : db.talentActs[index].instruments,
    lighting_mood: lighting_mood !== undefined ? lighting_mood.trim() : db.talentActs[index].lighting_mood,
    spotify_link: spotify_link !== undefined ? spotify_link.trim() : db.talentActs[index].spotify_link,
    without_rating: without_rating !== undefined ? !!without_rating : db.talentActs[index].without_rating,
    order_index: order_index !== undefined ? Number(order_index) : db.talentActs[index].order_index,
  };

  writeDB(db);
  res.json(db.talentActs[index]);
});

router.post("/talent-acts/reorder", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const { orders } = req.body;
  if (!orders || typeof orders !== "object") {
    return res.status(400).json({ error: "Fehlendes oder ungültiges 'orders' Objekt" });
  }
  if (!db.talentActs) db.talentActs = [];

  db.talentActs = db.talentActs.map((act) => {
    if (orders[act.id] !== undefined) {
      return { ...act, order_index: Number(orders[act.id]) };
    }
    return act;
  });

  writeDB(db);
  res.json({ success: true, count: db.talentActs.length });
});

router.delete("/talent-acts/:id", requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  if (!db.talentActs) db.talentActs = [];
  const index = db.talentActs.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Talentact nicht gefunden" });
  }
  const deleted = db.talentActs.splice(index, 1)[0];
  writeDB(db);
  res.json({ success: true, deleted });
});

router.post("/talent-acts/clear", requireRole("lagerleitung"), (req, res) => {
  const db = readDB();
  db.talentActs = [];
  writeDB(db);
  res.json({ success: true });
});

export default router;
