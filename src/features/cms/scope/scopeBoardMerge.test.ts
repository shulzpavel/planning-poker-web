import { describe, expect, it } from "vitest";
import type { ScopeBoardRecord } from "../api/cmsClient";
import { mergeScopeBoardRecord } from "./scopeBoardMerge";

describe("mergeScopeBoardRecord", () => {
  const fullBoard = {
    id: 1,
    name: "Board",
    snapshot: {
      metrics: { capacity_sp: 100 },
      todo_items: [{ id: "todo-1", text: "a", done: false }],
      flow_pace: { enabled: true },
    },
    ai_summary: { health: "green", summary: "ok" },
    ai_summary_history: [{ id: "h1" }],
  } as unknown as ScopeBoardRecord;

  it("replaces board when response is full", () => {
    const next = { ...fullBoard, name: "Updated" };
    expect(mergeScopeBoardRecord(fullBoard, next).name).toBe("Updated");
  });

  it("merges snapshot patch and preserves ai_summary", () => {
    const next = {
      ...fullBoard,
      snapshot_partial: true,
      snapshot: { todo_items: [{ id: "todo-2", text: "b", done: false }] },
      ai_summary: null,
      ai_summary_history: [],
    } as ScopeBoardRecord;

    const merged = mergeScopeBoardRecord(fullBoard, next);
    expect(merged.snapshot?.todo_items).toHaveLength(1);
    expect(merged.snapshot?.flow_pace).toEqual(fullBoard.snapshot?.flow_pace);
    expect(merged.ai_summary).toEqual(fullBoard.ai_summary);
  });
});
