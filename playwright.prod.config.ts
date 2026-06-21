import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      let value = trimmed.slice(idx + 1);
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Optional local credentials file — tests skip when unset.
  }
}

loadEnvFile(resolve(import.meta.dirname, "../../planning-poker-dev/.env"));

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
