import type { TeamRef } from "../api/cmsTypes";
import { teamDisplayLabel } from "./TeamBadge";

export interface TeamScopedRow {
  team_id: number | null;
  team?: TeamRef | null;
  updated_at?: string | null;
}

export interface TeamItemGroup<T> {
  key: string;
  teamId: number | null;
  team: TeamRef | null;
  label: string;
  items: T[];
}

export function teamGroupKey(teamId: number | null): string {
  return teamId == null ? "legacy" : String(teamId);
}

/** Group when the user sees rows from more than one team (filter is not pinned to one team). */
export function shouldGroupListByTeam(teamFilter: string, items: TeamScopedRow[]): boolean {
  if (teamFilter && teamFilter !== "legacy") {
    return false;
  }
  const keys = new Set(items.map((item) => teamGroupKey(item.team_id ?? null)));
  return keys.size > 1;
}

export function groupItemsByTeam<T extends TeamScopedRow>(items: T[]): TeamItemGroup<T>[] {
  const groups = new Map<string, TeamItemGroup<T>>();

  for (const item of items) {
    const teamId = item.team_id ?? null;
    const key = teamGroupKey(teamId);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      key,
      teamId,
      team: item.team ?? null,
      label: teamDisplayLabel(teamId, item.team),
      items: [item],
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "ru", { sensitivity: "base" })
  );
}

export function sortByUpdatedDesc<T extends { updated_at?: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTs = left.updated_at ? Date.parse(left.updated_at) : 0;
    const rightTs = right.updated_at ? Date.parse(right.updated_at) : 0;
    return rightTs - leftTs;
  });
}
