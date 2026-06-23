import type { ScopeBoardIssue } from "../api/cmsClient";

export type ScopeIssueTypeTone = "story" | "bug" | "epic" | "task";

export function scopeIssueTypeTone(issue: Pick<ScopeBoardIssue, "issue_type">): ScopeIssueTypeTone {
  const type = (issue.issue_type || "").trim().toLowerCase();
  if (type === "story" || type === "user story" || type === "история") return "story";
  if (type === "bug" || type === "баг" || type === "defect" || type === "ошибка") return "bug";
  if (type === "epic" || type === "эпик") return "epic";
  if (type.includes("sub") || type.includes("подзадач")) return "task";
  return "task";
}

export function scopeIssueTypeRailClass(issue: Pick<ScopeBoardIssue, "issue_type">): string {
  const tone = scopeIssueTypeTone(issue);
  if (tone === "story") return "bg-green/70";
  if (tone === "bug") return "bg-red/70";
  if (tone === "epic") return "bg-purple/70";
  return "bg-blue/70";
}
