import { describe, expect, it } from "vitest";
import { buildAnalysisFacts, validateAnalysis } from "./intakeAnalysisFacts";
import type { IntakeSnapshot } from "./intakeTypes";

const snapshot = {
  days: 30, generated_at: "2026-10-29T15:00:00+01:00", window_start: "2026-09-30T00:00:00+02:00",
  coverage: { complete: 2, total: 2 },
  daily: [{ date: "2026-10-27", queue: 8 }, { date: "2026-10-28", queue: 12 }, { date: "2026-10-29", queue: 9 }],
  aging: [{ key: "DH-1", status: "Нужна информация", age_days: 10, assignee: null }],
  report: { received: 10, decided: 8, returned: 1, typical_days: 2, queue_start: 4, queue_end: 9,
    needs_information: 1, unassigned: 1, older_week: 1, outcomes: [], sources: [], resolution_bands: [],
    weekly: [{ start: "2026-10-19", end: "2026-10-25", received: 6, decided: 4 }, { start: "2026-10-26", end: "2026-10-29", received: 4, decided: 4 }],
    requests: [{ key: "DH-1", status: "Нужна информация", age_days: 10 }],
  },
} as IntakeSnapshot;

describe("grounded chart analysis", () => {
  it("supplies the queue peak and labels incomplete weeks so the model need not ask the user to compare them", () => {
    const facts = buildAnalysisFacts(snapshot);
    expect(facts.queue.facts.map(x => x.text).join(" ")).toContain("12, дата 2026-10-28");
    expect(facts.flow.facts.map(x => x.text).join(" ")).toContain("2026-10-26–2026-10-29 (неполная неделя)");
    expect(facts.aging.requests[0].key).toBe("DH-1");
  });
  it("rejects unsupported evidence and invented task keys instead of displaying fabricated analysis", () => {
    const facts = buildAnalysisFacts(snapshot);
    const valid = Object.fromEntries(Object.entries(facts).map(([kind, data]) => [kind, {
      headline: "Вывод", explanation: "Вывод по данным", focus: "Фокус", fact_ids: [data.facts[0].id], keys: [],
    }]));
    expect(validateAnalysis(valid, facts).queue.fact_ids).toEqual(["queue"]);
    expect(() => validateAnalysis({ ...valid, sources: { ...valid.sources, fact_ids: ["invented"] } }, facts)).toThrow("Unsupported analysis evidence");
    expect(() => validateAnalysis({ ...valid, queue: { ...valid.queue, keys: ["DH-999"] } }, facts)).toThrow("Unsupported analysis evidence");
  });
  it("compares complete weeks and separates completed review duration from current task status", () => {
    const data = { ...snapshot, report: { ...snapshot.report, decided_keys: ["DH-2"], resolution_bands: [{ id: "old", label: "Больше недели", count: 1, keys: ["DH-2"] }], requests: [{ key: "DH-2", status: "Исследование", age_days: 20, left_at: "2026-10-28" }], weekly: [
      { start: "2026-10-12", end: "2026-10-18", received: 17, decided: 18, received_keys: [], decided_keys: [] },
      { start: "2026-10-19", end: "2026-10-25", received: 22, decided: 14, received_keys: [], decided_keys: [] },
      { start: "2026-10-26", end: "2026-10-29", received: 9, decided: 11, received_keys: [], decided_keys: [] },
    ] } };
    const facts = buildAnalysisFacts(data);
    expect(facts.flow.facts.find(x => x.id === "comparison")?.text).toContain("поступления 17 → 22 (изменение 5); первые решения 18 → 14 (изменение -4)");
    expect(facts.flow.facts.find(x => x.id === "imbalance")?.text).toContain("8, 2026-10-19–2026-10-25");
    expect(facts.duration.requests[0].status).toBe("Первый разбор ЗАВЕРШЁН");
    expect(facts.duration.requests[0].age_days).toBe(20);
  });
  it("keeps an empty dataset explicit", () => {
    const empty = { ...snapshot, aging: [], daily: [], report: { ...snapshot.report, received: 0, decided: 0, weekly: [], requests: [] } };
    expect(buildAnalysisFacts(empty).flow.facts.map(x => x.text).join(" ")).toContain("Поступило впервые: 0");
    expect(buildAnalysisFacts(empty).oldest.requests).toEqual([]);
  });
});
