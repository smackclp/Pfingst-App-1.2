import fs from "fs";
import { DB } from "./types";
import { getDefaultSeedDB } from "./seed";
import { getDbFilePath } from "./dbPath";
import {
  getUnifiedDB,
  isFirebaseEnabled,
  writeFirestoreDoc,
  deleteFirestoreDoc,
  writeGlobalSettings,
  triggerGlobalMetadataUpdate,
  registerChangeListener,
  FIRESTORE_COLLECTIONS
} from "./firebase";

const DB_FILE = getDbFilePath();

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

// Synchronously serve from server-side memory cache (0ms database latency, 0 Firestore reads).
// Gibt bewusst eine Kopie zurück (nicht die Live-Referenz): Routen mutieren das
// zurückgegebene Objekt direkt und rufen danach writeDB() auf. Mit einer Live-
// Referenz wäre der interne Cache zum Zeitpunkt des writeDB()-Aufrufs bereits
// mutiert, wodurch dessen "Vorher"-Schnappschuss (für den Firestore-Diff) nie
// einen Unterschied zum "Nachher"-Stand erkennen würde - Änderungen kämen dann
// nie in Firestore an, obwohl sie lokal/im Speicher sichtbar sind.
export function readDB(): DB {
  if (!currentCachedDB) {
    currentCachedDB = getInitialLocalDB();
  }
  return JSON.parse(JSON.stringify(currentCachedDB));
}

// Set database state from Firestore on boot
export function setCachedDB(db: DB) {
  currentCachedDB = db;
}

// Write database changes to local storage backup AND perform incremental cloud diff sync to Firestore
export function writeDB(newData: DB) {
  const previousDB = currentCachedDB ? JSON.parse(JSON.stringify(currentCachedDB)) : getInitialLocalDB();
  currentCachedDB = newData;

  // 1. Write local backup json file. Nicht-blockierend (fs.writeFile statt
  // -Sync): currentCachedDB ist oben bereits synchron aktualisiert, spätere
  // readDB()-Aufrufe sehen also unabhängig vom Abschluss dieses Schreibvorgangs
  // immer den neuen Stand - die Datei ist nur ein Fallback/Backup für den
  // nächsten Serverstart, kein Teil des Lese-Pfads zur Laufzeit.
  fs.writeFile(DB_FILE, JSON.stringify(newData, null, 2), "utf-8", (err) => {
    if (err) console.error("Failed to write fallback db.json", err);
  });

  // 2. Perform intelligent incremental diff sync to Firestore to minimize write queries and ensure high scalability
  if (isFirebaseEnabled()) {
    Promise.resolve().then(async () => {
      try {
        let anyDocChanged = false;

        for (const colName of FIRESTORE_COLLECTIONS) {
          const oldItems: any[] = (previousDB as any)[colName] || [];
          const newItems: any[] = (newData as any)[colName] || [];

          const oldMap = new Map(oldItems.map(item => [item.id, item]));
          const newMap = new Map(newItems.map(item => [item.id, item]));

          // Find added or updated items
          for (const [id, item] of newMap.entries()) {
            const oldItem = oldMap.get(id);
            if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
              await writeFirestoreDoc(colName, id, item);
              anyDocChanged = true;
            }
          }

          // Find deleted items
          for (const id of oldMap.keys()) {
            if (!newMap.has(id)) {
              await deleteFirestoreDoc(colName, id);
              anyDocChanged = true;
            }
          }
        }

        // Sync settings/metadata if changed
        const settingsChanged =
          previousDB.activeCampId !== newData.activeCampId ||
          JSON.stringify(previousDB.vapidKeys) !== JSON.stringify(newData.vapidKeys);
        if (settingsChanged) {
          await writeGlobalSettings({
            activeCampId: newData.activeCampId,
            vapidKeys: newData.vapidKeys
          });
        }

        // Metadata-Stempel (lastChange, für Realtime-Sync zwischen mehreren
        // Server-Instanzen) genau EINMAL pro writeDB()-Aufruf setzen statt
        // wie vorher pro einzelnem Dokument-Write. writeGlobalSettings()
        // schreibt lastChange bereits selbst mit - nur wenn NUR Dokumente
        // (keine Settings) geändert wurden, brauchen wir den separaten Stempel.
        if (anyDocChanged && !settingsChanged) {
          await triggerGlobalMetadataUpdate();
        }
      } catch (syncErr) {
        console.error("Asynchronous incremental cloud sync failed:", syncErr);
      }
    });
  } else {
    // Kein Firestore aktiv (lokaler db.json-Fallback): der In-Memory-
    // lastChange-Stempel muss trotzdem bei jeder echten Mutation
    // aktualisiert werden, sonst bleibt GET /api/sync-check dauerhaft auf
    // dem Wert vom Serverstart stehen - sowohl das 5-Minuten-Polling als
    // auch der "neue Daten"-Hinweis beim App-Start (siehe
    // useZeltlagerData.ts) würden dann nie etwas erkennen.
    triggerGlobalMetadataUpdate();
  }
}

// Pfad für die automatische Sicherung, die vor jedem Lagerjahr-Reset
// angelegt wird (server/routes/system.ts, POST /seed). Getrennt von DB_FILE,
// damit sie nicht in den normalen Firestore-Diff-Sync von writeDB() gerät -
// das würde den alten Stand fälschlich als neue Live-Daten interpretieren.
function getResetBackupFilePath(): string {
  return DB_FILE.replace(/\.json$/, ".pre-reset-backup.json");
}

export interface ResetBackup {
  timestamp: string;
  db: DB;
}

// Sichert den Datenbankstand unmittelbar vor einem Lagerjahr-Reset lokal
// weg, damit ein versehentlicher Reset über "Letzten Stand wiederherstellen"
// rückgängig gemacht werden kann. Überschreibt eine evtl. vorhandene ältere
// Sicherung bewusst (nur eine Undo-Stufe, kein Sicherungsverlauf).
export function saveResetBackup(db: DB) {
  const backup: ResetBackup = { timestamp: new Date().toISOString(), db };
  try {
    fs.writeFileSync(getResetBackupFilePath(), JSON.stringify(backup, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write pre-reset backup:", err);
  }
}

export function readResetBackup(): ResetBackup | null {
  try {
    const p = getResetBackupFilePath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) {
    console.error("Failed to read pre-reset backup:", err);
    return null;
  }
}

// Nach erfolgreicher Wiederherstellung entfernt: ein zweites Mal
// "wiederherstellen" auf denselben Stand böte keinen Mehrwert und könnte
// eher verwirren, wenn seither schon wieder neue Änderungen gemacht wurden.
export function clearResetBackup() {
  try {
    const p = getResetBackupFilePath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (err) {
    console.error("Failed to clear pre-reset backup:", err);
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
