import { describe, expect, it } from "vitest";
import {
  defaultProductRadarCreateForm,
  needsProductRadarSnapshotRefresh,
  validateProductRadarCreate,
} from "./productRadarForm";

describe("validateProductRadarCreate", () => {
  it("requires name and jql", () => {
    expect(validateProductRadarCreate({ name: "", jql: "" })).toEqual({ error: "Укажите название радара" });
    expect(validateProductRadarCreate({ name: "Портфель", jql: "  " })).toEqual({ error: "Укажите JQL-запрос" });
  });

  it("trims valid payload", () => {
    expect(validateProductRadarCreate({ name: "  Портфель  ", jql: " project = X " })).toEqual({
      name: "Портфель",
      jql: "project = X",
    });
  });
});

describe("defaultProductRadarCreateForm", () => {
  it("prefills jql template", () => {
    expect(defaultProductRadarCreateForm().jql).toContain("BTBMGLBL");
    expect(defaultProductRadarCreateForm().name).toBe("");
  });
});

describe("needsProductRadarSnapshotRefresh", () => {
  it("requires refresh when snapshot is missing or never loaded", () => {
    expect(needsProductRadarSnapshotRefresh(null)).toBe(true);
    expect(needsProductRadarSnapshotRefresh(undefined)).toBe(true);
    expect(needsProductRadarSnapshotRefresh({})).toBe(true);
    expect(needsProductRadarSnapshotRefresh({ refreshed_at: "  " })).toBe(true);
  });

  it("skips refresh when snapshot has refreshed_at", () => {
    expect(needsProductRadarSnapshotRefresh({ refreshed_at: "2026-06-25T10:00:00Z" })).toBe(false);
  });
});
