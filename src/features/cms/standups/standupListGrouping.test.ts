import { describe, expect, it } from "vitest";
import {
  formatStandupMonthLabel,
  groupStandupsByMonth,
  groupStandupsForList,
  shouldGroupStandupsByTeam,
} from "./standupListGrouping";
import type { StandupRecord } from "../api/cmsClient";

function record(partial: Partial<StandupRecord> & Pick<StandupRecord, "id" | "meeting_date">): StandupRecord {
  return {
    team_id: 3,
    status: "published",
    payload: { participants: [] },
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...partial,
  };
}

describe("standupListGrouping", () => {
  it("groups records by month newest first", () => {
    const groups = groupStandupsByMonth([
      record({ id: 1, meeting_date: "2026-05-10" }),
      record({ id: 2, meeting_date: "2026-06-23" }),
      record({ id: 3, meeting_date: "2026-06-01" }),
    ]);
    expect(groups.map((group) => group.key)).toEqual(["2026-06", "2026-05"]);
    expect(groups[0]?.items.map((item) => item.id)).toEqual([2, 3]);
  });

  it("formats month labels in Russian", () => {
    expect(formatStandupMonthLabel("2026-06")).toBe("Июнь 2026");
  });

  it("groups by team when all teams selected", () => {
    const groups = groupStandupsForList(
      [
        record({ id: 1, meeting_date: "2026-06-10", team_id: 3, team: { id: 3, slug: "alpha", name: "Alpha" } }),
        record({ id: 2, meeting_date: "2026-06-11", team_id: 4, team: { id: 4, slug: "beta", name: "Beta" } }),
      ],
      "",
    );
    expect(groups).toHaveLength(2);
    expect(shouldGroupStandupsByTeam("")).toBe(true);
    expect(shouldGroupStandupsByTeam("3")).toBe(false);
  });
});
