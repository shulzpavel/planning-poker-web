import { describe, expect, it } from "vitest";
import type { ScopePriorityQueue } from "../api/cmsClient";
import {
  WAREHOUSE_DROP_ZONE_ID,
  computeNextRankedOrder,
  groupWarehouseIssues,
  queueWarehouseType,
  splitPriorityQueue,
  totalWarehouseNewCounts,
} from "./scopePriorityQueueModel";

function issue(key: string, issueType = "Story") {
  return { key, summary: key, story_points: 1, issue_type: issueType };
}

describe("queueWarehouseType", () => {
  it("classifies incidents by key prefix and type", () => {
    expect(queueWarehouseType(issue("INC-1", "Task"))).toBe("incident");
    expect(queueWarehouseType(issue("FLEX-1", "Incident"))).toBe("incident");
    expect(queueWarehouseType(issue("FLEX-2", "Story"))).toBe("story");
    expect(queueWarehouseType(issue("FLEX-3", "Bug"))).toBe("bug");
    expect(queueWarehouseType(issue("FLEX-4", "Task"))).toBe("task");
  });
});

describe("splitPriorityQueue", () => {
  it("splits ranked and warehouse issues", () => {
    const queue: ScopePriorityQueue = {
      ranked_order: ["FLEX-2", "FLEX-1"],
      order: ["FLEX-2", "FLEX-1"],
      issues: [issue("FLEX-1"), issue("FLEX-2"), issue("INC-3", "Incident")],
      history: [],
      warehouse_new_keys: ["INC-3"],
      warehouse_new_counts: { incident: 1, story: 0, bug: 0, task: 0 },
    };
    const split = splitPriorityQueue(queue);
    expect(split.rankedIssues.map((item) => item.key)).toEqual(["FLEX-2", "FLEX-1"]);
    expect(split.warehouseIssues.map((item) => item.key)).toEqual(["INC-3"]);
    expect(totalWarehouseNewCounts(split.warehouseNewCounts)).toBe(1);
  });
});

describe("groupWarehouseIssues", () => {
  it("groups warehouse issues by type in fixed order", () => {
    const groups = groupWarehouseIssues(
      [issue("FLEX-4", "Task"), issue("FLEX-2", "Story"), issue("INC-1", "Incident"), issue("FLEX-3", "Bug")],
      new Set(["INC-1"]),
      { story: 0, incident: 1, bug: 0, task: 0 }
    );
    expect(groups.map((group) => group.type)).toEqual(["story", "incident", "bug", "task"]);
    expect(groups.find((group) => group.type === "incident")?.newCount).toBe(1);
  });
});

describe("computeNextRankedOrder", () => {
  it("moves issue from warehouse into ranked list", () => {
    expect(computeNextRankedOrder(["FLEX-1"], "FLEX-2", "FLEX-1")).toEqual(["FLEX-2", "FLEX-1"]);
  });

  it("removes issue when dropped on warehouse", () => {
    expect(computeNextRankedOrder(["FLEX-1", "FLEX-2"], "FLEX-1", WAREHOUSE_DROP_ZONE_ID)).toEqual(["FLEX-2"]);
  });

  it("reorders inside ranked list", () => {
    expect(computeNextRankedOrder(["FLEX-1", "FLEX-2", "FLEX-3"], "FLEX-3", "FLEX-1")).toEqual([
      "FLEX-3",
      "FLEX-1",
      "FLEX-2",
    ]);
  });
});
