export const hintLabels = {
  outcomes: "результаты разбора",
  duration: "срок решения",
  sources: "источники инициатив",
  flow: "поступления и решения",
  queue: "динамика очереди",
  aging: "ожидание решения",
  oldest: "старые запросы",
};
export type IntakeHintKind = keyof typeof hintLabels;
export interface ChartAnalysis {
  headline: string;
  explanation: string;
  focus: string;
  fact_ids: string[];
  keys: string[];
  evidence: string[];
}
export interface IntakeAnalysis {
  generated_at: string;
  snapshot_at: string;
  days: number;
  model: string;
  charts: Record<IntakeHintKind, ChartAnalysis>;
}
