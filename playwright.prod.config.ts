import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PROD_BASE_URL ?? "https://planning.shults-sync.com";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "prod-delete-flows.spec.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
