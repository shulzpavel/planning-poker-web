import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "intake.spec.ts",
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:5175", trace: "retain-on-failure" },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort --configLoader native",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
    timeout: 60000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
