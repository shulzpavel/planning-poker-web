import type { StandupRecord } from "../api/cmsClient";
import { groupItemsByTeam, teamGroupKey } from "../components/teamGrouping";
import { teamDisplayLabel } from "../components/TeamBadge";

export interface StandupMonthGroup {
  key: string;
  label: string;
  items: StandupRecord[];
}

export interface StandupTeamMonthGroup {
  key: string;
  teamId: number | null;
  label: string;
  months: StandupMonthGroup[];
}

const RU_MONTH_NAMES = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

export function formatStandupMonthLabel(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const monthIndex = Number(monthRaw) - 1;
  if (!yearRaw || monthIndex < 0 || monthIndex > 11) return monthKey;
  const monthName = RU_MONTH_NAMES[monthIndex];
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${yearRaw}`;
}

export function currentStandupMonthKey(reference = new Date()): string {
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  return `${reference.getFullYear()}-${month}`;
}

export function shouldGroupStandupsByTeam(teamFilter: string): boolean {
  return teamFilter === "" || teamFilter === "legacy";
}

export function groupStandupsByMonth(items: StandupRecord[]): StandupMonthGroup[] {
  const buckets = new Map<string, StandupRecord[]>();
  for (const item of items) {
    const key = item.meeting_date.slice(0, 7);
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, monthItems]) => ({
      key,
      label: formatStandupMonthLabel(key),
      items: [...monthItems].sort(
        (left, right) => right.meeting_date.localeCompare(left.meeting_date) || right.id - left.id,
      ),
    }));
}

export function groupStandupsForList(items: StandupRecord[], teamFilter: string): StandupTeamMonthGroup[] {
  if (!shouldGroupStandupsByTeam(teamFilter)) {
    return [
      {
        key: "team-filtered",
        teamId: items[0]?.team_id ?? null,
        label: "",
        months: groupStandupsByMonth(items),
      },
    ];
  }

  const grouped = groupItemsByTeam(items);
  if (grouped.length === 0) {
    return [];
  }

  return grouped.map((group) => ({
    key: group.key,
    teamId: group.teamId,
    label: group.label,
    months: groupStandupsByMonth(group.items),
  }));
}

export function countStandupListRecords(groups: StandupTeamMonthGroup[]): number {
  return groups.reduce(
    (total, group) => total + group.months.reduce((monthTotal, month) => monthTotal + month.items.length, 0),
    0,
  );
}

export function standupTeamGroupLabel(teamId: number | null, team: StandupRecord["team"]): string {
  return teamDisplayLabel(teamId, team ?? null);
}

export function standupRecordTeamKey(record: StandupRecord): string {
  return teamGroupKey(record.team_id ?? null);
}
