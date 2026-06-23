import { describe, expect, it } from "vitest";
import {
  formatStandupLocalDueTag,
  normalizeStandupJiraKey,
  resolveStandupWorkItemTitle,
  shouldLookupStandupJiraOnBlur,
  standupWorkItemHasContent,
} from "./standupJira";

describe("standupJira", () => {
  it("normalizes valid Jira keys", () => {
    expect(normalizeStandupJiraKey(" flex-326 ")).toBe("FLEX-326");
    expect(normalizeStandupJiraKey("FLEX–326")).toBe("FLEX-326");
    expect(normalizeStandupJiraKey("flex")).toBe("");
  });

  it("detects row content by jira key or title", () => {
    expect(standupWorkItemHasContent({ task_title: "", jira_key: "FLEX-1" })).toBe(true);
    expect(standupWorkItemHasContent({ task_title: "Auth", jira_key: "" })).toBe(true);
    expect(standupWorkItemHasContent({ task_title: "", jira_key: "" })).toBe(false);
  });

  it("resolves display title from jira key when summary missing", () => {
    expect(resolveStandupWorkItemTitle({ task_title: "Summary", jira_key: "FLEX-1" })).toBe("Summary");
    expect(resolveStandupWorkItemTitle({ task_title: "", jira_key: "flex-2" })).toBe("FLEX-2");
  });

  it("formats local due tag from prior standup", () => {
    expect(formatStandupLocalDueTag("2026-06-25", "2026-06-23")).toBe("Срок до 25.06 — из дейлика 23.06");
  });

  it("defers lookup until blur — skip empty or already resolved keys", () => {
    expect(shouldLookupStandupJiraOnBlur("", "", null)).toBe(false);
    expect(shouldLookupStandupJiraOnBlur("flex", "Title", null)).toBe(false);
    expect(shouldLookupStandupJiraOnBlur("FLEX-326", "", null)).toBe(true);
    expect(shouldLookupStandupJiraOnBlur("FLEX-326", "Auth flow", "FLEX-326")).toBe(false);
    expect(shouldLookupStandupJiraOnBlur("FLEX-327", "Auth flow", "FLEX-326")).toBe(true);
  });
});
