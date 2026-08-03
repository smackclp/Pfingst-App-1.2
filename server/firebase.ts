import fs from "fs";
import path from "path";
import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { DB } from "./types";
import { getDefaultSeedDB } from "./seed";

const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");

let app;
let db: any = null;
let isConfigured = false;

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);
    
    // Construct configuration matching firebase Client SDK expectations
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };

    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    // Retrieve custom databaseId if configured in the firebase blueprint config
    if (config.firestoreDatabaseId) {
      db = getFirestore(app, config.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
    
    isConfigured = true;
    console.log("Firebase Firestore initialized successfully with Database ID:", config.firestoreDatabaseId || "(default)");
  } else {
    console.warn("Firebase config file not found at", CONFIG_FILE);
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export function isFirebaseEnabled(): boolean {
  return isConfigured && db !== null;
}

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

    const collections = [
      "users", "services", "shifts", "assignments", "camps", 
      "materials", "functionalRoles", "communities", "talentActs", "notifications"
    ];

    let totalReads = 0;
    await Promise.all(
      collections.map(async (colName) => {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        (dbState as any)[colName] = list;
        totalReads += Math.max(1, snapshot.size);
      })
    );

    // Fetch settings document (activeCampId, vapidKeys, lastChange)
    const settingsRef = doc(db, "settings", "global");
    const settingsSnap = await getDoc(settingsRef);
    totalReads += 1;
    recordFirestoreReads(totalReads);

    if (settingsSnap.exists()) {
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
    const settingsRef = doc(db, "settings", "global");
    onSnapshot(settingsRef, async (snapshot) => {
      if (snapshot.exists()) {
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
    const docRef = doc(db, colName, docId);
    await setDoc(docRef, docData);
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
    
    // Update metadata lastChange to trigger snapshot update
    await triggerGlobalMetadataUpdate();
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
    const docRef = doc(db, colName, docId);
    await deleteDoc(docRef);
    recordFirestoreDelete();
    
    // Update local cache
    if (localCache) {
      if (Array.isArray((localCache as any)[colName])) {
        (localCache as any)[colName] = (localCache as any)[colName].filter((x: any) => x.id !== docId);
      }
    }
    
    await triggerGlobalMetadataUpdate();
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
    const docRef = doc(db, "settings", "global");
    await setDoc(docRef, {
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
  const DB_FILE = path.join(process.cwd(), "db.json");
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
  const DB_FILE = path.join(process.cwd(), "db.json");
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save local DB fallback:", err);
  }
}

// Trigger metadata stamp to communicate update between multiple server containers
async function triggerGlobalMetadataUpdate() {
  try {
    const stamp = Date.now();
    const docRef = doc(db, "settings", "global");
    await setDoc(docRef, {
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
    const collections = [
      "users", "services", "shifts", "assignments", "camps", 
      "materials", "functionalRoles", "communities", "talentActs", "notifications"
    ];

    for (const colName of collections) {
      const items = (data as any)[colName];
      if (Array.isArray(items)) {
        console.log(`Migrating ${items.length} items to Firestore collection "${colName}"...`);
        for (const item of items) {
          if (item && item.id) {
            const docRef = doc(db, colName, item.id);
            await setDoc(docRef, item);
          }
        }
      }
    }

    // Save global settings doc
    const settingsRef = doc(db, "settings", "global");
    await setDoc(settingsRef, {
      activeCampId: data.activeCampId || "camp-2026",
      vapidKeys: data.vapidKeys || null,
      lastChange: Date.now()
    });
    console.log("Cloud Firestore database migration completed successfully!");
  } catch (err) {
    console.error("Error during Firestore migration:", err);
  }
}
