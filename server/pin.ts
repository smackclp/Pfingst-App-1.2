import crypto from "crypto";

/**
 * Reines Krypto-Utility ohne Abhängigkeiten zu db.ts/auth.ts/seed.ts.
 * Bewusst als eigenes Blatt-Modul gehalten, damit KEIN zirkulärer Import
 * entstehen kann (seed.ts und auth.ts dürfen beide hiervon importieren,
 * ohne dass ein Zyklus mit db.ts entsteht).
 */

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(pin: string, stored: string | undefined | null): boolean {
  if (!stored || !pin) return false;
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  try {
    const derived = crypto.scryptSync(pin, salt, 64);
    const keyBuf = Buffer.from(key, "hex");
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}
