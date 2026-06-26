import { describe, expect, it } from "vitest";
import type { ProductRadarSnapshot } from "../api/cmsClient";
import { buildBlockingFeed, splitBlockingFeed } from "./productRadarContext";
import { resolveProductRadarBlocking } from "./productRadarBlocking";

describe("resolveProductRadarBlocking", () => {
  it("falls back to snapshot signals when analytics blocking is empty", () => {
    const snapshot: ProductRadarSnapshot = {
      signals: [
        {
          kind: "cross_team_block",
          severity: "high",
          issue_key: "BTBMGLBL-364",
          summary: "Blocked task",
          title: "Блокировка другой командой",
          detail: "blocked by other team",
          blocking_team: "Android",
          blocked_team: "RIP",
          blocker_key: "BT-450",
          status: "В работе",
        },
      ],
      analytics: {
        period: "month",
        label: "Месяц",
        insights: [],
        team_blocking: { teams: [], total_blocks: 0 },
        periods: {
          all: {
            period: "all",
            label: "За всё время",
            insights: [],
            team_blocking: { teams: [], total_blocks: 0 },
          },
        },
      },
    };

    const resolved = resolveProductRadarBlocking(snapshot);
    const { blockings } = splitBlockingFeed(
      buildBlockingFeed(resolved.insights, resolved.teamBlocking, {}),
    );

    expect(resolved.teamBlocking?.total_blocks).toBe(1);
    expect(blockings.length).toBeGreaterThan(0);
    expect(blockings[0]?.blockedKey).toBe("BTBMGLBL-364");
  });
});
