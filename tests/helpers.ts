import { Page, expect } from "@playwright/test";

/** Standard-Seed-Nutzer (server/seed.ts) - Standard-PIN für alle ist "1234". */
export const USERS = {
  admin: { userId: "user-maria", pin: "1234", displayName: "Maria" },
  helfer: { userId: "user-robert-g", pin: "1234", displayName: "Robert G." },
};

export const ACTIVE_CAMP_ID = "camp-2026";

/**
 * Loggt per API ein und übernimmt das Token als eingeloggten Browser-Zustand,
 * inkl. Überspringen von Onboarding/PWA-Hinweis-Overlays, die sonst jeden
 * Testlauf blockieren würden. Für Tests, bei denen der Login-Bildschirm
 * selbst nicht das Testziel ist (siehe login.spec.ts für den echten Login-Weg).
 */
export async function loginAs(page: Page, userId: string, pin: string): Promise<string> {
  const res = await page.request.post("/api/auth/login", { data: { userId, pin } });
  expect(res.ok(), `Login fehlgeschlagen für ${userId}`).toBeTruthy();
  const { token } = await res.json();

  await page.goto("/");
  await page.evaluate(
    ({ token, campId }) => {
      localStorage.setItem("pfingsten_auth_token", token);
      localStorage.setItem("zeltlager_onboarding_seen_v1", "true");
      localStorage.setItem("zeltlager_onboarding_seen_camp_id_v1", campId);
      localStorage.setItem("zeltlager_pwa_setup_dismissed_v1", "true");
    },
    { token, campId: ACTIVE_CAMP_ID }
  );
  await page.reload();
  await page.waitForLoadState("networkidle");

  return token;
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
