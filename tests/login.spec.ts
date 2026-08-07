import { test, expect } from "@playwright/test";
import { USERS } from "./helpers";

test.describe("Login", () => {
  test("mit korrekter PIN gelangt man ins Dashboard", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("combobox").selectOption({ label: USERS.helfer.displayName });
    await page.getByPlaceholder("4-stellige PIN").fill(USERS.helfer.pin);
    await page.getByRole("button", { name: "Anmelden" }).click();

    // Nach erfolgreichem Login verschwindet der Login-Bildschirm und die
    // App-Navigation (z.B. der globale Such-Container im Header) erscheint.
    await expect(page.locator("#global-search-container")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder("4-stellige PIN")).toHaveCount(0);
  });

  test("mit falscher PIN erscheint eine Fehlermeldung und man bleibt auf dem Login-Bildschirm", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("combobox").selectOption({ label: USERS.helfer.displayName });
    await page.getByPlaceholder("4-stellige PIN").fill("0000");
    await page.getByRole("button", { name: "Anmelden" }).click();

    await expect(page.getByText("Person oder PIN ist falsch.")).toBeVisible();
    await expect(page.getByPlaceholder("4-stellige PIN")).toBeVisible();
  });
});
