import { arrayMove } from "@dnd-kit/sortable";

export const FLOW_PACE_CHART_IDS = [
  "done_mix",
  "throughput",
  "cycle_time",
  "phase_time",
  "qa_iterations",
  "active_signals",
] as const;

export type FlowPaceChartId = (typeof FLOW_PACE_CHART_IDS)[number];

export function mergeFlowPaceChartOrder(
  saved: string[] | null | undefined,
  chartIds: string[],
): string[] {
  const known = new Set(chartIds);
  const result: string[] = [];
  const seen = new Set<string>();

  for (const key of saved ?? []) {
    if (typeof key !== "string" || !known.has(key) || seen.has(key)) continue;
    result.push(key);
    seen.add(key);
  }

  for (const key of chartIds) {
    if (!seen.has(key)) {
      result.push(key);
    }
  }

  return result;
}

export function reorderFlowPaceChartOrder(order: string[], activeId: string, overId: string): string[] {
  const oldIndex = order.indexOf(activeId);
  const newIndex = order.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0) return order;
  return arrayMove(order, oldIndex, newIndex);
}

export function sortFlowPaceCharts<T extends { id: string }>(charts: T[], order: string[]): T[] {
  const byId = new Map(charts.map((chart) => [chart.id, chart]));
  return order.map((id) => byId.get(id)).filter((chart): chart is T => Boolean(chart));
}
