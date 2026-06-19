import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MANAGER_SESSION_STORAGE_KEY,
  managerInviteFromSession,
  managerSessionRefFromSession,
  persistManagerSessionRef,
  readStoredManagerSession,
  storeManagerSession,
} from "./managerSessionStorage";
import type { ManagerSession } from "./api/managerTypes";

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("managerSessionStorage", () => {
  it("persists only chat metadata, never token or inviteUrl", () => {
    const storage = makeStorage();
    vi.stubGlobal("localStorage", storage);

    const session = {
      chat_id: 42,
      topic_id: 7,
      title: "Sprint 12",
      team_id: 3,
      token: "secret-token",
      invite_url: "/s/secret-token",
    } as ManagerSession;

    storeManagerSession(session);

    const raw = storage.getItem(MANAGER_SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    expect(parsed).toEqual({
      chatId: 42,
      topicId: 7,
      title: "Sprint 12",
      teamId: 3,
    });
    expect(parsed).not.toHaveProperty("token");
    expect(parsed).not.toHaveProperty("inviteUrl");
  });

  it("strips legacy token fields on read and rewrites storage", () => {
    const storage = makeStorage();
    storage.setItem(
      MANAGER_SESSION_STORAGE_KEY,
      JSON.stringify({
        chatId: 99,
        topicId: null,
        title: "Legacy",
        token: "old-token",
        inviteUrl: "/s/old-token",
      }),
    );
    vi.stubGlobal("localStorage", storage);

    expect(readStoredManagerSession()).toEqual({
      chatId: 99,
      topicId: null,
      title: "Legacy",
      teamId: null,
    });

    const migrated = JSON.parse(storage.getItem(MANAGER_SESSION_STORAGE_KEY)!);
    expect(migrated).not.toHaveProperty("token");
    expect(migrated).not.toHaveProperty("inviteUrl");
  });

  it("maps session payloads to in-memory invite credentials", () => {
    expect(
      managerInviteFromSession({ token: null, invite_url: "/s/x" }),
    ).toBeNull();
    expect(
      managerInviteFromSession({ token: "abc", invite_url: "/s/abc" }),
    ).toEqual({ token: "abc", inviteUrl: "/s/abc" });
  });

  it("round-trips ref fields through persistManagerSessionRef", () => {
    const storage = makeStorage();
    vi.stubGlobal("localStorage", storage);

    const ref = persistManagerSessionRef({
      chatId: 1,
      topicId: 2,
      title: "Round trip",
      teamId: 5,
    });

    expect(ref).toEqual(managerSessionRefFromSession({
      chat_id: 1,
      topic_id: 2,
      title: "Round trip",
      team_id: 5,
    } as ManagerSession));
    expect(readStoredManagerSession()).toEqual(ref);
  });
});
