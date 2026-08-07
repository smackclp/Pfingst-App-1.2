import fs from "fs";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { DB } from "./types";
import { getDefaultSeedDB } from "./seed";
import { getDbFilePath } from "./dbPath";

// Der Server ist die EINZIGE Instanz, die mit Firestore spricht (der Browser
// ruft ausschließlich unsere eigene /api/* an). Deshalb nutzt der Server das
// Admin-SDK mit einem Service-Account statt des öffentlichen Client-SDKs -
// das Admin-SDK umgeht die Firestore Security Rules, die im Gegenzug auf
// "kompletter Direktzugriff gesperrt" stehen (siehe firestore.rules).
//
// Der Service-Account-Schlüssel ist ein Geheimnis und darf NIE ins Repo.
// Lokal: Pfad per FIREBASE_SERVICE_ACCOUNT_PATH oder Standarddatei
// "firebase-service-account.json" im Projektroot (in .gitignore).
// Gehostet: Inhalt der JSON-Datei als Umgebungsvariable FIREBASE_SERVICE_ACCOUNT_JSON.
const SERVICE_ACCOUNT_PATH = path.join(
  process.cwd(),
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "firebase-service-account.json"
);

let db: Firestore | null = null;
let isConfigured = false;

try {
  let serviceAccount: any = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
  }

  if (serviceAccount) {
    const app = getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];

    db = getFirestore(app);
    isConfigured = true;
    console.log("Firebase Admin/Firestore initialized successfully for project:", serviceAccount.project_id);
  } else {
    console.warn(
      "Kein Firebase Service-Account gefunden (weder FIREBASE_SERVICE_ACCOUNT_JSON noch",
      SERVICE_ACCOUNT_PATH, ") - App läuft im lokalen Fallback-Modus (db.json)."
    );
  }
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
}

export function isFirebaseEnabled(): boolean {
  return isConfigured && db !== null;
}

// Alle DB-Arrays, die 1:1 als eigene Firestore-Collection gespiegelt werden
// (Dokument-ID = item.id). Zentrale Stelle statt 3 identischer Kopien.
export const FIRESTORE_COLLECTIONS = ["users", "services", "shifts", "assignments", "camps", "materials", "functionalRoles", "communities", "talentActs", "notifications", "pushSubscriptions", "sogStations"] as const;

// In-Memory Database Cache to reduce Firestore read costs to absolute zero for client fetches!
let localCache: DB | null = null;
let changeListeners: Array<() => void> = [];
let lastChangeTimestamp = Date.now();

export function getLastChange(): number {
  return lastChangeTimestamp;
}

export interface FirestoreStats {
  date: string;
  reads: number;
  writes: number;
  deletes: number;
  apiHits: number;
}

let stats: FirestoreStats = {
  date: new Date().toISOString().split("T")[0],
  reads: 0,
  writes: 0,
  deletes: 0,
  apiHits: 0
};

function checkAndResetStats() {
  const today = new Date().toISOString().split("T")[0];
  if (stats.date !== today) {
    stats = {
      date: today,
      reads: 0,
      writes: 0,
      deletes: 0,
      apiHits: 0
    };
  }
}

export function recordFirestoreReads(count: number) {
  checkAndResetStats();
  stats.reads += count;
}

export function recordFirestoreWrite() {
  checkAndResetStats();
  stats.writes += 1;
}

export function recordFirestoreDelete() {
  checkAndResetStats();
  stats.deletes += 1;
}

export function recordApiHit() {
  checkAndResetStats();
  stats.apiHits += 1;
}

export function getStats() {
  checkAndResetStats();
  return { ...stats };
}

// Fetch all collections from Firestore, fallback to local file if Firestore is empty or disabled
export async function getUnifiedDB(forceRefresh = false): Promise<DB> {
  if (!isFirebaseEnabled()) {
    return loadLocalDBFallback();
  }

  if (localCache && !forceRefresh) {
    return localCache;
  }

  try {
    console.log("Fetching full database state from Firestore...");
    const dbState: Partial<DB> = {};

    let totalReads = 0;
    await Promise.all(
      FIRESTORE_COLLECTIONS.map(async (colName) => {
        const snapshot = await db!.collection(colName).get();
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        (dbState as any)[colName] = list;
        totalReads += Math.max(1, snapshot.size);
      })
    );

    // Fetch settings document (activeCampId, vapidKeys, lastChange)
    const settingsRef = db!.collection("settings").doc("global");
    const settingsSnap = await settingsRef.get();
    totalReads += 1;
    recordFirestoreReads(totalReads);

    if (settingsSnap.exists) {
      const data = settingsSnap.data();
      dbState.activeCampId = data.activeCampId;
      dbState.vapidKeys = data.vapidKeys;
      lastChangeTimestamp = data.lastChange || lastChangeTimestamp;
    }

    // Auto-migration / seeding if Firestore is empty or missing core collections
    const totalRecords = Object.values(dbState).reduce((acc: number, curr) => {
      return acc + (Array.isArray(curr) ? curr.length : 0);
    }, 0);

    const hasUsers = Array.isArray(dbState.users) && dbState.users.length > 0;
    const hasServices = Array.isArray(dbState.services) && dbState.services.length > 0;

    if (totalRecords === 0 || !hasUsers || !hasServices) {
      console.log("Firestore appears to be empty or incomplete. Migrating initial seed data to Firestore...");
      const localData = loadLocalDBFallback();
      await migrateToFirestore(localData);
      localCache = localData;
      return localData;
    }

    // Set missing fields to empty arrays
    if (!dbState.users) dbState.users = [];
    if (!dbState.services) dbState.services = [];
    if (!dbState.shifts) dbState.shifts = [];
    if (!dbState.assignments) dbState.assignments = [];
    if (!dbState.materials) dbState.materials = [];
    if (!dbState.functionalRoles) dbState.functionalRoles = [];
    if (!dbState.communities) dbState.communities = [];
    if (!dbState.talentActs) dbState.talentActs = [];
    if (!dbState.notifications) dbState.notifications = [];

    // Einmalige Übernahme: pushSubscriptions/sogStations wurden erst mit
    // diesem Fix in FIRESTORE_COLLECTIONS aufgenommen (vorher nur im lokalen
    // db.json-Backup, nie in Firestore selbst - gingen dadurch bei jedem
    // Serverneustart verloren, siehe AUDIT.md). Falls Firestore für diese
    // beiden Felder noch leer ist, aber die lokale Backup-Datei noch Daten
    // aus der Zeit vor dem Fix enthält, werden sie einmalig hochgeladen,
    // statt sie stillschweigend zu verlieren.
    if (!dbState.pushSubscriptions || dbState.pushSubscriptions.length === 0) {
      const localFallback = loadLocalDBFallback();
      const localSubs = localFallback.pushSubscriptions || [];
      if (localSubs.length > 0) {
        console.log(`Migrating ${localSubs.length} pre-existing push subscription(s) from local backup to Firestore...`);
        for (const sub of localSubs) {
          if (!sub) continue;
          // Abos aus der Zeit vor diesem Fix hatten noch keine eigene ID.
          if (!sub.id) sub.id = `pushsub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await writeFirestoreDoc("pushSubscriptions", sub.id, sub);
        }
        dbState.pushSubscriptions = localSubs;
      } else {
        dbState.pushSubscriptions = [];
      }
    }
    if (!dbState.sogStations || dbState.sogStations.length === 0) {
      const localFallback = loadLocalDBFallback();
      const localStations = localFallback.sogStations || [];
      if (localStations.length > 0) {
        console.log(`Migrating ${localStations.length} pre-existing SoG station(s) from local backup to Firestore...`);
        for (const station of localStations) {
          if (station && station.id) await writeFirestoreDoc("sogStations", station.id, station);
        }
        dbState.sogStations = localStations;
      } else {
        dbState.sogStations = [];
      }
    }

    // Ensure default camp and active camp exists
    if (!dbState.camps || dbState.camps.length === 0) {
      dbState.camps = [
        { id: "camp-2026", year: 2026, start_date: "2026-05-23", end_date: "2026-05-25", title: "Pfingstlager 2026" }
      ];
      if (isFirebaseEnabled()) {
        writeFirestoreDoc("camps", "camp-2026", dbState.camps[0]);
      }
    } else {
      // Ensure we have at least one camp with the correct properties
      const has2026 = dbState.camps.some(c => c.id === "camp-2026");
      if (!has2026) {
        dbState.camps.push({ id: "camp-2026", year: 2026, start_date: "2026-05-23", end_date: "2026-05-25", title: "Pfingstlager 2026" });
        if (isFirebaseEnabled()) {
          writeFirestoreDoc("camps", "camp-2026", dbState.camps[dbState.camps.length - 1]);
        }
      }
    }

    if (!dbState.activeCampId) {
      dbState.activeCampId = "camp-2026";
      if (isFirebaseEnabled()) {
        writeGlobalSettings({ activeCampId: "camp-2026" });
      }
    }

    localCache = dbState as DB;
    return localCache;
  } catch (err) {
    console.error("Failed to read from Firestore, falling back to local storage:", err);
    return loadLocalDBFallback();
  }
}

// Set up a background onSnapshot listener on the global metadata settings doc to automatically synchronize 
// other servers/workers or detect writes with 0 polling costs.
export function initFirestoreSync() {
  if (!isFirebaseEnabled()) return;

  try {
    const settingsRef = db!.collection("settings").doc("global");
    settingsRef.onSnapshot(async (snapshot) => {
      if (snapshot.exists) {
        const data = snapshot.data();
        console.log("Firestore metadata updated, checking for remote sync changes...");
        if (data.lastChange && data.lastChange !== lastChangeTimestamp) {
          lastChangeTimestamp = data.lastChange;
          // Re-read Firestore to update cache if remote timestamp changed
          await getUnifiedDB(true);
          // Trigger registered express listeners
          changeListeners.forEach(listener => listener());
        }
      }
    });
  } catch (err) {
    console.error("Failed to start Firestore synchronization listener:", err);
  }
}

export function registerChangeListener(callback: () => void) {
  changeListeners.push(callback);
}

// Write/Update single document in a collection
export async function writeFirestoreDoc(colName: string, docId: string, docData: any) {
  if (!isFirebaseEnabled()) {
    // Sync local fallback
    const local = loadLocalDBFallback();
    if (Array.isArray((local as any)[colName])) {
      const arr = (local as any)[colName];
      const idx = arr.findIndex((x: any) => x.id === docId);
      if (idx !== -1) {
        arr[idx] = docData;
      } else {
        arr.push(docData);
      }
      saveLocalDBFallback(local);
    }
    return;
  }

  try {
    const docRef = db!.collection(colName).doc(docId);
    await docRef.set(docData);
    recordFirestoreWrite();
    
    // Update local cache
    if (localCache) {
      if (Array.isArray((localCache as any)[colName])) {
        const arr = (localCache as any)[colName];
        const idx = arr.findIndex((x: any) => x.id === docId);
        if (idx !== -1) {
          arr[idx] = docData;
        } else {
          arr.push(docData);
        }
      }
    }
    
    // Metadata-Stempel (lastChange) wird NICHT hier pro Dokument ausgelöst,
    // sondern zentral einmal pro writeDB()-Aufruf in server/db.ts - sonst
    // kostet jede Mutation, die mehrere Dokumente ändert, einen zusätzlichen
    // Firestore-Write PRO Dokument statt nur einen einzigen am Ende.
  } catch (err) {
    console.error(`Error saving document ${docId} to Firestore collection ${colName}:`, err);
  }
}

// Delete single document from a collection
export async function deleteFirestoreDoc(colName: string, docId: string) {
  if (!isFirebaseEnabled()) {
    const local = loadLocalDBFallback();
    if (Array.isArray((local as any)[colName])) {
      (local as any)[colName] = (local as any)[colName].filter((x: any) => x.id !== docId);
      saveLocalDBFallback(local);
    }
    return;
  }

  try {
    const docRef = db!.collection(colName).doc(docId);
    await docRef.delete();
    recordFirestoreDelete();
    
    // Update local cache
    if (localCache) {
      if (Array.isArray((localCache as any)[colName])) {
        (localCache as any)[colName] = (localCache as any)[colName].filter((x: any) => x.id !== docId);
      }
    }
    
    // Siehe writeFirestoreDoc: Metadata-Stempel bewusst nicht hier, sondern
    // zentral einmal pro writeDB()-Aufruf.
  } catch (err) {
    console.error(`Error deleting document ${docId} from Firestore collection ${colName}:`, err);
  }
}

// Update settings or global configurations
export async function writeGlobalSettings(settingsData: { activeCampId?: string; vapidKeys?: any }) {
  if (!isFirebaseEnabled()) {
    const local = loadLocalDBFallback();
    if (settingsData.activeCampId) local.activeCampId = settingsData.activeCampId;
    if (settingsData.vapidKeys) local.vapidKeys = settingsData.vapidKeys;
    saveLocalDBFallback(local);
    return;
  }

  try {
    const docRef = db!.collection("settings").doc("global");
    await docRef.set({
      ...settingsData,
      lastChange: Date.now()
    }, { merge: true });
    recordFirestoreWrite();

    if (localCache) {
      if (settingsData.activeCampId) localCache.activeCampId = settingsData.activeCampId;
      if (settingsData.vapidKeys) localCache.vapidKeys = settingsData.vapidKeys;
    }
  } catch (err) {
    console.error("Error saving settings to Firestore:", err);
  }
}

// Local cache helper fallback in case Firebase is completely unavailable or during local offline testing
function loadLocalDBFallback(): DB {
  const DB_FILE = getDbFilePath();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.users && parsed.users.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load local DB fallback:", err);
  }

  const defaultSeed = getDefaultSeedDB();
  saveLocalDBFallback(defaultSeed);
  return defaultSeed;
}

function saveLocalDBFallback(data: DB) {
  const DB_FILE = getDbFilePath();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save local DB fallback:", err);
  }
}

// Trigger metadata stamp to communicate update between multiple server containers.
// Wird zentral EINMAL pro writeDB()-Aufruf in server/db.ts aufgerufen (nicht
// mehr pro einzelnem Dokument-Write), um Firestore-Schreibkosten zu sparen.
export async function triggerGlobalMetadataUpdate() {
  try {
    const stamp = Date.now();
    const docRef = db!.collection("settings").doc("global");
    await docRef.set({
      lastChange: stamp
    }, { merge: true });
    recordFirestoreWrite();
    lastChangeTimestamp = stamp;
  } catch (err) {
    console.warn("Could not trigger metadata stamp:", err);
  }
}

// Migrate complete local database array to individual Firestore documents
async function migrateToFirestore(data: DB) {
  console.log("Commencing data migration from local JSON file to cloud Firestore...");
  try {
    for (const colName of FIRESTORE_COLLECTIONS) {
      const items = (data as any)[colName];
      if (Array.isArray(items)) {
        console.log(`Migrating ${items.length} items to Firestore collection "${colName}"...`);
        for (const item of items) {
          if (item && item.id) {
            const docRef = db!.collection(colName).doc(item.id);
            await docRef.set(item);
          }
        }
      }
    }

    // Save global settings doc
    const settingsRef = db!.collection("settings").doc("global");
    await settingsRef.set({
      activeCampId: data.activeCampId || "camp-2026",
      vapidKeys: data.vapidKeys || null,
      lastChange: Date.now()
    });
    console.log("Cloud Firestore database migration completed successfully!");
  } catch (err) {
    console.error("Error during Firestore migration:", err);
  }
}
