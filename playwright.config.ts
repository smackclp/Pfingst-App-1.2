import { defineConfig, devices } from "@playwright/test";

// Eigener Test-Port und eigene Test-Datenbank (db.test.json), damit die
// Tests niemals die echten Lagerdaten (db.json) oder einen parallel
// laufenden Dev-Server auf Port 3000 berühren. Der Server startet dafür
// automatisch (webServer) und legt db.test.json beim ersten Lauf frisch aus
// den Standard-Seed-Daten an (server/seed.ts).
const TEST_PORT = 3100;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx tsx server.ts",
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(TEST_PORT),
      DB_FILE_NAME: "db.test.json",
    },
  },
});
