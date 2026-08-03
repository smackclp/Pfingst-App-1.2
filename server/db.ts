import fs from "fs";
import path from "path";
import webpush from "web-push";
import { DB, Camp, Shift, ShiftAssignment } from "./types";
import { getDefaultSeedDB } from "./seed";
import { 
  getUnifiedDB, 
  isFirebaseEnabled, 
  writeFirestoreDoc, 
  deleteFirestoreDoc, 
  writeGlobalSettings,
  registerChangeListener
} from "./firebase";

const DB_FILE = path.join(process.cwd(), "db.json");

// Local module-level in-memory cache synchronized with Firestore
let currentCachedDB: DB | null = null;

// Initialize cache synchronously with local file first, then transition to Firestore cache
function getInitialLocalDB(): DB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.users && parsed.users.length > 0) {
        // Ensure default camp and active camp exists
        if (!parsed.camps || parsed.camps.length === 0) {
          parsed.camps = [
            { id: "camp-2026", year: 2026, start_date: "2026-05-23", end_date: "2026-05-25", title: "Pfingstlager 2026" }
          ];
        }
        if (!parsed.activeCampId) {
          parsed.activeCampId = "camp-2026";
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read local fallback db.json, generating defaults:", err);
  }

  const defaultDB = getDefaultSeedDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save initial db.json:", e);
  }
  return defaultDB;
}

// Initialize current cache
currentCachedDB = getInitialLocalDB();

// Register Firestore push change listener to keep server in-memory database 100% in sync with zero performance penalty
if (isFirebaseEnabled()) {
  registerChangeListener(async () => {
    try {
      const cloudDB = await getUnifiedDB(true);
      currentCachedDB = cloudDB;
      console.log("Server in-memory DB cache updated from cloud Firestore.");
    } catch (err) {
      console.error("Error refreshing server cache from Firestore snapshot update:", err);
    }
  });
}

// Synchronously serve from server-side memory cache (0ms database latency, 0 Firestore reads)
export function readDB(): DB {
  if (!currentCachedDB) {
    currentCachedDB = getInitialLocalDB();
  }
  return currentCachedDB;
}

// Set database state from Firestore on boot
export function setCachedDB(db: DB) {
  currentCachedDB = db;
}

// Write database changes to local storage backup AND perform incremental cloud diff sync to Firestore
export function writeDB(newData: DB) {
  const previousDB = currentCachedDB ? JSON.parse(JSON.stringify(currentCachedDB)) : getInitialLocalDB();
  currentCachedDB = newData;

  // 1. Write local backup json file
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(newData, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write fallback db.json", err);
  }

  // 2. Perform intelligent incremental diff sync to Firestore to minimize write queries and ensure high scalability
  if (isFirebaseEnabled()) {
    Promise.resolve().then(async () => {
      try {
        const collections = [
          "users", "services", "shifts", "assignments", "camps", 
          "materials", "functionalRoles", "communities", "talentActs", "notifications"
        ];

        for (const colName of collections) {
          const oldItems: any[] = (previousDB as any)[colName] || [];
          const newItems: any[] = (newData as any)[colName] || [];

          const oldMap = new Map(oldItems.map(item => [item.id, item]));
          const newMap = new Map(newItems.map(item => [item.id, item]));

          // Find added or updated items
          for (const [id, item] of newMap.entries()) {
            const oldItem = oldMap.get(id);
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
              await writeFirestoreDoc(colName, id, item);
            }
          }

          // Find deleted items
          for (const id of oldMap.keys()) {
            if (!newMap.has(id)) {
              await deleteFirestoreDoc(colName, id);
            }
          }
        }

        // Sync settings/metadata if changed
        if (previousDB.activeCampId !== newData.activeCampId || 
            JSON.stringify(previousDB.vapidKeys) !== JSON.stringify(newData.vapidKeys)) {
          await writeGlobalSettings({
            activeCampId: newData.activeCampId,
            vapidKeys: newData.vapidKeys
          });
        }
      } catch (syncErr) {
        console.error("Asynchronous incremental cloud sync failed:", syncErr);
      }
    });
  }
}

// Utility times
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatDateGerman(dateStr: string): string {
  if (!dateStr || dateStr === "Haupt") return "Dauerhaft";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}
