import { describe, expect, it } from "vitest";
import { mergeFlowPaceChartOrder, reorderFlowPaceChartOrder, sortFlowPaceCharts } from "./scopeFlowPaceChartOrder";

describe("scopeFlowPaceChartOrder", () => {
  it("merges saved order with available chart ids", () => {
    const ids = ["done_mix", "throughput", "active_signals"];
    expect(mergeFlowPaceChartOrder(["active_signals", "done_mix"], ids)).toEqual([
      "active_signals",
      "done_mix",
      "throughput",
    ]);
  });

  it("reorders chart ids", () => {
    const order = ["done_mix", "throughput", "cycle_time"];
    expect(reorderFlowPaceChartOrder(order, "cycle_time", "done_mix")).toEqual([
      "cycle_time",
      "done_mix",
      "throughput",
    ]);
  });

  it("sorts charts by order", () => {
    const charts = [{ id: "a" }, { id: "b" }];
    expect(sortFlowPaceCharts(charts, ["b", "a"])).toEqual([{ id: "b" }, { id: "a" }]);
  });
});
