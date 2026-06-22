import { describe, expect, it } from "vitest";
import {
  formatDaysOpenLabel,
  formatQuestionReleaseTag,
  releaseDoneSubgroup,
  resolvedQuestions,
} from "./scopeBoardHelpers";

describe("release open question helpers", () => {
  it("formats release tag with date and release name", () => {
    expect(formatQuestionReleaseTag("iOS 2.5.0", "2026-06-01T10:00:00.000Z")).toContain("2026");
    expect(formatQuestionReleaseTag("iOS 2.5.0", "2026-06-01T10:00:00.000Z")).toContain("iOS 2.5.0");
  });

  it("calculates days open in Russian plural form", () => {
    expect(formatDaysOpenLabel("2026-06-01T10:00:00.000Z", "2026-06-04T18:00:00.000Z")).toBe("3 дня");
  });

  it("sorts resolved questions newest first", () => {
    const items = resolvedQuestions({
      plan_issues: [],
      unplan_issues: [],
      metrics: {} as never,
      refreshed_at: "2026-06-01",
      resolved_questions: [
        { id: "a", summary: "A", comment: "1", resolved_at: "2026-05-01T10:00:00.000Z" },
        { id: "b", summary: "B", comment: "2", resolved_at: "2026-06-01T10:00:00.000Z" },
      ],
    });
    expect(items[0]?.id).toBe("b");
  });

  it("detects ready-for-release subgroup inside done column", () => {
    expect(releaseDoneSubgroup({ key: "A-1", summary: "x", url: "", story_points: 1, status: "К релизу" })).toBe(
      "ready_for_release",
    );
    expect(releaseDoneSubgroup({ key: "A-2", summary: "x", url: "", story_points: 1, status: "Готово" })).toBe("done");
  });
});
