import { describe, expect, it } from "vitest";

import type { ScopeBoardRecord } from "../api/cmsClient";
import { buildScopePriorityQueueSyncPatch } from "./useScopePriorityQueueSync";

describe("buildScopePriorityQueueSyncPatch", () => {
  it("returns a partial snapshot with priority_queues only", () => {
    const record = {
      id: 1,
      updated_at: "2026-07-07T10:00:00Z",
      snapshot: {
        metrics: { capacity_sp: 10 },
        priority_queues: {
          todo: { issues: [{ key: "A-1" }], ranked_order: ["A-1"], history: [] },
          test: { issues: [], ranked_order: [], history: [] },
        },
      },
      ai_summary: { health: "green" },
      ai_summary_history: [{ id: "h1" }],
    } as unknown as ScopeBoardRecord;

    const patch = buildScopePriorityQueueSyncPatch(record);
    expect(patch.snapshot_partial).toBe(true);
    expect(patch.snapshot?.priority_queues?.todo?.issues).toHaveLength(1);
    expect(patch.snapshot?.metrics).toBeUndefined();
    expect(patch.ai_summary).toBeNull();
    expect(patch.ai_summary_history).toEqual([]);
    expect(patch.updated_at).toBe("2026-07-07T10:00:00Z");
  });
});
