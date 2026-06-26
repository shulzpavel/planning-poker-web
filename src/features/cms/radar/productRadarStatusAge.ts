import type { ProductRadarBarItem, ProductRadarIssue, ScopeBoardIssue } from "../api/cmsClient";
import { classifyScopeReportBucket } from "../scope/scopeBoardHelpers";

const LONG_AGE_CUTOFF = 30;

const SHORT_AGE_BUCKETS: Array<{ key: string; label: string; low: number; high: number }> = [
  { key: "0_3", label: "0–3 дн.", low: 0, high: 3 },
  { key: "4_7", label: "4–7 дн.", low: 4, high: 7 },
  { key: "8_14", label: "8–14 дн.", low: 8, high: 14 },
  { key: "15_30", label: "15–30 дн.", low: 15, high: 30 },
];

type AgeBucketDef = { key: string; label: string; low: number; high: number };

export type StatusAgeBucket = ProductRadarBarItem & { low: number; high: number };

const SHORT_AGE_BY_KEY = Object.fromEntries(SHORT_AGE_BUCKETS.map((bucket) => [bucket.key, bucket]));

type IssueWithAge = ProductRadarIssue & {
  current_status_days?: number;
  status_entered_at?: string;
  status_changed_at?: string;
  resolution?: string;
  resolution_date?: string | null;
};

export function isActiveForStatusAge(issue: ProductRadarIssue): boolean {
  const withMeta = issue as IssueWithAge;
  if (withMeta.resolution_date) return false;
  const resolution = withMeta.resolution?.trim().toLowerCase();
  if (resolution && resolution !== "unresolved" && resolution !== "none") {
    return false;
  }
  return classifyScopeReportBucket(issue as ScopeBoardIssue) !== "done";
}

function niceNumber(value: number): number {
  if (value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const residual = value / magnitude;
  let nice = 10;
  if (residual <= 1) nice = 1;
  else if (residual <= 2) nice = 2;
  else if (residual <= 5) nice = 5;
  return nice * magnitude;
}

function formatAgeLabel(low: number, high: number, openEnd: boolean): string {
  const lowI = Math.floor(low);
  const highI = Math.ceil(high);
  if (openEnd) return `${lowI}+ дн.`;
  if (lowI >= highI) return `${lowI} дн.`;
  return `${lowI}–${highI} дн.`;
}

function subdivideLongAgeRange(minDays: number, maxDays: number, maxBuckets = 6): AgeBucketDef[] {
  const start = Math.max(LONG_AGE_CUTOFF + 1, Math.floor(minDays));
  const end = Math.ceil(maxDays);
  if (end <= start) {
    return [{ key: "long_0", label: formatAgeLabel(start, end, true), low: start, high: 10_000 }];
  }

  const spanDays = end - start + 1;
  const bucketCount = Math.min(maxBuckets, Math.max(3, Math.ceil(spanDays / 20)));
  const step = Math.max(1, Math.floor(niceNumber(spanDays / bucketCount)));

  const defs: AgeBucketDef[] = [];
  let current = start;
  let index = 0;
  while (current <= end && index < bucketCount) {
    const bucketEnd = Math.min(end, current + step - 1);
    const isLast = index === bucketCount - 1 || bucketEnd >= end;
    if (isLast) {
      defs.push({
        key: `long_${index}`,
        label: formatAgeLabel(current, end, true),
        low: current,
        high: 10_000,
      });
      break;
    }
    defs.push({
      key: `long_${index}`,
      label: formatAgeLabel(current, bucketEnd, false),
      low: current,
      high: bucketEnd,
    });
    current = bucketEnd + 1;
    index += 1;
  }
  return defs;
}

export function adaptiveAgeBucketDefs(sortedAges: number[]): AgeBucketDef[] {
  if (!sortedAges.length) return [];

  const defs: AgeBucketDef[] = [];
  for (const bucket of SHORT_AGE_BUCKETS) {
    if (sortedAges.some((age) => age >= bucket.low && age <= bucket.high)) {
      defs.push(bucket);
    }
  }

  const longAges = sortedAges.filter((age) => age > LONG_AGE_CUTOFF);
  if (longAges.length) {
    const longMin = Math.min(...longAges);
    const longMax = Math.max(...longAges);
    if (longMin === longMax) {
      defs.push({
        key: "long_only",
        label: formatAgeLabel(longMin, longMax, true),
        low: longMin,
        high: 10_000,
      });
    } else {
      const spread = longMax - longMin;
      const maxLongBuckets = spread > 120 ? 7 : spread > 60 ? 5 : 4;
      defs.push(...subdivideLongAgeRange(longMin, longMax, maxLongBuckets));
    }
  }

  if (defs.length) return defs;
  const onlyAge = sortedAges[0]!;
  return [{ key: "only", label: formatAgeLabel(onlyAge, onlyAge, false), low: onlyAge, high: onlyAge }];
}

function ageBucketColor(index: number, total: number, maxAge: number, high: number): string {
  if (high >= maxAge && maxAge > LONG_AGE_CUTOFF) return "#ef4444";
  if (index >= total - 2) return "#f59e0b";
  if (index >= total - 3) return "#3b82f6";
  return "#94a3b8";
}

export function issueStatusDays(issue: IssueWithAge, now = Date.now()): number {
  const current = issue.current_status_days;
  if (typeof current === "number" && Number.isFinite(current)) {
    return Math.max(0, current);
  }
  const enteredRaw = issue.status_entered_at ?? issue.status_changed_at;
  if (!enteredRaw) return 0;
  const entered = Date.parse(enteredRaw);
  if (Number.isNaN(entered)) return 0;
  return Math.max(0, (now - entered) / 86_400_000);
}

function isActiveRadarIssue(issue: ProductRadarIssue): boolean {
  return isActiveForStatusAge(issue);
}

function issueMatchesAgeBucket(issue: ProductRadarIssue, bucket: Pick<StatusAgeBucket, "low" | "high">): boolean {
  if (!isActiveRadarIssue(issue)) return false;
  const days = issueStatusDays(issue);
  return days >= bucket.low && days <= bucket.high;
}

function parseAgeBoundsFromLabel(label: string): { low: number; high: number } | null {
  const open = label.match(/^(\d+)\+\s*дн/);
  if (open) return { low: Number(open[1]), high: 10_000 };
  const range = label.match(/^(\d+)[–-](\d+)\s*дн/);
  if (range) return { low: Number(range[1]), high: Number(range[2]) };
  const single = label.match(/^(\d+)\s*дн/);
  if (single) {
    const day = Number(single[1]);
    return { low: day, high: day };
  }
  return null;
}

function enrichStatusAgeBarItem(item: ProductRadarBarItem): StatusAgeBucket | null {
  const short = SHORT_AGE_BY_KEY[item.key];
  if (short) {
    return { ...item, low: short.low, high: short.high };
  }
  const parsed = parseAgeBoundsFromLabel(item.label);
  if (!parsed) return null;
  return { ...item, ...parsed };
}

function buildStatusAgeBucketsFromIssues(issues: ProductRadarIssue[]): StatusAgeBucket[] | null {
  const activeIssues = issues.filter(isActiveRadarIssue);
  if (!activeIssues.length) return null;

  const hasAgeSignal = activeIssues.some((issue) => {
    const withAge = issue as IssueWithAge;
    return (
      typeof withAge.current_status_days === "number"
      || Boolean(withAge.status_entered_at || withAge.status_changed_at)
    );
  });
  if (!hasAgeSignal) return null;

  const ages = activeIssues.map((issue) => issueStatusDays(issue)).filter((age) => age >= 0);
  if (!ages.length) return null;

  const sortedAges = [...ages].sort((a, b) => a - b);
  const bucketDefs = adaptiveAgeBucketDefs(sortedAges);
  const counts = Object.fromEntries(bucketDefs.map((bucket) => [bucket.key, 0]));

  for (const days of ages) {
    for (const bucket of bucketDefs) {
      if (days >= bucket.low && days <= bucket.high) {
        counts[bucket.key] = (counts[bucket.key] ?? 0) + 1;
        break;
      }
    }
  }

  const maxAge = sortedAges[sortedAges.length - 1]!;
  const visible = bucketDefs.filter((bucket) => (counts[bucket.key] ?? 0) > 0);
  return visible.map((bucket, index) => ({
    key: bucket.key,
    label: bucket.label,
    value: counts[bucket.key] ?? 0,
    color: ageBucketColor(index, visible.length, maxAge, bucket.high),
    low: bucket.low,
    high: bucket.high,
  }));
}

export function buildStatusAgeHistogramFromIssues(issues: ProductRadarIssue[]): ProductRadarBarItem[] | null {
  const buckets = buildStatusAgeBucketsFromIssues(issues);
  return buckets;
}

export function resolveStatusAgeBuckets(
  issuesByKey: Record<string, ProductRadarIssue>,
  fallback: ProductRadarBarItem[] | undefined,
): StatusAgeBucket[] {
  const fromIssues = buildStatusAgeBucketsFromIssues(Object.values(issuesByKey));
  if (fromIssues?.length) return fromIssues;
  return (fallback ?? [])
    .map(enrichStatusAgeBarItem)
    .filter((bucket): bucket is StatusAgeBucket => bucket !== null);
}

export function buildStatusAgeIssueDetails(
  issuesByKey: Record<string, ProductRadarIssue>,
  bucket: StatusAgeBucket | null,
): Array<{
  issue_key: string;
  summary: string;
  issue_url?: string;
  team?: string;
  metric_label: string;
  metric_value: string;
}> {
  if (!bucket) return [];

  return Object.entries(issuesByKey)
    .filter(([, issue]) => issueMatchesAgeBucket(issue, bucket))
    .map(([issueKey, issue]) => ({
      issue_key: issueKey,
      summary: issue.summary ?? issueKey,
      issue_url: issue.url,
      team: issue.team?.trim() || undefined,
      metric_label: "В статусе",
      metric_value: `${Math.round(issueStatusDays(issue))} дн.`,
    }))
    .sort(
      (left, right) =>
        Number.parseFloat(right.metric_value) - Number.parseFloat(left.metric_value)
        || left.issue_key.localeCompare(right.issue_key, "ru"),
    );
}

export function resolveStatusAgeItems(
  issuesByKey: Record<string, ProductRadarIssue>,
  fallback: ProductRadarBarItem[] | undefined,
): ProductRadarBarItem[] {
  return resolveStatusAgeBuckets(issuesByKey, fallback);
}
