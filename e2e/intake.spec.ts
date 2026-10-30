import { expect, test } from "@playwright/test";
import { buildAnalysisFacts, hintLabels } from "../src/features/cms/dashboards/intakeAnalysisFacts";
import type { IntakeSnapshot } from "../src/features/cms/dashboards/intakeTypes";

test("intake graphs, period navigation and contributing issue work on desktop and mobile", async ({ page, isMobile }) => {
  await page.route("**/__prototype/intake?*", async route => {
    const days = Number(new URL(route.request().url()).searchParams.get("days"));
    const snapshot: IntakeSnapshot = {
      days, generated_at: "2026-10-29T15:00:00+01:00", window_start: "2026-09-30T00:00:00+02:00",
      coverage: { complete: 1, total: 1 }, returns: 0,
      metrics: { arrivals: days, decisions: 0, pending: 1, p50_days: null, p85_days: null,
        sle_days: null, within_sle_pct: null, over_sle: null, baseline_n: 0 },
      daily: [{ date: "2026-10-29", arrivals: 1, decisions: 0, queue: 1 }],
      aging: [{ key: "DH-1", summary: "Контрольный запрос", status: "Новый запрос", age_days: 3, assignee: "PO" }],
      completed: [], insights: { flow: `Контрольный период: ${days} дней.`, queue: "В очереди один запрос.", aging: "Возраст — три дня.", duration: "Нет завершений.", baseline: "Недостаточно истории." },
      report: { received: 1, received_keys: ["DH-1"], decided: 0, decided_keys: [], typical_days: null,
        returned: 0, returned_keys: [], queue_start: 0, queue_end: 1, needs_information: 0, unassigned: 0, older_week: 0,
        outcomes: [{ id: "waiting", label: "Ещё ждут решения", count: 1, keys: ["DH-1"] }],
        sources: [{ id: "source:SEO", label: "SEO", count: 1, keys: ["DH-1"] }],
        resolution_bands: [], current_age: [{ id: "recent", label: "До 3 дней", count: 1, keys: ["DH-1"] }],
        weekly: [{ start: "2026-10-26", end: "2026-10-29", received: 1, decided: 0, received_keys: ["DH-1"], decided_keys: [] }],
        requests: [{ key: "DH-1", summary: "Контрольный запрос", status: "Новый запрос", age_days: 3, assignee: "PO" }],
      },
    };
    if (new URL(route.request().url()).searchParams.get("analysis") === "1") {
      const facts = buildAnalysisFacts(snapshot);
      await route.fulfill({ json: { days, generated_at: snapshot.generated_at, snapshot_at: snapshot.generated_at, model: "test-model",
        charts: Object.fromEntries(Object.keys(hintLabels).map(kind => [kind, { headline: "Контрольный ИИ-вывод", explanation: "Анализ динамики за период.", focus: "Разобрать ожидающие запросы.", fact_ids: [facts[kind as keyof typeof facts].facts[0].id], keys: kind === "sources" ? ["DH-1"] : [] }])) } });
    } else await route.fulfill({ json: snapshot });
  });
  if (!isMobile) await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/prototype/dashboards/intake");
  await expect(page.getByRole("heading", { name: "Как мы разбираем продуктовые инициативы" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Что стало с новыми запросами" })).toBeVisible();
  await expect(page.getByText("Принято первых решений", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Средний срок разбора", { exact: true })).toBeVisible();
  if (!isMobile) {
    const box = await page.locator(".intake-content").boundingBox();
    expect(box!.width).toBeCloseTo(1920 * 0.8, 0);
  }
  expect(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);
  const sourceHint = page.getByRole("region", { name: "ИИ-подсказка: источники инициатив" });
  await expect(sourceHint).not.toBeVisible();
  await page.getByText("ИИ-разбор: источники инициатив", { exact: true }).click();
  await expect(sourceHint).toContainText("Контрольный ИИ-вывод");
  await sourceHint.getByRole("button", { name: "Связанные запросы · 1" }).click();
  await expect(page.getByRole("dialog")).toContainText("ИИ-разбор: источники инициатив");
  await expect(page.getByRole("dialog")).toContainText("DH-1");
  await page.getByRole("button", { name: "Закрыть список", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "7 дней", exact: true }).click();
  await expect(page).toHaveURL(/days=7/);
  await expect(page.getByRole("heading", { name: "Результаты за 7 дней" })).toBeVisible();
  await page.getByRole("button", { name: "Ещё ждут решения: 1 запросов", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Контрольный запрос");
  await page.getByRole("button", { name: "Закрыть список", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "DH-1: Контрольный запрос", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link", { name: /DH-1/ })).toHaveAttribute("href", "https://media-global.atlassian.net/browse/DH-1");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
