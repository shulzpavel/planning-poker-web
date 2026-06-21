import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(import.meta.dirname, "..");

/** Every production delete button must use intent="delete" (built-in confirm). */
const DELETE_BUTTON_SITES: Array<{ file: string; note: string }> = [
  { file: "features/cms/planner/PlannerShell.tsx", note: "list + edit plan + track row" },
  { file: "features/cms/scope/ScopeBoardShell.tsx", note: "scope list + release query row" },
  { file: "features/cms/scope/ScopeSectionEditor.tsx", note: "section row in editor" },
  { file: "features/cms/scope/ScopeFloatingTodo.tsx", note: "todo item in scope board" },
  { file: "features/cms/scope/ScopeReportSection.tsx", note: "release comment row" },
  { file: "features/cms/scope/ScopeTopItemsSection.tsx", note: "top item row" },
  { file: "features/cms/retro/RetroShell.tsx", note: "retro list + create form sections + action items" },
  { file: "features/cms/sessions/SessionsPage.tsx", note: "session history + task queue row" },
  { file: "features/cms/users/UsersPage.tsx", note: "hard delete — skipDeleteConfirm + custom dialog" },
  { file: "features/manager/ManagerPage.tsx", note: "backlog task card" },
];

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walkTsx(full, out);
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("delete action sites", () => {
  it("documents all known delete-button locations", () => {
    expect(DELETE_BUTTON_SITES.length).toBeGreaterThanOrEqual(10);
  });

  it.each(DELETE_BUTTON_SITES)("uses intent=delete in $file ($note)", ({ file }) => {
    const source = readFileSync(join(SRC_ROOT, file), "utf8");
    expect(source).toMatch(/intent="delete"/);
  });

  it("only UsersPage may skip built-in delete confirm", () => {
    const offenders: string[] = [];
    for (const file of walkTsx(SRC_ROOT)) {
      const rel = relative(SRC_ROOT, file);
      if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
      if (rel === "design-system/components.tsx") continue;
      const source = readFileSync(file, "utf8");
      if (!source.includes('intent="delete"')) continue;
      if (/\bskipDeleteConfirm\b/.test(source)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual(["features/cms/users/UsersPage.tsx"]);
  });

  it("does not leave orphan ConfirmDialog wired only for delete", () => {
    const legacyDeleteDialogs: string[] = [];
    for (const file of walkTsx(SRC_ROOT)) {
      const rel = relative(SRC_ROOT, file);
      if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
      const source = readFileSync(file, "utf8");
      if (!source.includes("ConfirmDialog")) continue;
      if (/kind:\s*"delete"|pendingDelete|deleteOpen|deleteTarget|confirmTarget/.test(source)) {
        // UsersPage hard-delete and SessionPage/other non-delete flows are allowed.
        if (rel === "features/cms/users/UsersPage.tsx") continue;
        if (rel === "pages/SessionPage.tsx") continue;
        if (rel === "design-system/components.tsx") continue;
        legacyDeleteDialogs.push(rel);
      }
    }
    expect(legacyDeleteDialogs).toEqual([]);
  });
});
