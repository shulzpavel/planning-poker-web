export type DiscoveryOwner = {
  name: string;
  stage_count: number;
  backlog_sa_count: number;
  status_counts: Record<string, number>;
  ages_days: number[];
  old_count: number;
  load_signal: "high" | "attention" | "watch";
};

export type DiscoveryAttention = {
  key: string;
  summary: string;
  assignee: string;
  status: string;
  age_days: number;
  signal: "old_current_status";
};

export type DiscoveryStatusStat = {
  status: string;
  current: number;
  visits: number;
  median_days: number | null;
  p85_days: number | null;
  under_hour: number;
};

export type DiscoveryTransition = { from: string; to: string; count: number; return: boolean };
export type DiscoveryStageSla = { completed_count: number; average_workdays: number | null; p85_workdays: number | null; trend: "up" | "down" | "flat"; recent_p85: number | null; previous_p85: number | null };

export type DiscoverySnapshot = {
  days: number;
  generated_at: string;
  owners: DiscoveryOwner[];
  attention: DiscoveryAttention[];
  status_stats: DiscoveryStatusStat[];
  transitions: { rows: DiscoveryTransition[]; return_count: number; transition_count: number; return_rate: number };
  stage_sla: DiscoveryStageSla;
  metrics: { stage_count: number; backlog_sa_count: number; attention_count: number; owner_count: number; return_count: number };
  coverage: { complete: number; total: number };
};

export async function fetchDiscoverySnapshot(days: number, signal: AbortSignal): Promise<DiscoverySnapshot> {
  const response = await fetch(`/__prototype/intake/discovery?days=${days}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Discovery snapshot unavailable");
  const result = await response.json() as DiscoverySnapshot;
  if (!Array.isArray(result.owners) || !Array.isArray(result.attention) || !Array.isArray(result.status_stats) || !result.transitions || !result.metrics) {
    throw new Error("Invalid discovery snapshot");
  }
  return result;
}

export function ageLabel(days: number): string {
  return `${days.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} дн.`;
}
