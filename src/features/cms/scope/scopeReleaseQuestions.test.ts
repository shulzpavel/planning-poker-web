import { describe, expect, it } from "vitest";
import type { ScopeReleaseBucket } from "../api/cmsClient";
import {
  classifyReleaseReportBucket,
  formatDaysOpenLabel,
  formatQuestionReleaseTag,
  isReadyForReleaseStatus,
  partitionReleaseReportBucket,
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

  it("recognizes ready-for-release status variants", () => {
    expect(isReadyForReleaseStatus("Ready for Release")).toBe(true);
    expect(isReadyForReleaseStatus("К релизу")).toBe(true);
    expect(isReadyForReleaseStatus("Тестирование")).toBe(false);
  });

  it("moves ready-for-release issues from in_test into done partition", () => {
    const bucket: ScopeReleaseBucket = {
      slot: "current",
      label: "2.5.0",
      jql: "",
      project_key: "IOS",
      version_id: "1",
      version_name: "2.5.0",
      issues: [
        { key: "IOS-1", summary: "Ready", url: "", story_points: 1, status: "К релизу" },
        { key: "IOS-2", summary: "Testing", url: "", story_points: 1, status: "Тестирование" },
        { key: "IOS-3", summary: "Done", url: "", story_points: 1, status: "Готово" },
      ],
      counts: { total: 3, in_work: 0, in_test: 2, done: 1, open_questions: 0 },
      by_status: {},
      in_work: [],
      in_test: [
        { key: "IOS-1", summary: "Ready", url: "", story_points: 1, status: "К релизу" },
        { key: "IOS-2", summary: "Testing", url: "", story_points: 1, status: "Тестирование" },
      ],
      done: [{ key: "IOS-3", summary: "Done", url: "", story_points: 1, status: "Готово" }],
      open_questions: [],
    };

    const columns = partitionReleaseReportBucket(bucket);
    expect(classifyReleaseReportBucket(bucket.issues[0]!)).toBe("done");
    expect(columns.in_test.map((issue) => issue.key)).toEqual(["IOS-2"]);
    expect(columns.done.map((issue) => issue.key)).toEqual(["IOS-1", "IOS-3"]);
    expect(columns.counts.done).toBe(2);
    expect(columns.counts.in_test).toBe(1);
  });
});
