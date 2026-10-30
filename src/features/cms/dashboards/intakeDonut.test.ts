import { describe, expect, it } from "vitest";
import { donutSlicePath } from "./intakeDonut";

describe("donut sector boundaries", () => {
  it("joins the last sector to the first with the same straight radial edge", () => {
    const first = donutSlicePath(0, 109 / 130);
    const last = donutSlicePath(120 / 130, 10 / 130);
    expect(first).toMatch(/^M 105 16 /);
    expect(last).toContain("89 89 0 0 1 105 16");
    expect(last).toContain("L 105 38");
    expect(first).toMatch(/67 67 0 0 0 105 38 Z$/);
  });
  it("draws a full ring for one category and omits zero-width sectors", () => {
    const full = donutSlicePath(0, 1);
    expect((full.match(/A 89 89/g) || []).length).toBe(2);
    expect((full.match(/A 67 67/g) || []).length).toBe(2);
    expect(full).not.toMatch(/NaN|Infinity/);
    expect(donutSlicePath(0, 0)).toBe("");
  });
});
