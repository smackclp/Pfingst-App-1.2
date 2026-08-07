import { safeStorage } from "../utils";
import { STORAGE_KEYS } from "../constants";

export interface QueuedAction {
  id: string;
  method: "POST" | "PUT" | "DELETE";
  url: string;
  body?: any;
  /** Kurzer, nutzerfreundlicher Name für Toast/Badge, z.B. "Schicht-Status ändern". */
  label: string;
  queuedAt: string;
}

type QueueListener = (queue: QueuedAction[]) => void;
type FailureListener = (action: QueuedAction, error: unknown) => void;

const queueListeners = new Set<QueueListener>();
const failureListeners = new Set<FailureListener>();

function getQueue(): QueuedAction[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to read offline queue:", e);
    return [];
  }
}

function saveQueue(queue: QueuedAction[]) {
  safeStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  queueListeners.forEach((fn) => fn(queue));
}

/** UI-Komponenten (z.B. Offline-Banner) können sich hier für Änderungen der Warteschlangenlänge anmelden. */
export function subscribeOfflineQueue(fn: QueueListener): () => void {
  queueListeners.add(fn);
  fn(getQueue());
  return () => queueListeners.delete(fn);
}

/** Wird aufgerufen, wenn eine gequeute Aktion beim Nachsenden endgültig fehlschlägt (kein Netzwerkfehler mehr). */
export function subscribeOfflineQueueFailure(fn: FailureListener): () => void {
  failureListeners.add(fn);
  return () => failureListeners.delete(fn);
}

// fetch() lehnt bei fehlender Verbindung mit einem TypeError ab ("Failed to
// fetch" in Chrome, "NetworkError..." in Firefox) - das unterscheidet einen
// echten Verbindungsabbruch von einer normalen Serverantwort (die immer ein
// Response-Objekt liefert, auch bei 4xx/5xx).
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

async function performRequest(method: string, url: string, body?: any, idempotencyKey?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Nur beim erneuten Nachsenden gesetzt (siehe flushOfflineQueue): erlaubt
  // dem Server, eine Aktion zu erkennen, deren Antwort beim ersten Versuch
  // nicht mehr ankam, und sie nicht ein zweites Mal auszuführen (server/idempotency.ts).
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
  return fetch(url, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Führt eine schreibende Anfrage aus. Schlägt sie wegen fehlender
 * Internetverbindung fehl, wird die Aktion stattdessen lokal gespeichert und
 * automatisch nachgesendet, sobald wieder eine Verbindung besteht (siehe
 * flushOfflineQueue). Nur für unkritische, konfliktarme Aktionen gedacht
 * (Schicht-Status, Bestellliste, Talentshow-Beiträge) - siehe CLAUDE.md
 * Abschnitt 8 "Offline First".
 */
export async function queuedFetch(method: "POST" | "PUT" | "DELETE", url: string, body: any, label: string): Promise<Response> {
  try {
    return await performRequest(method, url, body);
  } catch (err) {
    if (!isNetworkError(err)) throw err;

    const action: QueuedAction = {
      id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method,
      url,
      body,
      label,
      queuedAt: new Date().toISOString(),
    };
    saveQueue([...getQueue(), action]);

    // Synthetische "angenommen"-Antwort, damit der aufrufende Code (der bei
    // !res.ok einen Fehler wirft) normal weiterläuft, statt einen Offline-
    // Fehler anzuzeigen. Status 202 = "Accepted", noch nicht verarbeitet.
    return new Response(JSON.stringify({ queued: true }), { status: 202 });
  }
}

let flushing = false;

/**
 * Sendet alle wartenden Aktionen der Reihe nach erneut. Bricht beim ersten
 * weiterhin bestehenden Verbindungsfehler ab (nächster Versuch beim nächsten
 * 'online'-Event). Ein echter Serverfehler (z.B. 409 Konflikt) entfernt die
 * Aktion aus der Warteschlange und meldet sie über subscribeOfflineQueueFailure,
 * statt endlos zu wiederholen.
 */
export async function flushOfflineQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let queue = getQueue();
    while (queue.length > 0) {
      const action = queue[0];
      try {
        const res = await performRequest(action.method, action.url, action.body, action.id);
        if (!res.ok && res.status !== 404) {
          throw new Error(`Nachsenden fehlgeschlagen (Status ${res.status})`);
        }
      } catch (err) {
        if (isNetworkError(err)) {
          // Immer noch offline - Rest der Warteschlange bleibt bestehen.
          break;
        }
        console.error("Gequeute Aktion endgültig fehlgeschlagen:", action, err);
        failureListeners.forEach((fn) => fn(action, err));
      }
      queue = queue.slice(1);
      saveQueue(queue);
    }
  } finally {
    flushing = false;
  }
}

export function getOfflineQueueLength(): number {
  return getQueue().length;
}
