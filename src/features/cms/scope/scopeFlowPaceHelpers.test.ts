import { describe, expect, it } from "vitest";

import {
  buildJiraBrowseUrl,
  flowAlertSeverityLabel,
  flowPaceStatusLabel,
  formatStatusDurations,
  highlightRoleLabel,
  isFlowPaceTeam,
  resolveFlowIssueUrl,
  shouldShowFlowPaceBlock,
} from "./scopeFlowPaceHelpers";

describe("scopeFlowPaceHelpers", () => {
  it("enables flow pace for igaming-rip slug and name", () => {
    expect(isFlowPaceTeam({ slug: "igaming-rip" })).toBe(true);
    expect(isFlowPaceTeam({ name: "Test iGaming RIP" })).toBe(true);
    expect(isFlowPaceTeam({ slug: "igaming-ios" })).toBe(false);
  });

  it("shows block when snapshot already has flow pace", () => {
    expect(shouldShowFlowPaceBlock(null, { enabled: true })).toBe(true);
  });

  it("maps labels", () => {
    expect(flowPaceStatusLabel("attention")).toBe("Внимание");
    expect(flowAlertSeverityLabel("high")).toBe("High");
    expect(highlightRoleLabel("qa")).toBe("QA");
    expect(formatStatusDurations({ "В работе": 3.2, Тестирование: 7.1 })).toContain("Тестирование");
  });

  it("builds jira browse urls", () => {
    expect(buildJiraBrowseUrl("FLEX-123", "https://jira.example.com/browse")).toBe(
      "https://jira.example.com/browse/FLEX-123",
    );
    expect(
      resolveFlowIssueUrl(
        { issue_key: "FLEX-1", issue_url: "https://jira.example.com/browse/FLEX-1", epic_key: "" },
        "https://jira.example.com/browse",
      ),
    ).toBe("https://jira.example.com/browse/FLEX-1");
    expect(resolveFlowIssueUrl({ issue_key: "FLEX-2", epic_key: "" }, "https://jira.example.com/browse")).toBe(
      "https://jira.example.com/browse/FLEX-2",
    );
  });
});
