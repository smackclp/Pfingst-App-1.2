import { test, expect } from "@playwright/test";
import { USERS, loginAs, authHeaders } from "./helpers";

test.describe("Material zur Bestellliste hinzufügen", () => {
  const itemName = `E2E-Testartikel-${Date.now()}`;
  let helferToken: string;

  test.afterEach(async ({ page }) => {
    const res = await page.request.get("/api/materials", { headers: authHeaders(helferToken) });
    const materials = await res.json();
    const created = materials.find((m: any) => m.item_name === itemName);
    if (created) {
      await page.request.delete(`/api/materials/${created.id}`, { headers: authHeaders(helferToken) });
    }
  });

  test("neuer Artikel erscheint nach dem Absenden des Formulars in der Bestellliste", async ({ page }) => {
    helferToken = await loginAs(page, USERS.helfer.userId, USERS.helfer.pin);
    await page.getByRole("button", { name: "Bestellliste" }).first().click();

    await page.getByRole("combobox").first().selectOption({ value: USERS.helfer.userId });
    await page.getByPlaceholder("z.B. Packung Buntstifte, 50 Stk").fill(itemName);
    await page.getByPlaceholder(/Für die Kreativ-Workshops/).fill("E2E-Test: automatisierter Testlauf");
    await page.getByRole("button", { name: "In die Bestellliste eintragen" }).click();

    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 });

    const res = await page.request.get("/api/materials", { headers: authHeaders(helferToken) });
    const materials = await res.json();
    expect(materials.some((m: any) => m.item_name === itemName)).toBeTruthy();
  });
});
