import { cmsFetch } from "../api/cmsClient";
import { pollIntakeResponse } from "./intakeTransport";
export interface IntakeIssue {
  key: string;
  url?: string;
  summary: string;
  status: string;
  age_days: number | null;
  assignee?: string | null;
  source?: string;
  entered_at?: string;
  left_at?: string | null;
  outcome?: string | null;
  returned?: boolean;
}
export interface IntakeBucket {
  id: string;
  label: string;
  count: number;
  keys: string[];
}
export interface IntakeReport {
  received: number;
  received_keys: string[];
  decided: number;
  decided_keys: string[];
  typical_days: number | null;
  returned: number;
  returned_keys: string[];
  outcomes: IntakeBucket[];
  sources: IntakeBucket[];
  resolution_bands: IntakeBucket[];
  current_age: IntakeBucket[];
  queue_start: number;
  queue_end: number;
  needs_information: number;
  unassigned: number;
  older_week: number;
  weekly: {
    start: string;
    end: string;
    received: number;
    decided: number;
    received_keys: string[];
    decided_keys: string[];
  }[];
  requests: IntakeIssue[];
}
export interface IntakeSnapshot {
  source: { label: string; stage_name: string; timezone: string };
  freshness: {
    stale: boolean;
    refreshing: boolean;
    refresh_error: boolean;
    refresh_seconds: number;
  };
  speed: import("./intakeSpeed").SpeedReport;
  days: number;
  generated_at: string;
  window_start: string;
  returns: number;
  coverage: { complete: number; total: number };
  metrics: {
    arrivals: number;
    decisions: number;
    pending: number;
    p50_days: number | null;
    p85_days: number | null;
    sle_days: number | null;
    within_sle_pct: number | null;
    over_sle: number | null;
    baseline_n: number;
  };
  daily: { date: string; arrivals: number; decisions: number; queue: number }[];
  aging: IntakeIssue[];
  completed: IntakeIssue[];
  report: IntakeReport;
  insights: {
    flow: string;
    queue: string;
    duration: string;
    baseline: string;
    aging: string;
  };
  ai?: { generated_at: string; insights: Partial<IntakeSnapshot["insights"]> };
}
export async function fetchIntakeSnapshot(
  days: number,
  signal: AbortSignal,
): Promise<IntakeSnapshot> {
  const result = await pollIntakeResponse(
    () =>
      cmsFetch<IntakeSnapshot | { status: "pending" }>(
        `/dashboards/intake?days=${days}`,
        { signal, cache: "no-store" },
      ),
    signal,
  );
  if (
    !result.metrics ||
    !result.report ||
    !Array.isArray(result.daily) ||
    !result.speed ||
    !result.source?.timezone ||
    !Number.isFinite(Date.parse(result.generated_at)) ||
    result.days !== days
  )
    throw new Error("Invalid dashboard data");
  return result;
}

export function dayValue(value: number | null): string {
  return value === null
    ? "—"
    : `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} дн.`;
}
