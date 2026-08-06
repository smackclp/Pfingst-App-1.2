import { test, expect } from "@playwright/test";
import { USERS, loginAs, authHeaders } from "./helpers";

/**
 * Der Lagerjahr-Reset ("Einteilungen leeren" / "Muster-Schichten laden" /
 * "Werks-Reset") ist die folgenreichste Aktion der App - er überschreibt
 * serverseitig sofort und ohne bisheriges Sicherheitsnetz die Datenbank.
 * Zwei Bausteine wurden ergänzt: ein 6-Sekunden-Rückgängig-Vorlauf vor dem
 * eigentlichen API-Aufruf (gleiches Muster wie überall sonst), UND eine
 * echte serverseitige Sicherung vor jedem Reset, die über "Letzten Stand
 * wiederherstellen" auch später noch zurückgeholt werden kann.
 */
test.describe("Lagerjahr-Reset mit Vorlauf-Undo und Sicherung", () => {
  let adminToken: string;

  test.beforeEach(async ({ page }) => {
    adminToken = await loginAs(page, USERS.admin.userId, USERS.admin.pin);
  });

  async function getAssignmentCount(page: import("@playwright/test").Page) {
    const res = await page.request.get("/api/assignments", { headers: authHeaders(adminToken) });
    return (await res.json()).length;
  }

  async function getBackupStatus(page: import("@playwright/test").Page) {
    const res = await page.request.get("/api/seed/backup-status", { headers: authHeaders(adminToken) });
    return res.json();
  }

  test("Reset läuft erst nach der Undo-Frist, sichert vorher den Stand und lässt sich wiederherstellen", async ({ page }) => {
    test.slow(); // Login + 6s-Undo-Frist + Restore brauchen mehr Zeit als der Standard-Timeout.

    const originalCount = await getAssignmentCount(page);
    expect(originalCount).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Lager verwalten" }).first().click();
    await page.getByRole("button", { name: "Einteilungen leeren..." }).click();
    await page.getByRole("button", { name: "Bestätigen & Ausführen" }).click();

    // Undo-Toast sichtbar, aber der eigentliche Reset ist noch nicht passiert.
    await expect(page.getByText('"Einteilungen leeren" gelöscht')).toBeVisible();
    expect(await getAssignmentCount(page)).toBe(originalCount);

    // Frist abwarten, bis der Reset tatsächlich committed wird.
    await page.waitForTimeout(6500);
    expect(await getAssignmentCount(page)).toBe(0);

    const backup = await getBackupStatus(page);
    expect(backup.available, "Nach dem Reset sollte automatisch eine Sicherung existieren").toBeTruthy();

    // Wiederherstellen-Button erscheint nach Neuladen der Ansicht.
    await page.reload();
    await page.getByRole("button", { name: "Lager verwalten" }).first().click();
    await page.getByRole("button", { name: "Letzten Stand wiederherstellen" }).click();
    await page.getByRole("button", { name: "Ja, wiederherstellen" }).click();

    await expect(async () => {
      expect(await getAssignmentCount(page)).toBe(originalCount);
    }).toPass({ timeout: 10_000 });

    const backupAfterRestore = await getBackupStatus(page);
    expect(backupAfterRestore.available, "Nach der Wiederherstellung sollte die Sicherung verbraucht sein").toBeFalsy();
  });
});
