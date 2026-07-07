import { useEffect, useRef } from "react";

import { cmsScopeApi, type ScopeBoardRecord } from "../api/cmsClient";

export const SCOPE_PRIORITY_QUEUE_SYNC_INTERVAL_MS = 4_000;

export function buildScopePriorityQueueSyncPatch(record: ScopeBoardRecord): ScopeBoardRecord {
  return {
    ...record,
    snapshot_partial: true,
    snapshot: record.snapshot?.priority_queues
      ? { priority_queues: record.snapshot.priority_queues }
      : null,
    ai_summary: null,
    ai_summary_history: [],
  };
}

export function useScopePriorityQueueSync({
  boardId,
  enabled,
  updatedAt,
  onSync,
  isPaused,
}: {
  boardId: number | null;
  enabled: boolean;
  updatedAt: string | null | undefined;
  onSync: (record: ScopeBoardRecord) => void;
  isPaused: () => boolean;
}): void {
  const updatedAtRef = useRef(updatedAt);
  updatedAtRef.current = updatedAt;
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (!enabled || boardId === null || Number.isNaN(boardId)) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || document.visibilityState !== "visible" || isPausedRef.current()) return;
      try {
        const record = await cmsScopeApi.get(boardId as number);
        if (cancelled || isPausedRef.current()) return;
        if (!record.snapshot?.priority_queues) return;
        if (record.updated_at === updatedAtRef.current) return;
        onSyncRef.current(buildScopePriorityQueueSyncPatch(record));
        updatedAtRef.current = record.updated_at;
      } catch {
        // Best-effort live sync; ignore transient network errors.
      }
    }

    const timer = window.setInterval(() => void tick(), SCOPE_PRIORITY_QUEUE_SYNC_INTERVAL_MS);
    const onVisible = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [boardId, enabled]);
}
