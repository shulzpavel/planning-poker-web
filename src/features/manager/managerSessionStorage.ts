import type { ManagerInvite, ManagerSession, ManagerSessionRef } from "./api/managerTypes";

export const MANAGER_SESSION_STORAGE_KEY = "pp_manager_session";

/** Legacy persisted shape — token/inviteUrl are stripped on read and never written. */
type LegacyStoredManagerSessionRef = ManagerSessionRef & {
  token?: string | null;
  inviteUrl?: string | null;
};

export function readStoredManagerSession(): ManagerSessionRef | null {
  try {
    const raw = localStorage.getItem(MANAGER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyStoredManagerSessionRef;
    if (typeof parsed.chatId !== "number") return null;
    const ref: ManagerSessionRef = {
      chatId: parsed.chatId,
      topicId: parsed.topicId ?? null,
      title: parsed.title ?? "Planning Poker",
      teamId: parsed.teamId ?? null,
    };
    if ("token" in parsed || "inviteUrl" in parsed) {
      persistManagerSessionRef(ref);
    }
    return ref;
  } catch {
    return null;
  }
}

export function persistManagerSessionRef(ref: ManagerSessionRef): ManagerSessionRef {
  localStorage.setItem(MANAGER_SESSION_STORAGE_KEY, JSON.stringify(ref));
  return ref;
}

export function managerSessionRefFromSession(session: ManagerSession): ManagerSessionRef {
  return {
    chatId: session.chat_id,
    topicId: session.topic_id,
    title: session.title,
    teamId: session.team_id ?? null,
  };
}

export function managerInviteFromSession(
  session: Pick<ManagerSession, "token" | "invite_url">,
): ManagerInvite | null {
  if (!session.token || !session.invite_url) return null;
  return { token: session.token, inviteUrl: session.invite_url };
}

export function storeManagerSession(session: ManagerSession): ManagerSessionRef {
  return persistManagerSessionRef(managerSessionRefFromSession(session));
}
