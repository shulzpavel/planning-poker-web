import type { StandupPayload, StandupRecord, StandupRole, StandupTrack, StandupWorkItem } from "../api/cmsClient";
import {
  normalizeStandupJiraKey,
  resolveStandupWorkItemTitle,
  standupWorkItemHasContent,
} from "./standupJira";

export const STANDUP_ROLE_META: Record<StandupRole, { label: string; tone: "info" | "neutral" | "success" | "warning" }> = {
  front: { label: "Front", tone: "info" },
  back: { label: "Back", tone: "neutral" },
  qa: { label: "QA", tone: "success" },
  other: { label: "Другое", tone: "warning" },
};

export const STANDUP_TRACK_META: Record<StandupTrack, { description: string }> = {
  yesterday: { description: "Что сделано" },
  today: { description: "Над чем работает" },
  blocker: { description: "Что мешает" },
};

export const STANDUP_STATUS_OPTIONS = [
  { value: "in_progress", label: "В работе" },
  { value: "done", label: "Готово" },
  { value: "blocked", label: "Заблокировано" },
  { value: "waiting", label: "Ожидание" },
] as const;

export function newLocalId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Calendar date in the user's local timezone (`YYYY-MM-DD`). */
export function localIsoDate(reference = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return localIsoDate();
}

/** Last day of the month for list filters — keeps near-future standups visible. */
export function endOfMonthIsoDate(reference = new Date()): string {
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return localIsoDate(end);
}

export function defaultStandupsListFromDate(reference = new Date()): string {
  return localIsoDate(new Date(reference.getFullYear(), reference.getMonth() - 1, 1));
}

export function defaultStandupsListToDate(reference = new Date()): string {
  return endOfMonthIsoDate(reference);
}

export function formatStandupDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatStandupShortDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function mergeRosterMembersIntoPayload(
  payload: StandupPayload,
  members: Array<{ id: string; name: string; role: StandupRole; active: boolean }>,
): StandupPayload {
  const existingIds = new Set(payload.participants.map((participant) => participant.id));
  const added = members
    .filter((member) => member.active && !existingIds.has(member.id))
    .map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      present: true,
      items: [] as StandupWorkItem[],
    }));
  if (added.length === 0) return payload;
  return { ...payload, participants: [...payload.participants, ...added] };
}

export function countStandupBlockers(payload: StandupPayload): number {
  return payload.participants.reduce(
    (total, participant) => total + participant.items.filter((item) => item.track === "blocker").length,
    0,
  );
}

export function countStandupParticipants(payload: StandupPayload): number {
  return payload.participants.filter((participant) => participant.present).length;
}

export function collectBlockerItems(payload: StandupPayload): Array<StandupWorkItem & { participantName: string; role: StandupRole }> {
  const rows: Array<StandupWorkItem & { participantName: string; role: StandupRole }> = [];
  for (const participant of payload.participants) {
    for (const item of participant.items) {
      if (item.track === "blocker") {
        rows.push({ ...item, participantName: participant.name, role: participant.role });
      }
    }
  }
  return rows;
}

export function sanitizeStandupPayload(payload: StandupPayload): StandupPayload {
  return {
    ...payload,
    participants: payload.participants.map((participant) => ({
      ...participant,
      items: participant.items
        .filter((item) => standupWorkItemHasContent(item))
        .map((item) => {
          const jiraKey = normalizeStandupJiraKey(item.jira_key ?? "") || (item.jira_key ?? "").trim();
          return {
            ...item,
            jira_key: jiraKey,
            task_title: resolveStandupWorkItemTitle(item),
          };
        }),
    })),
  };
}

export function standupPayloadSaveError(payload: StandupPayload): string | null {
  for (const participant of payload.participants) {
    for (const item of participant.items) {
      if (!standupWorkItemHasContent(item)) continue;
      if (item.track === "blocker" && !(item.comment ?? "").trim()) {
        return `У блокера «${resolveStandupWorkItemTitle(item)}» (${participant.name}) укажите комментарий.`;
      }
    }
  }
  return null;
}

export function emptyWorkItem(track: StandupTrack): StandupWorkItem {
  return {
    id: newLocalId("item"),
    task_title: "",
    jira_key: "",
    track,
    due_date: track === "today" ? null : null,
    status: track === "blocker" ? "blocked" : "in_progress",
    comment: "",
  };
}

export function standupListSummary(record: StandupRecord): string {
  const blockers = countStandupBlockers(record.payload);
  const participants = countStandupParticipants(record.payload);
  return `${participants} участн. · ${blockers} блокер${blockers === 1 ? "" : blockers >= 2 && blockers <= 4 ? "а" : "ов"}`;
}

export function isDueSoonOrOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const today = todayIsoDate();
  return dueDate <= today;
}
