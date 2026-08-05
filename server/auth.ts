import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { readDB } from "./db";
import { hashPin, verifyPin } from "./pin";

export { hashPin, verifyPin };


/**
 * Zugriffsrollen der App (Auth-Ebene, unabhängig vom fachlichen "role"-Feld
 * wie "HV"/"Teamer"/"Küche", das nur die Funktion im Lager beschreibt).
 */
export type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

const ACCESS_ROLE_RANK: Record<AccessRole, number> = {
  helfer: 0,
  bereichsleiter: 1,
  lagerleitung: 2,
};

export function isAtLeast(role: AccessRole, minimum: AccessRole): boolean {
  return ACCESS_ROLE_RANK[role] >= ACCESS_ROLE_RANK[minimum];
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage gültig

interface Session {
  userId: string;
  accessRole: AccessRole;
  createdAt: number;
  expiresAt: number;
}

// In-Memory Session-Store. Bei Server-Neustart müssen sich alle neu anmelden
// (bewusste, einfache Entscheidung für ein Ehrenamtsprojekt dieser Größe).
const sessions = new Map<string, Session>();

// PIN-Hashing lebt in ./pin (siehe Re-Export oben) – bewusst ausgelagert, um
// zirkuläre Imports mit db.ts/seed.ts zu vermeiden.

// --- Session Management ---
export function createSession(userId: string, accessRole: AccessRole): string {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessions.set(token, { userId, accessRole, createdAt: now, expiresAt: now + SESSION_TTL_MS });
  return token;
}

export function destroySession(token: string) {
  sessions.delete(token);
}

export function getSession(token: string | undefined): Session | null {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return undefined;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: { id: string; accessRole: AccessRole };
    }
  }
}

/**
 * Muss angemeldet sein. Lädt den aktuellen Nutzer & dessen aktuelle Rolle
 * frisch aus der DB (nicht nur aus dem Session-Objekt), damit Rollenänderungen
 * durch die Lagerleitung sofort wirksam werden.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Nicht angemeldet. Bitte erneut einloggen." });
  }
  const db = readDB();
  const user = db.users.find((u) => u.id === session.userId) as any;
  if (!user || user.active === false) {
    if (token) destroySession(token);
    return res.status(401).json({ error: "Konto nicht mehr gültig. Bitte erneut einloggen." });
  }
  const currentRole: AccessRole = user.access_role || "helfer";
  req.authUser = { id: user.id, accessRole: currentRole };
  next();
}

/** Erfordert mindestens eine der angegebenen Rollen. */
export function requireRole(...roles: AccessRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: "Nicht angemeldet." });
    }
    if (!roles.includes(req.authUser.accessRole)) {
      return res.status(403).json({ error: "Keine Berechtigung für diese Aktion." });
    }
    next();
  };
}

/** Erfordert mindestens die angegebene Rollenstufe (helfer < bereichsleiter < lagerleitung). */
export function requireMinRole(minimum: AccessRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: "Nicht angemeldet." });
    }
    if (!isAtLeast(req.authUser.accessRole, minimum)) {
      return res.status(403).json({ error: "Keine Berechtigung für diese Aktion." });
    }
    next();
  };
}

/**
 * Erlaubt Zugriff auf die eigenen Daten (z.B. eigene Zuordnung/Benachrichtigungen),
 * sonst nur Bereichsleitung+. Zentrale Stelle statt vieler identischer
 * isSelf/canManageOthers-Prüfungen in den Routen.
 */
export function isSelfOrManager(req: Request, targetUserId: string): boolean {
  if (!req.authUser) return false;
  if (req.authUser.id === targetUserId) return true;
  return isAtLeast(req.authUser.accessRole, "bereichsleiter");
}

/** Entfernt sensible Felder (PIN-Hash), bevor ein User-Objekt an den Client geht. */
export function sanitizeUser<T extends Record<string, any>>(u: T): Omit<T, "pin_hash"> {
  const { pin_hash, ...rest } = u;
  return rest;
}

export function sanitizeUsers<T extends Record<string, any>>(users: T[]): Omit<T, "pin_hash">[] {
  return users.map(sanitizeUser);
}
