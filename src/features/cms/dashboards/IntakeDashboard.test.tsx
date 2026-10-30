// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IntakeDashboard from "./IntakeDashboard";
import { buildAnalysisFacts, hintLabels } from "./intakeAnalysisFacts";
import type { AnalysisLoader } from "./IntakeAnalysisProvider";
import { ThemeProvider } from "../../../design-system";
afterEach(cleanup);
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) });
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());

const snapshot = {
  days: 30, generated_at: "2026-10-29T15:00:00+01:00", window_start: "2026-09-30T00:00:00+02:00",
  coverage: { complete: 1, total: 1 }, returns: 0,
  metrics: { arrivals: 1, decisions: 0, pending: 1, p50_days: null, p85_days: null,
    sle_days: null, within_sle_pct: null, over_sle: null, baseline_n: 0 },
  daily: [{ date: "2026-10-29", arrivals: 1, decisions: 0, queue: 1 }],
  aging: [{ key: "DH-1", summary: "Новый запрос", status: "Новый запрос", age_days: 3, assignee: "PO", source: "SEO" }],
  completed: [], insights: { flow: "Один вход, решений пока нет.", queue: "В очереди один запрос.", aging: "Запрос ждёт три дня.", duration: "Завершений нет.", baseline: "Для ориентира нужно 20 завершений." },
  report: { received: 1, received_keys: ["DH-1"], decided: 0, decided_keys: [], typical_days: null,
    returned: 0, returned_keys: [], queue_start: 0, queue_end: 1, needs_information: 0, unassigned: 0, older_week: 0,
    outcomes: [{ id: "waiting", label: "Ещё ждут решения", count: 1, keys: ["DH-1"] }],
    sources: [{ id: "source:SEO", label: "SEO", count: 1, keys: ["DH-1"] }],
        resolution_bands: [], current_age: [{ id: "recent", label: "До 3 дней", count: 1, keys: ["DH-1"] }],
    weekly: [{ start: "2026-10-26", end: "2026-10-29", received: 1, decided: 0, received_keys: ["DH-1"], decided_keys: [] }],
    requests: [{ key: "DH-1", summary: "Новый запрос", status: "Новый запрос", age_days: 3, assignee: "PO" }],
  },
};

const analyze: AnalysisLoader = async (data) => {
  const facts = buildAnalysisFacts(data);
  return { days: data.days, snapshot_at: data.generated_at, generated_at: data.generated_at, model: "test-model",
    charts: Object.fromEntries(Object.keys(hintLabels).map(kind => [kind, {
      headline: kind === "sources" ? `Источник: ${data.report.sources[0]?.label || "нет новых инициатив"}` : `Разбор ${kind}`,
      explanation: "Сравнение полных недель показывает изменение потока.", focus: "Разобрать конкретные ожидающие запросы.",
      fact_ids: [facts[kind as keyof typeof facts].facts[0].id], keys: facts[kind as keyof typeof facts].requests.slice(0, 1).map(x => x.key),
    }])) as Awaited<ReturnType<AnalysisLoader>>["charts"],
  };
};

describe("intake prototype", () => {
  it("loads real snapshot, changes period and opens a contributing request", async () => {
    const load = vi.fn(async (days: number) => ({ ...snapshot, days }));
    render(<MemoryRouter><ThemeProvider defaultMode="dark"><IntakeDashboard loadSnapshot={load} loadAnalysis={analyze} /></ThemeProvider></MemoryRouter>);
    await screen.findByRole("heading", { name: "Как мы разбираем продуктовые инициативы" });
    expect(load).toHaveBeenCalledWith(30, expect.any(AbortSignal));
    expect(screen.getByRole("img", { name: "Что стало с новыми запросами" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SEO: 1 запросов", exact: true }));
    expect(screen.getByRole("dialog").textContent).toContain("Источник инициативы: SEO");
    expect(screen.getByRole("dialog").textContent).toContain("DH-1");
    fireEvent.click(screen.getByRole("button", { name: "Закрыть список", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await waitFor(() => expect(load).toHaveBeenCalledWith(7, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole("button", { name: /DH-1: Новый запрос/ }));
    expect(screen.getByRole("dialog").textContent).toContain("Новый запрос");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps real model analysis collapsed, opens evidence and discards it on period change", async () => {
    const load = vi.fn(async (days: number) => days === 7 ? {
      ...snapshot, days, report: { ...snapshot.report, sources: [{ id: "source:CRM", label: "CRM", count: 1, keys: ["DH-1"] }] },
    } : snapshot);
    render(<MemoryRouter><ThemeProvider defaultMode="dark"><IntakeDashboard loadSnapshot={load} loadAnalysis={analyze} /></ThemeProvider></MemoryRouter>);
    await screen.findByText("ИИ-разбор: источники инициатив");
    expect(screen.queryByRole("region", { name: "ИИ-подсказка: источники инициатив" })).toBeNull();
    fireEvent.click(screen.getByText("ИИ-разбор: источники инициатив"));
    const hint = await screen.findByRole("region", { name: "ИИ-подсказка: источники инициатив" });
    await within(hint).findByText("Источник: SEO");
    expect(hint.textContent).toContain("Сравнение полных недель");
    expect(hint.textContent).toContain("Фокус разбора");
    fireEvent.click(within(hint).getByRole("button", { name: "Связанные запросы · 1" }));
    expect(screen.getByRole("dialog").textContent).toContain("DH-1");
    fireEvent.click(screen.getByRole("button", { name: "Закрыть список", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await screen.findByRole("heading", { name: "Результаты за 7 дней" });
    expect(screen.queryByRole("region", { name: "ИИ-подсказка: источники инициатив" })).toBeNull();
    fireEvent.click(screen.getByText("ИИ-разбор: источники инициатив"));
    await screen.findByText("Источник: CRM");
  });

  it("does not substitute templates when the model fails or returns a stale snapshot", async () => {
    const stale: AnalysisLoader = async (data, signal) => ({ ...await analyze(data, signal), days: 90 });
    render(<MemoryRouter><ThemeProvider defaultMode="dark"><IntakeDashboard loadSnapshot={async () => snapshot} loadAnalysis={stale} /></ThemeProvider></MemoryRouter>);
    await screen.findByText("ИИ-разбор: источники инициатив");
    fireEvent.click(screen.getByText("ИИ-разбор: источники инициатив"));
    await screen.findByText(/Не удалось получить ИИ-разбор/);
    expect(screen.queryByText("Источник: SEO")).toBeNull();
    expect(screen.getByRole("button", { name: "Повторить ИИ-разбор" })).toBeTruthy();
  });

  it("shows historical speed before the current queue and opens the reviews behind a weekly point", async () => {
    const closed = { key: "DH-2", summary: "Завершённый разбор", status: "Исследование", age_days: 1, entered_at: "2026-10-27T00:00:00+01:00", left_at: "2026-10-28T00:00:00+01:00" };
    const data = { ...snapshot, report: { ...snapshot.report, requests: [...snapshot.report.requests, closed] } };
    render(<MemoryRouter><ThemeProvider defaultMode="dark"><IntakeDashboard loadSnapshot={async () => data} loadAnalysis={analyze} /></ThemeProvider></MemoryRouter>);
    await screen.findByRole("group", { name: "Медиана и средний срок разбора по неделям" });
    expect(screen.queryByText("Принято первых решений")).toBeNull();
    expect(screen.getByText("Средний срок разбора")).toBeTruthy();
    const history = screen.getByRole("heading", { name: "Как меняется скорость разбора" });
    const current = screen.getByRole("heading", { name: "Запросы, которые ждут решения" });
    expect(history.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /26.10–29.10: медиана/ }));
    expect(screen.getByRole("dialog").textContent).toContain("DH-2");
    expect(screen.getByRole("dialog").textContent).toContain("Завершённый разбор");
  });

  it("shows a retryable error without invented metrics", async () => {
    const load = vi.fn().mockRejectedValue(new Error("offline"));
    render(<MemoryRouter><ThemeProvider defaultMode="dark"><IntakeDashboard loadSnapshot={load} loadAnalysis={analyze} /></ThemeProvider></MemoryRouter>);
    await screen.findByText("Не удалось загрузить снимок Jira");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeTruthy();
    expect(screen.queryByText("Запрос ждёт три дня.")).toBeNull();
  });

  it("removes old explanation while a different period loads", async () => {
    let resolve: (value: typeof snapshot) => void = () => undefined;
    const load = vi.fn().mockResolvedValueOnce(snapshot).mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<MemoryRouter><ThemeProvider defaultMode="dark"><IntakeDashboard loadSnapshot={load} loadAnalysis={analyze} /></ThemeProvider></MemoryRouter>);
    await screen.findByRole("img", { name: "Что стало с новыми запросами" });
    fireEvent.click(screen.getByRole("button", { name: "90 дней" }));
    expect(screen.queryByRole("img", { name: "Что стало с новыми запросами" })).toBeNull();
    await act(async () => resolve(snapshot));
  });
});
