import fs from "fs";
import { getDbFilePath } from "./dbPath";
import { readDB } from "./db";
import { sendNotificationToUser } from "./notifications";

/**
 * Einfaches, selbstgehostetes Fehler-Monitoring (siehe AUDIT.md, "Geplante
 * Verbesserungen"). Hält die letzten Fehler in einem In-Memory-Ringpuffer
 * (schnell, kostet keine Firestore-Reads) mit einer lokalen JSON-Datei als
 * Backup (übersteht Server-Neustarts, z.B. bei Deployments), analog zum
 * bestehenden Reset-Backup-Muster in server/db.ts. Kein Firestore-Write pro
 * Fehler - Fehler sind transiente Betriebsdaten, keine Lagerdaten, die
 * dauerhaft in der Cloud gesichert werden müssen.
 */

export interface LoggedError {
  id: string;
  timestamp: string;
  source: "backend" | "frontend";
  message: string;
  stack?: string;
  path?: string;
  userId?: string;
}

const MAX_ENTRIES = 50;
// Verhindert Alert-Spam UND Firestore-Kosten-Spitzen: wenn etwas kaputt ist,
// treten meist viele gleichartige Fehler in kurzer Zeit auf (z.B. ein
// kaputter Endpunkt, den mehrere Helfer gleichzeitig treffen) - ohne
// Cooldown würde jeder einzelne einen Push (und damit einen writeDB()-Aufruf
// je Empfänger) auslösen.
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

let errorBuffer: LoggedError[] = [];
const lastAlertedAt = new Map<string, number>();

function getErrorLogFilePath(): string {
  return getDbFilePath().replace(/\.json$/, ".error-log.json");
}

function persist() {
  fs.writeFile(getErrorLogFilePath(), JSON.stringify(errorBuffer, null, 2), "utf-8", (err) => {
    if (err) console.error("Failed to persist error log:", err);
  });
}

/** Beim Serverstart aufrufen, damit ein Neustart (z.B. Deployment) die
 * Fehlerhistorie des Tages nicht einfach verwirft. */
export function loadErrorLog() {
  try {
    const p = getErrorLogFilePath();
    if (fs.existsSync(p)) {
      errorBuffer = JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to load error log:", err);
  }
}

export function getErrorLog(): LoggedError[] {
  return errorBuffer;
}

export async function recordError(input: {
  source: "backend" | "frontend";
  message: string;
  stack?: string;
  path?: string;
  userId?: string;
}): Promise<void> {
  const entry: LoggedError = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };

  errorBuffer = [entry, ...errorBuffer].slice(0, MAX_ENTRIES);
  persist();

  await maybeAlert(entry);
}

async function maybeAlert(entry: LoggedError): Promise<void> {
  const now = Date.now();
  const lastAlert = lastAlertedAt.get(entry.message);
  if (lastAlert && now - lastAlert < ALERT_COOLDOWN_MS) {
    return;
  }
  lastAlertedAt.set(entry.message, now);

  try {
    const db = readDB();
    const recipients = db.users.filter((u) => (u as any).is_error_monitor && u.active);
    const title = "App-Fehler erkannt ⚠️";
    const body = `${entry.source === "backend" ? "Server" : "App"}-Fehler: ${entry.message}`.slice(0, 200);
    await Promise.all(recipients.map((user) => sendNotificationToUser(user.id, title, body)));
  } catch (err) {
    console.error("Failed to send error-monitor alerts:", err);
  }
}
