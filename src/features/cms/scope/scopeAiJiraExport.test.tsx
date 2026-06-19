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
    getAiJiraExportStatus: vi.fn(),
  },
}));

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
    vi.mocked(cmsScopeApi.getAiJiraExportStatus).mockReset();
  });

  it("returns export when jira_export reaches a terminal status", async () => {
    vi.mocked(cmsScopeApi.getAiJiraExportStatus)
      .mockResolvedValueOnce({ jira_export: { status: undefined } })
      .mockResolvedValueOnce({ jira_export: { status: "ok" } });

    const jiraExport = await pollScopeAiJiraExport(7, { intervalMs: 1, timeoutMs: 100 });
    expect(jiraExport?.status).toBe("ok");
    expect(cmsScopeApi.getAiJiraExportStatus).toHaveBeenCalledTimes(2);
  });

  it("returns null on timeout", async () => {
    vi.mocked(cmsScopeApi.getAiJiraExportStatus).mockResolvedValue({
      jira_export: { status: undefined },
    });

    const jiraExport = await pollScopeAiJiraExport(7, { intervalMs: 1, timeoutMs: 5 });
    expect(jiraExport).toBeNull();
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
