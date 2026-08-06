import { test, expect } from "@playwright/test";
import { USERS, loginAs, authHeaders } from "./helpers";

/**
 * Kritischer Pfad: eine Helferin/ein Helfer sagt einer eigenen Schicht zu
 * bzw. ab. Läuft über die echte UI-Kette "Mein Plan" -> Schichtkarte
 * aufklappen -> eigenen Status ändern -> Status-Modal -> Speichern, nicht
 * nur über die API - genau diese Verdrahtung ist fehleranfällig (siehe
 * ProgramView-Bug, der nur durch einen echten Klickdurchlauf auffiel).
 */
test.describe("Schicht annehmen/absagen", () => {
  let adminToken: string;
  let shiftId: string;

  test.beforeEach(async ({ page }) => {
    adminToken = await loginAs(page, USERS.admin.userId, USERS.admin.pin);

    const servicesRes = await page.request.get("/api/services", { headers: authHeaders(adminToken) });
    const services = await servicesRes.json();
    expect(services.length, "Seed-Daten sollten mindestens einen Dienst enthalten").toBeGreaterThan(0);
    const service = services[0];

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const shiftRes = await page.request.post("/api/shifts", {
      headers: authHeaders(adminToken),
      data: { service_id: service.id, date: tomorrow, start_time: "10:00", end_time: "12:00", notes: "E2E-Testschicht" },
    });
    expect(shiftRes.ok()).toBeTruthy();
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

  test("Zusagen und Absagen über die Schichtkarte im 'Mein Plan'", async ({ page }) => {
    await loginAs(page, USERS.helfer.userId, USERS.helfer.pin);
    await page.getByRole("button", { name: "Mein Plan" }).first().click();

    const card = page.locator(`#shift-card-${shiftId}`);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();

    const acceptArea = page.locator(`#personal-accept-area-${shiftId}`);
    await expect(acceptArea).toBeVisible();
    await acceptArea.getByRole("button").click();

    const statusModal = page.locator("#status-edit-modal");
    await expect(statusModal).toBeVisible();
    await statusModal.getByRole("button", { name: "Bestätigt" }).click();
    await statusModal.getByRole("button", { name: "Speichern" }).click();
    await expect(statusModal).toBeHidden();

    await expect(acceptArea).toContainText("Bestätigt");

    let assignmentsRes = await page.request.get("/api/assignments", { headers: authHeaders(adminToken) });
    let assignments = await assignmentsRes.json();
    let myAssignment = assignments.find((a: any) => a.shift_id === shiftId && a.user_id === USERS.helfer.userId);
    expect(myAssignment.status).toBe("accepted");

    // Jetzt wieder absagen, mit Absage-Grund.
    await card.click();
    await expect(acceptArea).toBeVisible();
    await acceptArea.getByRole("button").click();
    await expect(statusModal).toBeVisible();
    await statusModal.getByRole("button", { name: "Abgelehnt" }).click();
    await statusModal.getByPlaceholder(/Keine Zeit/).fill("E2E-Test: kann nicht mehr");
    await statusModal.getByRole("button", { name: "Speichern" }).click();
    await expect(statusModal).toBeHidden();

    assignmentsRes = await page.request.get("/api/assignments", { headers: authHeaders(adminToken) });
    assignments = await assignmentsRes.json();
    myAssignment = assignments.find((a: any) => a.shift_id === shiftId && a.user_id === USERS.helfer.userId);
    expect(myAssignment.status).toBe("declined");
    expect(myAssignment.decline_reason).toContain("kann nicht mehr");
  });
});
