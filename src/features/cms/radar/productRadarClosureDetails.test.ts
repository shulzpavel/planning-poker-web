import { describe, expect, it } from "vitest";
import type { ProductRadarBarItem, ProductRadarDetailItem, ProductRadarIssue } from "../api/cmsClient";
import {
  buildClosureBucketDetails,
  closureMatchesBucket,
  resolvedDayKey,
} from "./productRadarClosureDetails";

describe("productRadarClosureDetails", () => {
  it("maps issue keys from bucket to detail rows with links", () => {
    const bucket: ProductRadarBarItem = {
      key: "2026-06-08",
      label: "8",
      value: 2,
      issue_keys: ["D1", "D2"],
    };
    const closures: ProductRadarDetailItem[] = [
      {
        issue_key: "D1",
        summary: "First",
        issue_url: "https://jira.example.com/browse/D1",
        resolved_at: "2026-06-08T10:00:00+00:00",
        story_points: 3,
        team: "Alpha",
      },
      {
        issue_key: "D2",
        summary: "Second",
        issue_url: "https://jira.example.com/browse/D2",
        resolved_at: "2026-06-08T18:00:00+00:00",
      },
    ];

    const items = buildClosureBucketDetails(bucket, closures, {}, "day");
    expect(items).toHaveLength(2);
    expect(items[0]?.issue_key).toBe("D2");
    expect(items[0]?.issue_url).toBe("https://jira.example.com/browse/D2");
    expect(items[1]?.summary).toBe("First");
  });

  it("falls back to chart_details closures when bucket has no issue_keys", () => {
    const bucket: ProductRadarBarItem = {
      key: "2026-06-18",
      label: "18",
      value: 1,
    };
    const closures: ProductRadarDetailItem[] = [
      {
        issue_key: "BT-42",
        summary: "Closed task",
        issue_url: "https://jira.example.com/browse/BT-42",
        resolved_at: "2026-06-18T12:00:00+00:00",
      },
    ];

    const items = buildClosureBucketDetails(bucket, closures, {}, "day");
    expect(items).toHaveLength(1);
    expect(items[0]?.issue_key).toBe("BT-42");
  });

  it("falls back to issuesByKey when chart_details is missing", () => {
    const bucket: ProductRadarBarItem = {
      key: "2026-06-25",
      label: "25",
      value: 1,
    };
    const issuesByKey: Record<string, ProductRadarIssue> = {
      "BT-99": {
        key: "BT-99",
        summary: "From snapshot issues",
        status: "Готово",
        status_category: "done",
        resolution_date: "2026-06-25T09:00:00+00:00",
        url: "https://jira.example.com/browse/BT-99",
      },
    };

    const items = buildClosureBucketDetails(bucket, [], issuesByKey, "day");
    expect(items).toHaveLength(1);
    expect(items[0]?.issue_key).toBe("BT-99");
  });

  it("matches month buckets by yyyy-mm prefix", () => {
    expect(closureMatchesBucket("2026-03-15T10:00:00+00:00", "2026-03", "month")).toBe(true);
    expect(closureMatchesBucket("2026-03-15T10:00:00+00:00", "2026-04", "month")).toBe(false);
    expect(resolvedDayKey("2026-06-18T23:59:59+00:00")).toBe("2026-06-18");
  });
});
