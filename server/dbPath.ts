import path from "path";

/**
 * Pfad zur lokalen JSON-Datenbankdatei. Per DB_FILE_NAME überschreibbar,
 * damit Tests (Playwright) gegen eine isolierte Datei laufen können, ohne
 * die echten Lagerdaten in db.json zu berühren. Ohne die Env-Var identisch
 * zum bisherigen festen Pfad.
 */
export function getDbFilePath(): string {
  return path.join(process.cwd(), process.env.DB_FILE_NAME || "db.json");
}
