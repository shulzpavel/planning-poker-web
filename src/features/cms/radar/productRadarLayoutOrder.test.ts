import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_RADAR_LAYOUT_ORDER,
  mergeProductRadarLayoutOrder,
  reorderProductRadarLayoutOrder,
} from "./productRadarLayoutOrder";

describe("productRadarLayoutOrder", () => {
  it("merges saved order with defaults", () => {
    expect(mergeProductRadarLayoutOrder(["insights", "analytics"])).toEqual(["insights", "analytics", "jql"]);
  });

  it("filters by visible keys", () => {
    expect(mergeProductRadarLayoutOrder(DEFAULT_PRODUCT_RADAR_LAYOUT_ORDER, ["analytics", "insights"])).toEqual([
      "analytics",
      "insights",
    ]);
  });

  it("reorders visible blocks only", () => {
    const full = [...DEFAULT_PRODUCT_RADAR_LAYOUT_ORDER];
    const visible = ["analytics", "insights", "jql"] as const;
    const next = reorderProductRadarLayoutOrder(full, [...visible], "jql", "analytics");
    expect(next.filter((key) => visible.includes(key))).toEqual(["jql", "analytics", "insights"]);
  });
});
