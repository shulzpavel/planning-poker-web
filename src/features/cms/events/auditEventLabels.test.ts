import { describe, expect, it } from "vitest";
import {
  ACTION_LABELS,
  extractAuditEntityLinks,
  formatAuditPayloadValue,
  labelForAction,
  labelForPayloadField,
} from "./auditEventLabels";

describe("labelForAction", () => {
  it("returns Russian label for known standup actions", () => {
    expect(labelForAction("cms.standup.update")).toBe("Дейлик обновлён");
    expect(labelForAction("cms.standup.publish")).toBe("Дейлик опубликован");
    expect(labelForAction("cms.standup_roster.update")).toBe("Состав команды для дейликов обновлён");
  });

  it("falls back to raw action for unknown events", () => {
    expect(labelForAction("cms.future.thing")).toBe("cms.future.thing");
  });
});

describe("labelForPayloadField", () => {
  it("localizes common technical keys", () => {
    expect(labelForPayloadField("standup_id")).toBe("Дейлик");
    expect(labelForPayloadField("session_id")).toBe("Сессия");
    expect(labelForPayloadField("issue_key")).toBe("Задача Jira");
  });

  it("keeps unknown keys as-is", () => {
    expect(labelForPayloadField("mystery_field")).toBe("mystery_field");
  });
});

describe("formatAuditPayloadValue", () => {
  it("localizes standup status values", () => {
    expect(formatAuditPayloadValue("status", "published")).toBe("опубликован");
    expect(formatAuditPayloadValue("status", "draft")).toBe("черновик");
  });

  it("formats booleans in Russian", () => {
    expect(formatAuditPayloadValue("cached", true)).toBe("да");
    expect(formatAuditPayloadValue("cached", false)).toBe("нет");
  });

  it("returns em dash for nullish values", () => {
    expect(formatAuditPayloadValue("count", null)).toBe("—");
    expect(formatAuditPayloadValue("count", undefined)).toBe("—");
  });
});

describe("extractAuditEntityLinks", () => {
  it("links standup, retro and scope board entities", () => {
    const links = extractAuditEntityLinks({
      standup_id: 42,
      retro_id: 7,
      board_id: 3,
    });
    expect(links).toEqual([
      { label: "Открыть дейлик 42", to: "/cms/standups/42" },
      { label: "Открыть ретро 7", to: "/cms/retro/7" },
      { label: "Открыть отчёт 3", to: "/cms/scope/3" },
    ]);
  });

  it("deduplicates session links from chat_id and session_id", () => {
    const links = extractAuditEntityLinks({ session_id: 10, chat_id: 10 });
    expect(links).toHaveLength(1);
    expect(links[0]?.to).toBe("/cms/sessions?q=10");
  });
});

describe("ACTION_LABELS coverage", () => {
  const backendActions = [
    "app.demo_session",
    "app.session.completed_reopen",
    "app.session.create",
    "app.session.final_estimate",
    "app.session.finish",
    "app.session.invite_regenerate",
    "app.session.jira_sp_sync",
    "app.session.next",
    "app.session.rename",
    "app.session.skip",
    "app.session.start",
    "app.session.summary_export",
    "app.task.ai_summary.generate",
    "app.task.create",
    "app.task.delete",
    "app.task.jira_import",
    "app.task.move",
    "app.task.reorder",
    "app.task.update",
    "cms.access.admin.create",
    "cms.access.admin.update",
    "cms.access.role.create",
    "cms.access.role.update",
    "cms.login",
    "cms.logout",
    "cms.preferences.update",
    "cms.retro.action_item.add",
    "cms.retro.action_item.remove",
    "cms.retro.analyze",
    "cms.retro.create",
    "cms.retro.delete",
    "cms.retro.finalize",
    "cms.retro.group.create",
    "cms.retro.group.delete",
    "cms.retro.group.rename",
    "cms.retro.invite",
    "cms.retro.phase",
    "cms.retro.section.close",
    "cms.retro.section.open",
    "cms.retro.update",
    "cms.scope_board.analyze",
    "cms.scope_board.create",
    "cms.scope_board.delete",
    "cms.scope_board.flow_pace_chart_order_update",
    "cms.scope_board.issue_comment",
    "cms.scope_board.layout_update",
    "cms.scope_board.question_create",
    "cms.scope_board.question_resolve",
    "cms.scope_board.queue_comment",
    "cms.scope_board.queue_due_date_update",
    "cms.scope_board.queue_reorder",
    "cms.scope_board.queue_reset_ranked",
    "cms.scope_board.refresh",
    "cms.scope_board.release_comments_update",
    "cms.scope_board.report_comment",
    "cms.scope_board.todo_create",
    "cms.scope_board.todo_delete",
    "cms.scope_board.todo_update",
    "cms.scope_board.top_item_create",
    "cms.scope_board.top_item_delete",
    "cms.scope_board.update",
    "cms.session.close",
    "cms.session.delete",
    "cms.session.rename",
    "cms.sprint_plan.create",
    "cms.sprint_plan.delete",
    "cms.sprint_plan.update",
    "cms.standup.create",
    "cms.standup.delete",
    "cms.standup.publish",
    "cms.standup.sync_roster",
    "cms.standup.update",
    "cms.standup_roster.update",
    "cms.task.create",
    "cms.task.delete",
    "cms.task.jira_import",
    "cms.task.move",
    "cms.task.reorder",
    "cms.task.update",
    "cms.team.create",
    "cms.team.update",
    "cms.token.revoke",
  ];

  it("has a human label for every backend audit action", () => {
    for (const action of backendActions) {
      expect(ACTION_LABELS[action], `missing label for ${action}`).toBeTruthy();
      expect(labelForAction(action)).not.toBe(action);
    }
  });
});
