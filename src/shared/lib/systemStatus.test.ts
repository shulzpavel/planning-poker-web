import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchMaintenanceStatus } from "./systemStatus";

describe("fetchMaintenanceStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when maintenance is active", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ maintenance: { active: true, service: "web" } }),
      }),
    );

    await expect(fetchMaintenanceStatus()).resolves.toBe(true);
  });

  it("returns false when maintenance is inactive", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ maintenance: { active: false, service: null } }),
      }),
    );

    await expect(fetchMaintenanceStatus()).resolves.toBe(false);
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );

    await expect(fetchMaintenanceStatus()).rejects.toThrow("HTTP 503");
  });
});
