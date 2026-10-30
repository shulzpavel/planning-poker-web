import { describe, expect, it } from "vitest";
import { buildSpeedReport } from "./intakeSpeed";
import type { IntakeSnapshot } from "./intakeTypes";

const row = (key: string, entered_at: string, left_at: string | null) => ({ key, summary: key, status: "Исследование", entered_at, left_at, age_days: 999 });
const snapshot = { days: 7, window_start: "2026-10-23T00:00:00+02:00", generated_at: "2026-10-29T16:00:00+01:00",
  report: { received: 2, requests: [
    row("A", "2026-10-22T22:00:00Z", "2026-10-23T00:00:00Z"),
    row("B", "2026-10-22T22:00:00Z", "2026-10-25T22:00:00Z"),
    row("OPEN", "2026-10-23T00:00:00Z", null),
    row("PREV", "2026-10-16T22:00:00Z", "2026-10-18T22:00:00Z"),
  ], weekly: [{ start: "2026-10-23", end: "2026-10-25" }, { start: "2026-10-26", end: "2026-10-29" }] },
} as IntakeSnapshot;
describe("historical review speed", () => {
  it("calculates duration from first-review dates, excludes open requests and compares equal elapsed windows", () => {
    const result = buildSpeedReport(snapshot);
    expect(result.current.count).toBe(2);
    expect(result.current.median).toBeCloseTo((2 / 24 + 3) / 2);
    expect(result.current.withinDay).toBe(50);
    expect(result.previous.median).toBe(2);
    expect(result.start - result.previousStart).toBe(result.end - result.start);
  });
  it("assigns weekly decisions by Belgrade date across DST and keeps gaps empty", () => {
    const result = buildSpeedReport(snapshot);
    expect(result.weekly.map(x => x.keys)).toEqual([["A", "B"], []]);
    expect(result.weekly[1].median).toBeNull();
    expect(result.weekly[0].partial).toBe(true);
  });
  it("does not invent a comparison when the previous period has no completed reviews", () => {
    const result = buildSpeedReport({ ...snapshot, report: { ...snapshot.report, requests: snapshot.report.requests.filter(x => x.key !== "PREV") } });
    expect(result.previous.median).toBeNull();
    expect(result.previous.withinDay).toBeNull();
  });
});
