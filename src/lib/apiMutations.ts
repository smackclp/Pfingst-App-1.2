import React from "react";

/**
 * Gemeinsame Bausteine für die Mutations-Hooks (use*Data.ts), die den
 * lokalen State direkt aus der Server-Antwort aktualisieren statt nach jeder
 * Aktion neu zu laden (siehe AUDIT.md, "Mutation-Reload"-Fund). Deckt nur die
 * einfachen, wiederkehrenden Fälle ab (POST -> anhängen, PUT -> ersetzen,
 * DELETE -> entfernen). Sonderfälle bleiben bewusst handgeschrieben in den
 * einzelnen Hooks, weil eine erzwungene generische Lösung dort weniger
 * lesbar wäre als das Original: Offline-Queue mit synthetischer
 * 202-Antwort (queuedFetch), kaskadierende Löschungen über mehrere Arrays,
 * Sonder-Fehlerformen wie der 409-Konflikt bei Zuweisungen.
 */

type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>;

/** Prüft eine Mutations-Antwort und wirft bei Fehlschlag einen Error mit der
 * serverseitigen Fehlermeldung (JSON-Feld "error"), falls vorhanden, sonst
 * mit dem übergebenen Fallback-Text. */
export async function throwIfNotOk(res: Response, fallbackMessage: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || fallbackMessage);
}

/** POST-Mutation: legt ein neues Element an und hängt die Server-Antwort
 * (inkl. serverseitig generierter ID) lokal an. `extract` erlaubt es, das
 * eigentliche Objekt aus einer umschließenden Antwort zu holen (z.B.
 * `{ user: {...} }` statt direkt `{...}`). */
export async function createAndAppend<T>(
  url: string,
  payload: unknown,
  setState: Setter<T>,
  fallbackMessage: string,
  extract: (data: any) => T = (data) => data
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(res, fallbackMessage);
  const created = extract(await res.json());
  setState((prev) => [...prev, created]);
  return created;
}

/** PUT-Mutation: aktualisiert ein Element per ID und ersetzt es lokal mit der
 * Server-Antwort. */
export async function updateAndReplace<T extends { id: string }>(
  url: string,
  payload: unknown,
  matchId: string,
  setState: Setter<T>,
  fallbackMessage: string,
  extract: (data: any) => T = (data) => data
): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(res, fallbackMessage);
  const updated = extract(await res.json());
  setState((prev) => prev.map((item) => (item.id === matchId ? updated : item)));
  return updated;
}

/** DELETE-Mutation: löscht serverseitig (optional mit Body, z.B. für
 * zusammengesetzte Schlüssel wie shift_id+user_id) und behält lokal nur
 * Elemente, auf die `keepPredicate` weiterhin zutrifft. */
export async function deleteAndFilter<T>(
  url: string,
  setState: Setter<T>,
  keepPredicate: (item: T) => boolean,
  fallbackMessage: string,
  payload?: unknown
): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: payload !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  await throwIfNotOk(res, fallbackMessage);
  setState((prev) => prev.filter(keepPredicate));
}
