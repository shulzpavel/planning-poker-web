import type { IntakeIssue, IntakeSnapshot } from "./intakeTypes";

export const hintLabels = {
  outcomes: "результаты разбора", duration: "срок решения", sources: "источники инициатив",
  flow: "поступления и решения", queue: "динамика очереди", aging: "ожидание решения", oldest: "старые запросы",
};
export type IntakeHintKind = keyof typeof hintLabels;
export interface AnalysisFact { id: string; text: string }
export interface ChartFacts { facts: AnalysisFact[]; requests: IntakeIssue[] }
export type AnalysisFacts = Record<IntakeHintKind, ChartFacts>;
export interface ChartAnalysis {
  headline: string; explanation: string; focus: string; fact_ids: string[]; keys: string[];
}
export interface IntakeAnalysis {
  generated_at: string; snapshot_at: string; days: number; model: string;
  charts: Record<IntakeHintKind, ChartAnalysis>;
}
const f = (id: string, text: string): AnalysisFact => ({ id, text });
const pct = (n: number, total: number) => total ? Math.round(n / total * 100) : 0;
function groupFacts(prefix: string, groups: IntakeSnapshot["report"]["outcomes"], total: number) {
  return groups.map((x, i) => f(`${prefix}${i}`, `${x.label}: ${x.count} из ${total} (${pct(x.count, total)}%).`));
}
function currentFacts(snapshot: IntakeSnapshot) {
  const r = snapshot.report;
  const statuses = [...new Set(snapshot.aging.map(x => x.status))];
  return [f("current", `Вся текущая очередь: ${r.queue_end}; старше 7 дней: ${r.older_week}; ждут уточнений: ${r.needs_information}; без ответственного: ${r.unassigned}.`),
    ...statuses.map((status, i) => {
      const rows = snapshot.aging.filter(x => x.status === status);
      return f(`status${i}`, `${status}: ${rows.length}; старше 7 дней: ${rows.filter(x => x.age_days !== null && x.age_days > 7).length}; без ответственного: ${rows.filter(x => !x.assignee).length}.`);
    })];
}
function flowComparisons(snapshot: IntakeSnapshot): AnalysisFact[] {
  const full = snapshot.report.weekly.filter(w => Math.round((Date.parse(w.end) - Date.parse(w.start)) / 86400000) === 6);
  const latest = full[full.length - 1], previous = full[full.length - 2];
  const gap = [...full].sort((a, b) => (b.received - b.decided) - (a.received - a.decided))[0];
  return [
    ...(latest && previous ? [f("comparison", `Последние две полные недели ${previous.start}–${previous.end} и ${latest.start}–${latest.end}: поступления ${previous.received} → ${latest.received} (изменение ${latest.received - previous.received}); первые решения ${previous.decided} → ${latest.decided} (изменение ${latest.decided - previous.decided}).`)] : []),
    ...(gap ? [f("imbalance", `Максимальный разрыв поступления минус первые решения среди полных недель: ${gap.received - gap.decided}, ${gap.start}–${gap.end}; это разрыв потоков, НЕ изменение очереди.`)] : []),
  ];
}
export function buildAnalysisFacts(snapshot: IntakeSnapshot): AnalysisFacts {
  const r = snapshot.report, current = currentFacts(snapshot);
  const waitingKeys = r.outcomes.find(x => x.id === "waiting")?.keys || [];
  const waiting = snapshot.aging.filter(x => waitingKeys.includes(x.key));
  const leaders = [...r.sources].filter(x => x.id !== "source:Не указан").sort((a, b) => b.count - a.count).slice(0, 2);
  const leaderTotal = leaders.reduce((sum, x) => sum + x.count, 0);
  const newest = f("period", `Период ${snapshot.window_start.slice(0, 10)}–${snapshot.generated_at.slice(0, 10)} (${snapshot.days} дней). Поступило впервые: ${r.received}; первых решений: ${r.decided}; вернулись на разбор: ${r.returned}.`);
  const peak = [...snapshot.daily].sort((a, b) => b.queue - a.queue)[0];
  const weekly = r.weekly.map((w, i) => {
    const full = Math.round((Date.parse(w.end) - Date.parse(w.start)) / 86400000) === 6;
    return f(`week${i}`, `${w.start}–${w.end} (${full ? "полная" : "неполная"} неделя): поступило ${w.received}, первых решений ${w.decided}, разница ${w.received - w.decided}.`);
  });
  const queue = [f("queue", `Очередь: в начале ${r.queue_start}, сейчас ${r.queue_end}, изменение ${r.queue_end - r.queue_start}.`),
    ...(peak ? [f("peak", `Максимум очереди: ${peak.queue}, дата ${peak.date}; после максимума изменение ${r.queue_end - peak.queue}.`)] : [])];
  const slowKeys = r.resolution_bands.find(x => x.id === "old")?.keys || [];
  const slow = r.requests.filter(x => slowKeys.includes(x.key));
  const durations = slow.map(x => x.age_days).filter((x): x is number => x !== null);
  const tail = f("tail", durations.length ? `Длинный хвост ЗАВЕРШЁННЫХ первых разборов: ${slow.length}; диапазон длительности ${Math.min(...durations)}–${Math.max(...durations)} календарных дней. Причины прежнего ожидания не установлены.` : "Завершённых первых разборов дольше 7 дней нет.");
  const old = snapshot.aging.filter(x => x.age_days !== null && x.age_days > 7);
  const groups = (prefix: string, buckets: typeof r.outcomes, total: number) => [newest, ...groupFacts(prefix, buckets, total)];
  return {
    outcomes: { facts: [...groups("outcome", r.outcomes, r.received), f("waiting_detail", `Ожидающие из новой когорты: ${waiting.length}; из них без ответственного ${waiting.filter(x => !x.assignee).length}, в статусе Нужна информация ${waiting.filter(x => x.status === "Нужна информация").length}. Назначение и статус на дату снимка, не история движения.`)], requests: r.requests.filter(x => r.received_keys?.includes(x.key)) },
    duration: { facts: [...groups("duration", r.resolution_bands, r.decided), f("median", `Медиана календарных дней до первого решения: ${r.typical_days ?? "нет завершений"}.`), tail], requests: slow.map(x => ({ ...x, status: "Первый разбор ЗАВЕРШЁН", assignee: undefined, outcome: undefined })) },
    sources: { facts: [...groups("source", r.sources, r.received), f("concentration", `Два крупнейших указанных источника (${leaders.map(x => x.label).join(" + ")}): ${leaderTotal} из ${r.received}, ${pct(leaderTotal, r.received)}%. Без источника: ${r.sources.find(x => x.id === "source:Не указан")?.count || 0}.`)], requests: r.requests.filter(x => r.received_keys?.includes(x.key)) },
    flow: { facts: [newest, ...weekly, ...flowComparisons(snapshot), ...queue], requests: [] },
    queue: { facts: [...queue, ...current, ...weekly], requests: snapshot.aging },
    aging: { facts: current, requests: old },
    oldest: { facts: current, requests: [...snapshot.aging].sort((a, b) => (b.age_days ?? -1) - (a.age_days ?? -1)).slice(0, 5) },
  };
}
export function validateAnalysis(value: unknown, facts: AnalysisFacts): IntakeAnalysis["charts"] {
  if (!value || typeof value !== "object") throw new Error("Invalid analysis");
  const result = {} as IntakeAnalysis["charts"];
  for (const kind of Object.keys(hintLabels) as IntakeHintKind[]) {
    const row = (value as Record<string, unknown>)[kind] as ChartAnalysis | undefined;
    const strings = row && [row.headline, row.explanation, row.focus];
    if (!row || !strings?.every(x => typeof x === "string" && x.trim().length > 0 && x.length <= 1400)
      || !Array.isArray(row.fact_ids) || !row.fact_ids.length || row.fact_ids.length > facts[kind].facts.length
      || !row.fact_ids.every(id => facts[kind].facts.some(x => x.id === id))
      || !Array.isArray(row.keys) || row.keys.length > 10
      || !row.keys.every(key => facts[kind].requests.some(x => x.key === key))) throw new Error(`Unsupported analysis evidence: ${kind}; required texts, fact_ids only from [${facts[kind].facts.map(x => x.id).join(",")}], 0–10 keys from this chart only`);
    result[kind] = { headline: row.headline, explanation: row.explanation, focus: row.focus, fact_ids: [...new Set(row.fact_ids)], keys: [...new Set(row.keys)] };
  }
  return result;
}
