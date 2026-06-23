import { describe, expect, it } from "vitest";
import {
  collectBlockerItems,
  countStandupBlockers,
  defaultStandupsListToDate,
  endOfMonthIsoDate,
  isDueSoonOrOverdue,
  localIsoDate,
  mergeRosterMembersIntoPayload,
  sanitizeStandupPayload,
  standupPayloadSaveError,
} from "./standupsLogic";
import type { StandupPayload } from "../api/cmsClient";

const payload: StandupPayload = {
  participants: [
    {
      id: "p1",
      name: "Alice",
      role: "front",
      present: true,
      items: [
        { id: "i1", task_title: "Task", track: "blocker", comment: "waiting review" },
        { id: "i2", task_title: "Today", track: "today", due_date: "2026-06-20" },
      ],
    },
  ],
};

describe("standupsLogic", () => {
  it("counts blockers across participants", () => {
    expect(countStandupBlockers(payload)).toBe(1);
  });

  it("collects blocker rows with participant context", () => {
    expect(collectBlockerItems(payload)).toHaveLength(1);
    expect(collectBlockerItems(payload)[0]?.participantName).toBe("Alice");
  });

  it("flags overdue due dates", () => {
    expect(isDueSoonOrOverdue("2026-06-20")).toBe(true);
    expect(isDueSoonOrOverdue("2099-01-01")).toBe(false);
  });

  it("drops blank task rows before save", () => {
    const sanitized = sanitizeStandupPayload({
      participants: [
        {
          id: "p1",
          name: "Alice",
          role: "front",
          present: true,
          items: [
            { id: "i1", task_title: "", track: "today" },
            { id: "i2", task_title: "Ship API", track: "today" },
            { id: "i3", task_title: "", jira_key: "FLEX-9", track: "today" },
          ],
        },
      ],
    });
    expect(sanitized.participants[0]?.items).toHaveLength(2);
    expect(sanitized.participants[0]?.items[0]?.task_title).toBe("Ship API");
    expect(sanitized.participants[0]?.items[1]?.task_title).toBe("FLEX-9");
  });

  it("uses local calendar dates for list filters", () => {
    const reference = new Date(2026, 5, 24, 1, 0, 0);
    expect(localIsoDate(reference)).toBe("2026-06-24");
    expect(endOfMonthIsoDate(reference)).toBe("2026-06-30");
    expect(defaultStandupsListToDate(reference)).toBe("2026-06-30");
  });

  it("merges active roster members without removing existing participants", () => {
    const payload = {
      participants: [{ id: "m1", name: "Alice", role: "front" as const, present: true, items: [] }],
    };
    const merged = mergeRosterMembersIntoPayload(payload, [
      { id: "m1", name: "Alice", role: "front", active: true },
      { id: "m2", name: "Bob", role: "back", active: true },
      { id: "m3", name: "Inactive", role: "qa", active: false },
    ]);
    expect(merged.participants).toHaveLength(2);
    expect(merged.participants.map((participant) => participant.name)).toEqual(["Alice", "Bob"]);
  });

  it("requires blocker comment when task title is filled", () => {
    const message = standupPayloadSaveError({
      participants: [
        {
          id: "p1",
          name: "Alice",
          role: "front",
          present: true,
          items: [{ id: "i1", task_title: "Blocked deploy", track: "blocker", comment: "" }],
        },
      ],
    });
    expect(message).toMatch(/комментарий/i);
  });
});
