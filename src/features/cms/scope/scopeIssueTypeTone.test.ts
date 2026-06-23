import { describe, expect, it } from "vitest";
import { scopeIssueTypeRailClass, scopeIssueTypeTone } from "./scopeIssueTypeTone";

describe("scopeIssueTypeTone", () => {
  it("maps story, bug and task issue types", () => {
    expect(scopeIssueTypeTone({ issue_type: "Story" })).toBe("story");
    expect(scopeIssueTypeTone({ issue_type: "История" })).toBe("story");
    expect(scopeIssueTypeTone({ issue_type: "Bug" })).toBe("bug");
    expect(scopeIssueTypeTone({ issue_type: "Баг" })).toBe("bug");
    expect(scopeIssueTypeTone({ issue_type: "Task" })).toBe("task");
    expect(scopeIssueTypeTone({ issue_type: "Sub-task" })).toBe("task");
    expect(scopeIssueTypeTone({ issue_type: "Epic" })).toBe("epic");
  });

  it("returns rail classes by issue type", () => {
    expect(scopeIssueTypeRailClass({ issue_type: "Story" })).toBe("bg-green/70");
    expect(scopeIssueTypeRailClass({ issue_type: "Bug" })).toBe("bg-red/70");
    expect(scopeIssueTypeRailClass({ issue_type: "Task" })).toBe("bg-blue/70");
    expect(scopeIssueTypeRailClass({ issue_type: "Epic" })).toBe("bg-purple/70");
  });
});
