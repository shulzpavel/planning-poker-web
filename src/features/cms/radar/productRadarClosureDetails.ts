import type { ProductRadarBarItem, ProductRadarDetailItem, ProductRadarIssue } from "../api/cmsClient";
import { resolveRadarIssueUrl } from "./productRadarContext";

function formatResolvedAt(value?: string | null): string {
  if (!value) return "—";
  const date = resolvedDayKey(value);
  if (!date) return value;
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

export function resolvedDayKey(resolvedAt?: string | null): string | null {
  if (!resolvedAt) return null;
  const parsed = new Date(resolvedAt);
  if (Number.isNaN(parsed.getTime())) {
    return resolvedAt.length >= 10 ? resolvedAt.slice(0, 10) : null;
  }
  return parsed.toISOString().slice(0, 10);
}

export function closureMatchesBucket(
  resolvedAt: string | undefined | null,
  bucketKey: string,
  granularity: "day" | "month",
): boolean {
  const dayKey = resolvedDayKey(resolvedAt);
  if (!dayKey) return false;
  if (granularity === "month") return dayKey.slice(0, 7) === bucketKey;
  return dayKey === bucketKey;
}

function isDoneIssue(issue: ProductRadarIssue): boolean {
  if (issue.resolution_date) return true;
  const category = issue.status_category?.trim().toLowerCase();
  if (category === "done" || category === "complete" || category === "completed") return true;
  const status = issue.status?.trim().toLowerCase();
  if (status === "готово" || status === "done" || status === "closed" || status === "resolved") return true;
  const resolution = issue.resolution?.trim().toLowerCase();
  return Boolean(resolution && resolution !== "unresolved" && resolution !== "none");
}

function collectBucketIssueKeys(
  bucket: ProductRadarBarItem,
  closures: ProductRadarDetailItem[] | undefined,
  issuesByKey: Record<string, ProductRadarIssue>,
  granularity: "day" | "month",
): string[] {
  const keys = new Set<string>();

  for (const issueKey of bucket.issue_keys ?? []) {
    if (issueKey) keys.add(issueKey);
  }

  for (const item of closures ?? []) {
    if (item.issue_key && closureMatchesBucket(item.resolved_at, bucket.key, granularity)) {
      keys.add(item.issue_key);
    }
  }

  for (const issue of Object.values(issuesByKey)) {
    const issueKey = issue.key?.trim();
    if (!issueKey || !isDoneIssue(issue)) continue;
    if (closureMatchesBucket(issue.resolution_date, bucket.key, granularity)) {
      keys.add(issueKey);
    }
  }

  return [...keys];
}

export function buildClosureBucketDetails(
  bucket: ProductRadarBarItem,
  closures: ProductRadarDetailItem[] | undefined,
  issuesByKey: Record<string, ProductRadarIssue>,
  granularity: "day" | "month",
): ProductRadarDetailItem[] {
  const closureByKey = new Map((closures ?? []).map((item) => [item.issue_key, item]));
  const keys = collectBucketIssueKeys(bucket, closures, issuesByKey, granularity);

  return keys
    .map((issueKey) => {
      const fromList = closureByKey.get(issueKey);
      const issue = issuesByKey[issueKey];
      const resolvedAt = fromList?.resolved_at ?? issue?.resolution_date ?? undefined;
      const storyPoints = fromList?.story_points;
      return {
        issue_key: issueKey,
        summary: issue?.summary ?? fromList?.summary ?? issueKey,
        issue_url: issue?.url ?? fromList?.issue_url ?? resolveRadarIssueUrl(issueKey, issuesByKey) ?? undefined,
        team: issue?.team ?? fromList?.team,
        resolved_at: resolvedAt ?? undefined,
        story_points: storyPoints,
        metric_label: "Закрыто",
        metric_value:
          storyPoints != null && storyPoints > 0
            ? `${formatResolvedAt(resolvedAt)} · ${storyPoints} SP`
            : formatResolvedAt(resolvedAt),
      } satisfies ProductRadarDetailItem;
    })
    .sort((left, right) => String(right.resolved_at ?? "").localeCompare(String(left.resolved_at ?? "")));
}

export function closureBucketTitle(
  bucket: ProductRadarBarItem,
  granularity: "day" | "month",
): string {
  if (granularity === "month") {
    return `Закрытия за ${bucket.label}`;
  }
  if (bucket.month_label) {
    return `Закрытия ${bucket.month_label}, ${bucket.label} число`;
  }
  return `Закрытия за ${bucket.label}`;
}
