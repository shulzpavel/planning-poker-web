import { describe, expect, it } from "vitest";
import { teamDisplayLabel } from "./TeamBadge";
import { needsTeamPicker, resolveDefaultTeamId, teamPickerRequired } from "./TeamSelect";
import { teamFilterParams } from "./TeamFilter";
import { groupItemsByTeam, shouldGroupListByTeam, sortByUpdatedDesc } from "./teamGrouping";

describe("team UI helpers", () => {
  it("labels legacy rows", () => {
    expect(teamDisplayLabel(null, null)).toBe("Без команды");
  });

  it("auto-selects the only team", () => {
    expect(resolveDefaultTeamId([{ id: 3, slug: "a", name: "A", description: "", is_active: true, created_at: "", updated_at: "" }])).toBe(3);
  });

  it("requires picker for multi-team non-superuser", () => {
    const teams = [
      { id: 1, slug: "a", name: "A", description: "", is_active: true, created_at: "", updated_at: "" },
      { id: 2, slug: "b", name: "B", description: "", is_active: true, created_at: "", updated_at: "" },
    ];
    expect(needsTeamPicker(teams, false)).toBe(true);
    expect(needsTeamPicker(teams, true)).toBe(true);
    expect(needsTeamPicker(teams.slice(0, 1), false)).toBe(false);
    expect(needsTeamPicker([], false, [1, 2])).toBe(true);
    expect(teamPickerRequired(teams, false)).toBe(true);
    expect(teamPickerRequired(teams, true)).toBe(false);
    expect(teamPickerRequired(teams.slice(0, 1), false)).toBe(false);
  });

  it("maps team filter params", () => {
    expect(teamFilterParams("")).toEqual({});
    expect(teamFilterParams("legacy")).toEqual({});
    expect(teamFilterParams("12")).toEqual({ team_id: 12 });
  });

  it("groups rows when multiple teams are visible", () => {
    const items = [
      { team_id: 2, team: { id: 2, name: "Beta" }, updated_at: "2026-01-02T00:00:00Z" },
      { team_id: 1, team: { id: 1, name: "Alpha" }, updated_at: "2026-01-03T00:00:00Z" },
      { team_id: 1, team: { id: 1, name: "Alpha" }, updated_at: "2026-01-01T00:00:00Z" },
    ];
    expect(shouldGroupListByTeam("", items)).toBe(true);
    expect(shouldGroupListByTeam("1", items)).toBe(false);
    expect(shouldGroupListByTeam("legacy", [{ team_id: null, team: null, updated_at: "" }])).toBe(false);

    const groups = groupItemsByTeam(items);
    expect(groups.map((group) => group.label)).toEqual(["Alpha", "Beta"]);
    expect(groups[0]?.items).toHaveLength(2);

    const sorted = sortByUpdatedDesc(items);
    expect(sorted.map((item) => item.updated_at)).toEqual([
      "2026-01-03T00:00:00Z",
      "2026-01-02T00:00:00Z",
      "2026-01-01T00:00:00Z",
    ]);
  });
});
