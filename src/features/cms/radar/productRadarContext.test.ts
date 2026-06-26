import { describe, expect, it } from "vitest";
import type { ProductRadarIssue } from "../api/cmsClient";
import { buildBlockingFeed, buildIssueContextTree, getParentChain, resolveIssueEpicKey, resolveRadarIssueUrl, splitBlockingFeed } from "./productRadarContext";

function issue(
  key: string,
  extra: Partial<ProductRadarIssue & { parent_key?: string; linked_epic_key?: string; issue_type?: string }> = {},
): ProductRadarIssue {
  return { key, summary: key, ...extra };
}

describe("productRadarContext", () => {
  it("builds epic → story → task → subtask lineage", () => {
    const issuesByKey: Record<string, ProductRadarIssue> = {
      "EPIC-1": issue("EPIC-1", { issue_type: "Epic", summary: "Payments" }),
      "STORY-1": issue("STORY-1", { issue_type: "Story", linked_epic_key: "EPIC-1", summary: "Checkout" }),
      "TASK-1": issue("TASK-1", { issue_type: "Task", parent_key: "STORY-1", summary: "API" }),
      "SUB-1": issue("SUB-1", { issue_type: "Sub-task", parent_key: "TASK-1", summary: "Endpoint" }),
    };

    const tree = buildIssueContextTree("SUB-1", issuesByKey);
    expect(tree).toHaveLength(1);
    expect(tree[0].key).toBe("EPIC-1");
    expect(tree[0].children[0]?.key).toBe("STORY-1");
    expect(tree[0].children[0]?.children[0]?.key).toBe("TASK-1");
    const leaf = tree[0].children[0]?.children[0];
    expect(leaf?.children.some((node) => node.key === "SUB-1" && node.kind === "subtask")).toBe(true);
  });

  it("places linked issues under story and subtasks under task", () => {
    const issuesByKey: Record<string, ProductRadarIssue> = {
      "EPIC-9": issue("EPIC-9", { issue_type: "Epic" }),
      "STORY-9": issue("STORY-9", {
        issue_type: "Story",
        linked_epic_key: "EPIC-9",
        issue_links: [{ relation: "relates", relation_label: "связана с", key: "REL-1", summary: "Related" }],
      }),
      "REL-1": issue("REL-1", { issue_type: "Task", summary: "Related task" }),
      "TASK-9": issue("TASK-9", {
        issue_type: "Task",
        parent_key: "STORY-9",
        subtasks: [{ key: "TASK-9-1", summary: "Child", status: "В работе" }],
      }),
    };

    const tree = buildIssueContextTree("TASK-9", issuesByKey);
    const storyNode = tree[0]?.children[0];
    expect(storyNode?.key).toBe("STORY-9");
    expect(storyNode?.children.some((node) => node.key === "REL-1" && node.kind === "link")).toBe(true);
    const taskNode = storyNode?.children.find((node) => node.key === "TASK-9");
    expect(taskNode?.children.some((node) => node.key === "TASK-9-1" && node.kind === "subtask")).toBe(true);
  });

  it("resolves epic through parent chain", () => {
    const issuesByKey: Record<string, ProductRadarIssue> = {
      "EPIC-1": issue("EPIC-1", { issue_type: "Epic" }),
      "STORY-1": issue("STORY-1", { issue_type: "Story", linked_epic_key: "EPIC-1" }),
      "TASK-1": issue("TASK-1", { issue_type: "Task", parent_key: "STORY-1" }),
    };
    expect(resolveIssueEpicKey(issuesByKey["TASK-1"], issuesByKey)).toBe("EPIC-1");
    expect(getParentChain("TASK-1", issuesByKey).map((item) => item.key)).toEqual(["STORY-1"]);
  });

  it("splits feed into blockings and insights", () => {
    const rows = buildBlockingFeed(
      [
        {
          kind: "cross_team_block",
          severity: "high",
          issue_key: "BT-1",
          blocker_key: "BT-9",
          title: "Блок",
          detail: "d",
        },
        {
          kind: "release_tail",
          severity: "medium",
          issue_key: "BT-2",
          title: "Релиз",
          detail: "d",
        },
      ],
      undefined,
      { "BT-1": issue("BT-1"), "BT-2": issue("BT-2") },
    );
    const split = splitBlockingFeed(rows);
    expect(split.blockings).toHaveLength(1);
    expect(split.insights).toHaveLength(1);
    expect(split.blockings[0]?.category).toBe("blocking");
    expect(split.insights[0]?.category).toBe("insight");
  });

  it("adds jira url for subtasks in context tree", () => {
    const issuesByKey: Record<string, ProductRadarIssue> = {
      "TASK-9": {
        key: "TASK-9",
        url: "https://jira.example.com/browse/TASK-9",
        subtasks: [{ key: "TASK-9-1", summary: "Child", status: "В работе" }],
      },
    };
    const tree = buildIssueContextTree("TASK-9", issuesByKey);
    const subtask = tree[0]?.children.find((node) => node.key === "TASK-9-1");
    expect(subtask?.url).toBe("https://jira.example.com/browse/TASK-9-1");
    expect(resolveRadarIssueUrl("TASK-9-1", issuesByKey)).toBe("https://jira.example.com/browse/TASK-9-1");
  });
});
