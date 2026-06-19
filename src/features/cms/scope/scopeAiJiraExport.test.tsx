import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cmsScopeApi } from "../api/cmsClient";
import type { ScopeAiSummary } from "./scopeAiTypes";
import {
  ScopeAiJiraExportBadge,
  normalizePlanEpicKey,
  pollScopeAiJiraExport,
} from "./scopeAiJiraExport";

vi.mock("../api/cmsClient", () => ({
  cmsScopeApi: {
    get: vi.fn(),
  },
}));

const baseSummary: ScopeAiSummary = {
  health: "green",
  summary: "ok",
  capacity_assessment: "ok",
  buffer_status: "ok",
  delivery_snapshot: "ok",
  blockers: [],
  scope_risks: [],
  queue_insights: { todo: "todo", test: "test" },
  recommendations: [],
  focus_now: [],
  watch_list: [],
  generated_at: "2026-06-19T12:00:00+00:00",
  source: "anthropic",
};

describe("normalizePlanEpicKey", () => {
  it("accepts valid Jira keys", () => {
    expect(normalizePlanEpicKey("flex-12")).toBe("FLEX-12");
  });

  it("rejects invalid keys", () => {
    expect(normalizePlanEpicKey("not-a-key")).toBe("");
    expect(normalizePlanEpicKey("")).toBe("");
  });
});

describe("pollScopeAiJiraExport", () => {
  beforeEach(() => {
    vi.mocked(cmsScopeApi.get).mockReset();
  });

  it("returns summary when jira_export reaches a terminal status", async () => {
    vi.mocked(cmsScopeApi.get)
      .mockResolvedValueOnce({
        ai_summary: { ...baseSummary, jira_export: { status: undefined } },
      } as Awaited<ReturnType<typeof cmsScopeApi.get>>)
      .mockResolvedValueOnce({
        ai_summary: { ...baseSummary, jira_export: { status: "ok" } },
      } as Awaited<ReturnType<typeof cmsScopeApi.get>>);

    const summary = await pollScopeAiJiraExport(7, { intervalMs: 1, timeoutMs: 100 });
    expect(summary?.jira_export?.status).toBe("ok");
    expect(cmsScopeApi.get).toHaveBeenCalledTimes(2);
  });

  it("returns null on timeout", async () => {
    vi.mocked(cmsScopeApi.get).mockResolvedValue({
      ai_summary: { ...baseSummary, jira_export: { status: undefined } },
    } as Awaited<ReturnType<typeof cmsScopeApi.get>>);

    const summary = await pollScopeAiJiraExport(7, { intervalMs: 1, timeoutMs: 5 });
    expect(summary).toBeNull();
  });
});

describe("ScopeAiJiraExportBadge", () => {
  it("renders nothing without plan epic key", () => {
    expect(renderToStaticMarkup(
      <ScopeAiJiraExportBadge planEpicKey="" jiraExport={{ status: "ok" }} />,
    )).toBe("");
  });

  it("renders pending state", () => {
    const markup = renderToStaticMarkup(
      <ScopeAiJiraExportBadge planEpicKey="FLEX-1" pending />,
    );
    expect(markup).toContain("Отправляем в Jira");
  });

  it("renders success and error states", () => {
    expect(renderToStaticMarkup(
      <ScopeAiJiraExportBadge planEpicKey="FLEX-1" jiraExport={{ status: "ok" }} />,
    )).toContain("Сохранено в Jira");

    expect(renderToStaticMarkup(
      <ScopeAiJiraExportBadge planEpicKey="FLEX-1" jiraExport={{ status: "error", error: "boom" }} />,
    )).toContain("Ошибка Jira");
  });
});
