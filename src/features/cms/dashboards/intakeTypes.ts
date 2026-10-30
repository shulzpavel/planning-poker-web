export interface IntakeIssue {
  key: string; summary: string; status: string; age_days: number | null;
  assignee?: string | null; source?: string; entered_at?: string; left_at?: string | null;
  outcome?: string | null; returned?: boolean;
}
export interface IntakeBucket { id:string; label:string; count:number; keys:string[] }
export interface IntakeReport {
  received:number; received_keys:string[]; decided:number; decided_keys:string[]; typical_days:number|null;
  returned:number; returned_keys:string[]; outcomes:IntakeBucket[]; sources:IntakeBucket[]; resolution_bands:IntakeBucket[];
  current_age:IntakeBucket[]; queue_start:number; queue_end:number; needs_information:number; unassigned:number; older_week:number;
  weekly:{ start:string; end:string; received:number; decided:number; received_keys:string[]; decided_keys:string[] }[];
  requests:IntakeIssue[];
}
export interface IntakeSnapshot {
  days: number; generated_at: string; window_start: string; returns: number;
  coverage: { complete: number; total: number };
  metrics: { arrivals: number; decisions: number; pending: number; p50_days: number | null;
    p85_days: number | null; sle_days: number | null; within_sle_pct: number | null;
    over_sle: number | null; baseline_n: number };
  daily: { date: string; arrivals: number; decisions: number; queue: number }[];
  aging: IntakeIssue[]; completed: IntakeIssue[];
  report:IntakeReport;
  insights: { flow: string; queue: string; duration: string; baseline: string; aging: string };
  ai?: { generated_at: string; insights: Partial<IntakeSnapshot["insights"]> };
}
export async function fetchIntakeSnapshot(days: number, signal: AbortSignal): Promise<IntakeSnapshot> {
  const response = await fetch(`/__prototype/intake?days=${days}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Snapshot unavailable");
  const result = await response.json() as IntakeSnapshot;
  if (!result.metrics || !result.report || !Array.isArray(result.daily)) throw new Error("Invalid snapshot");
  return result;
}
export function dayValue(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} дн.`;
}

