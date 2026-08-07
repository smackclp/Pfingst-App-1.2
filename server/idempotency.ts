import type { Request, Response, NextFunction } from "express";

/**
 * Verhindert doppelte Verarbeitung derselben Mutation, wenn die
 * Offline-Warteschlange (src/lib/offlineQueue.ts) eine Aktion erneut
 * sendet, deren Server-Antwort beim ersten Versuch nicht mehr beim Client
 * ankam (z.B. Verbindungsabbruch zwischen Verarbeitung und Antwort). Der
 * Client schickt dafür die eindeutige Warteschlangen-ID als Header mit;
 * ist sie bereits bekannt, wird die zwischengespeicherte Antwort erneut
 * ausgeliefert, statt die Aktion (z.B. "neue Bestellung anlegen") ein
 * zweites Mal auszuführen.
 *
 * Bewusst rein In-Memory (wie die Login-Rate-Begrenzung in server/auth.ts):
 * bei genau einer Server-Instanz ausreichend, kein zusätzlicher
 * Firestore-Zugriff nötig, um dieses Problem zu lösen.
 */
const IDEMPOTENCY_HEADER = "x-idempotency-key";
const RESULT_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedResult {
  status: number;
  body: unknown;
  expiresAt: number;
}

const processed = new Map<string, CachedResult>();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of processed) {
    if (entry.expiresAt < now) processed.delete(key);
  }
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.header(IDEMPOTENCY_HEADER);
  if (!key || req.method === "GET") {
    return next();
  }

  cleanupExpired();

  const cached = processed.get(key);
  if (cached) {
    res.status(cached.status).json(cached.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    // Serverfehler (5xx) bewusst nicht zwischenspeichern - der Client soll es
    // erneut versuchen dürfen, statt den Fehler dauerhaft zu wiederholen.
    if (res.statusCode < 500) {
      processed.set(key, { status: res.statusCode, body, expiresAt: Date.now() + RESULT_TTL_MS });
    }
    return originalJson(body);
  };

  next();
}
