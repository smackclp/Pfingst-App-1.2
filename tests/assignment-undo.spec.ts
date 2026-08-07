import { test, expect } from "@playwright/test";
import { USERS, loginAs, authHeaders } from "./helpers";

/**
 * Zuweisung entfernen ("Austragen") ist ein häufiger, leicht aus Versehen
 * ausgelöster Klick - deshalb zentral (App.tsx) mit dem gleichen 6-Sekunden-
 * Undo-Sicherheitsnetz wie andere Löschungen versehen, statt nur in der
 * Schichtplanungs-Ansicht. Dieser Test deckt genau diese Absicherung ab,
 * inklusive Klick auf "Rückgängig" über die Kalenderkarte in "Mein Plan".
 */
test.describe("Zuweisung entfernen mit Rückgängig-Sicherheitsnetz", () => {
  let adminToken: string;
  let shiftId: string;

  test.beforeEach(async ({ page }) => {
    adminToken = await loginAs(page, USERS.admin.userId, USERS.admin.pin);

    const servicesRes = await page.request.get("/api/services", { headers: authHeaders(adminToken) });
    const services = await servicesRes.json();
    const service = services[0];

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const shiftRes = await page.request.post("/api/shifts", {
      headers: authHeaders(adminToken),
      data: { service_id: service.id, date: tomorrow, start_time: "14:00", end_time: "16:00", notes: "E2E-Undo-Testschicht" },
    });
    const shift = await shiftRes.json();
    shiftId = shift.id;

    const assignRes = await page.request.post("/api/assignments", {
      headers: authHeaders(adminToken),
      data: { shift_id: shiftId, user_id: USERS.helfer.userId },
    });
    expect(assignRes.ok(), await assignRes.text()).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    if (shiftId) {
      await page.request.delete(`/api/shifts/${shiftId}`, { headers: authHeaders(adminToken) });
    }
  });

  async function getMyAssignment(page: import("@playwright/test").Page) {
    const res = await page.request.get("/api/assignments", { headers: authHeaders(adminToken) });
    const all = await res.json();
    return all.find((a: any) => a.shift_id === shiftId && a.user_id === USERS.helfer.userId);
  }

  test("Klick auf 'Austragen' entfernt die Zuweisung sofort aus der Ansicht, aber 'Rückgängig' stellt sie wieder her", async ({ page }) => {
    await loginAs(page, USERS.helfer.userId, USERS.helfer.pin);
    await page.getByRole("button", { name: "Mein Plan" }).first().click();

    const card = page.locator(`#shift-card-${shiftId}`);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();

    await card.getByRole("button", { name: "Austragen ✕", exact: true }).click();

    // Sofort optisch nicht mehr als "meine Zuweisung" markiert, aber
    // serverseitig noch nicht committed (Undo-Frist läuft noch).
    await expect(card.getByRole("button", { name: "Austragen ✕", exact: true })).toBeHidden();
    let myAssignment = await getMyAssignment(page);
    expect(myAssignment, "Zuweisung sollte während der Undo-Frist noch existieren").toBeTruthy();

    const undoToast = page.getByText('"Robert G." gelöscht');
    await expect(undoToast).toBeVisible();
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(undoToast).toBeHidden();

    // Nach Rückgängig ist die eigene Zuweisung wieder da (Button wieder sichtbar).
    await expect(card.getByRole("button", { name: "Austragen ✕", exact: true })).toBeVisible();
    myAssignment = await getMyAssignment(page);
    expect(myAssignment).toBeTruthy();
  });

  test("ohne Klick auf 'Rückgängig' wird die Zuweisung nach der Frist endgültig entfernt", async ({ page }) => {
    test.slow(); // Login + 6s-Undo-Frist-Wartezeit brauchen etwas mehr Zeit als der Standard-Timeout.
    await loginAs(page, USERS.helfer.userId, USERS.helfer.pin);
    await page.getByRole("button", { name: "Mein Plan" }).first().click();

    const card = page.locator(`#shift-card-${shiftId}`);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    await card.getByRole("button", { name: "Austragen ✕", exact: true }).click();

    // 6 Sekunden Undo-Frist (useUndoableDelete) abwarten, mit Puffer.
    await page.waitForTimeout(7000);

    const myAssignment = await getMyAssignment(page);
    expect(myAssignment, "Zuweisung sollte nach Ablauf der Frist endgültig entfernt sein").toBeFalsy();
  });
});
