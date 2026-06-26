import { describe, expect, it } from "vitest";
import { adaptiveAgeBucketDefs, buildStatusAgeHistogramFromIssues, buildStatusAgeIssueDetails, isActiveForStatusAge } from "./productRadarStatusAge";
import type { ProductRadarIssue } from "../api/cmsClient";

function issue(key: string, days: number): ProductRadarIssue {
  return {
    key,
    summary: key,
    status: "В работе",
    status_category: "indeterminate",
    current_status_days: days,
  };
}

describe("productRadarStatusAge", () => {
  it("expands long-tail ages instead of one 30+ bucket", () => {
    const histogram = buildStatusAgeHistogramFromIssues([
      issue("A", 45),
      issue("B", 72),
      issue("C", 120),
      issue("D", 150),
    ]);
    expect(histogram.length).toBeGreaterThanOrEqual(2);
    expect(histogram.some((item) => item.label.includes("30+"))).toBe(false);
    expect(histogram.reduce((sum, item) => sum + item.value, 0)).toBe(4);
  });

  it("keeps short buckets when tasks are fresh", () => {
    const defs = adaptiveAgeBucketDefs([2, 6, 12, 25]);
    expect(defs.map((bucket) => bucket.label)).toEqual(["0–3 дн.", "4–7 дн.", "8–14 дн.", "15–30 дн."]);
  });

  it("mixes short and expanded long buckets", () => {
    const defs = adaptiveAgeBucketDefs([5, 18, 45, 90, 140]);
    const labels = defs.map((bucket) => bucket.label);
    expect(labels).toContain("4–7 дн.");
    expect(labels).toContain("15–30 дн.");
    expect(labels.some((label) => label.endsWith("+ дн.") && !label.startsWith("30"))).toBe(true);
    expect(labels.some((label) => label.includes("30+"))).toBe(false);
  });

  it("excludes done issues from histogram and drill-down", () => {
    const issues = {
      OPEN: issue("OPEN", 20),
      DONE: { ...issue("DONE", 90), status: "Готово", status_category: "done" },
    };
    expect(isActiveForStatusAge(issues.DONE)).toBe(false);
    const buckets = buildStatusAgeHistogramFromIssues(Object.values(issues)) ?? [];
    expect(buckets.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(1);
    const bucket = buckets[0]!;
    const details = buildStatusAgeIssueDetails(issues, bucket);
    expect(details.map((row) => row.issue_key)).toEqual(["OPEN"]);
  });

  it("lists issues for selected age bucket", () => {
    const issues = {
      A: issue("A", 45),
      B: issue("B", 48),
    };
    const buckets = buildStatusAgeHistogramFromIssues(Object.values(issues)) ?? [];
    const bucketForA = buckets.find((bucket) => bucket.low <= 45 && bucket.high >= 45);
    expect(bucketForA).toBeTruthy();
    const details = buildStatusAgeIssueDetails(issues, bucketForA!);
    expect(details.map((row) => row.issue_key)).toEqual(["A"]);
    expect(details[0]?.metric_value).toBe("45 дн.");
  });
});
