import { cmsStandupsApi } from "../api/cmsClient";
import { ApiError } from "../../../shared/api/http";
import { formatStandupShortDate } from "./standupsLogic";

const JIRA_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

/** Unicode dash variants often pasted from Jira / messengers. */
const UNICODE_DASH_RE = /[\u2010\u2011\u2012\u2013\u2014\u2212]/g;

export interface StandupJiraLookupResult {
  key: string;
  summary: string;
  url: string;
}

export interface StandupLocalDueHint {
  dueDate: string;
  meetingDate: string;
}

export function normalizeStandupJiraKey(raw: string): string {
  const trimmed = raw.trim().toUpperCase().replace(UNICODE_DASH_RE, "-");
  return JIRA_KEY_RE.test(trimmed) ? trimmed : "";
}

export function standupWorkItemHasContent(item: { task_title?: string; jira_key?: string | null }): boolean {
  return Boolean((item.task_title ?? "").trim() || normalizeStandupJiraKey(item.jira_key ?? ""));
}

export function resolveStandupWorkItemTitle(item: { task_title?: string; jira_key?: string | null }): string {
  const title = (item.task_title ?? "").trim();
  if (title) return title;
  return normalizeStandupJiraKey(item.jira_key ?? "");
}

const summaryCache = new Map<string, string>();

export function clearStandupJiraSummaryCache(): void {
  summaryCache.clear();
}

/** Lookup runs on blur — skip if key empty or summary already resolved for this key. */
export function shouldLookupStandupJiraOnBlur(
  rawKey: string,
  taskTitle: string,
  lastLookupKey: string | null,
): boolean {
  const key = normalizeStandupJiraKey(rawKey);
  if (!key) return false;
  const summary = taskTitle.trim();
  if (lastLookupKey === key && summary && summary.toUpperCase() !== key) return false;
  return true;
}

export async function lookupStandupJiraIssue(issueKey: string): Promise<StandupJiraLookupResult | null> {
  const key = normalizeStandupJiraKey(issueKey);
  if (!key) return null;
  const cached = summaryCache.get(key);
  if (cached) {
    const [summary, url = ""] = cached.split("\0");
    return { key, summary, url };
  }
  try {
    const issue = await cmsStandupsApi.lookupJiraIssue(key);
    summaryCache.set(key, `${issue.summary}\0${issue.url ?? ""}`);
    return issue;
  } catch (error) {
    throw new Error(formatStandupJiraLookupError(error, key));
  }
}

/** @deprecated use lookupStandupJiraIssue */
export async function lookupStandupJiraSummary(
  issueKey: string,
): Promise<{ key: string; summary: string; url: string } | null> {
  return lookupStandupJiraIssue(issueKey);
}

export async function lookupStandupLocalDueHint(
  issueKey: string,
  options: { teamId: number; beforeMeetingDate?: string | null },
): Promise<StandupLocalDueHint | null> {
  const key = normalizeStandupJiraKey(issueKey);
  if (!key) return null;
  try {
    const hint = await cmsStandupsApi.lookupLocalDueHint(key, {
      team_id: options.teamId,
      before: options.beforeMeetingDate ?? undefined,
    });
    if (!hint.due_date) return null;
    return {
      dueDate: hint.due_date,
      meetingDate: hint.meeting_date ?? "",
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function formatStandupLocalDueTag(dueDate: string, meetingDate?: string | null): string {
  const dueLabel = formatStandupShortDate(dueDate);
  if (meetingDate) {
    return `Срок до ${dueLabel} — из дейлика ${formatStandupShortDate(meetingDate)}`;
  }
  return `Срок до ${dueLabel}`;
}

function formatStandupJiraLookupError(error: unknown, key: string): string {
  if (error instanceof ApiError) {
    if (error.status === 404 && error.message === "Not Found") {
      return "Сервис не обновлён — пересоберите voting-service (docker compose build voting-service)";
    }
    if (error.status === 404) {
      return `Задача ${key} не найдена в Jira`;
    }
    if (error.status === 403) {
      return "Нет прав на поиск задач в Jira";
    }
    if (error.status === 502 || error.status === 503) {
      return "Jira недоступна — проверьте jira-service";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Не удалось загрузить задачу из Jira";
}
