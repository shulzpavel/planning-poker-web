import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", testMatch: "intake.spec.ts", timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:5174", trace: "retain-on-failure" },
  webServer: {
    command: "VITE_DH_INTAKE_PREVIEW=1 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort --configLoader native",
    url: "http://127.0.0.1:5174", reuseExistingServer: false, timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
