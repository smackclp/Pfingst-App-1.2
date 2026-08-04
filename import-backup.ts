// EINMALIGES Migrations-Skript: importiert eine über /api/backup heruntergeladene
// Backup-JSON-Datei (aus der ALTEN Datenbank) in die NEUE Firestore-Datenbank.
//
// Nutzung:
//   npx tsx import-backup.ts pfingsten-app-backup.json
//
// Voraussetzung: firebase-service-account.json (für das NEUE Projekt) liegt
// im Projekt-Root.
//
// Danach: diese Datei wieder löschen (nicht Teil der App).

import fs from "fs";
import path from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { DB } from "./server/types";

const COLLECTIONS: (keyof DB)[] = [
  "users", "services", "shifts", "assignments", "camps",
  "materials", "functionalRoles", "communities", "talentActs", "notifications",
];

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error("Bitte Pfad zur Backup-Datei angeben: npx tsx import-backup.ts <backup.json>");
    process.exit(1);
  }

  const resolvedBackupPath = path.resolve(process.cwd(), backupPath);
  if (!fs.existsSync(resolvedBackupPath)) {
    console.error(`Backup-Datei nicht gefunden: ${resolvedBackupPath}`);
    process.exit(1);
  }

  const backup: DB = JSON.parse(fs.readFileSync(resolvedBackupPath, "utf-8"));

  const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("firebase-service-account.json nicht gefunden im Projekt-Root. Abbruch.");
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);

  console.log(`Ziel: neues Projekt "${serviceAccount.project_id}"`);
  console.log(`Quelle: ${resolvedBackupPath}\n`);

  let totalImported = 0;

  for (const colName of COLLECTIONS) {
    const items = (backup as any)[colName];
    if (!Array.isArray(items)) {
      console.log(`"${colName}": nicht in der Backup-Datei enthalten, übersprungen.`);
      continue;
    }
    console.log(`Importiere "${colName}": ${items.length} Dokument(e)...`);
    for (const item of items) {
      if (item && item.id) {
        await db.collection(colName).doc(item.id).set(item);
      }
    }
    totalImported += items.length;
  }

  // Globale Einstellungen (activeCampId, vapidKeys)
  await db.collection("settings").doc("global").set({
    activeCampId: backup.activeCampId || "camp-2026",
    vapidKeys: backup.vapidKeys || null,
    lastChange: Date.now(),
  });
  console.log('\n"settings/global" (activeCampId, vapidKeys) übertragen.');

  console.log(`\nFertig! Insgesamt ${totalImported} Dokumente über ${COLLECTIONS.length} Sammlungen importiert.`);
  console.log("Bitte jetzt den Server neu starten und mit einer echten, persönlichen PIN einloggen.");
}

main().catch((err) => {
  console.error("Import fehlgeschlagen:", err);
  process.exit(1);
});
