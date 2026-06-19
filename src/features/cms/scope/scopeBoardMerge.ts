import type { ScopeBoardRecord } from "../api/cmsClient";

export function mergeScopeBoardRecord(
  previous: ScopeBoardRecord | null,
  next: ScopeBoardRecord,
): ScopeBoardRecord {
  if (!next.snapshot_partial || !previous) {
    const { snapshot_partial: _partial, ...rest } = next;
    return rest;
  }

  const {
    snapshot_partial: _partial,
    snapshot: patch,
    ai_summary: nextAiSummary,
    ai_summary_history: nextAiHistory,
    ...rest
  } = next;

  return {
    ...previous,
    ...rest,
    ai_summary: nextAiSummary ?? previous.ai_summary,
    ai_summary_history:
      nextAiHistory && nextAiHistory.length > 0 ? nextAiHistory : previous.ai_summary_history,
    snapshot: patch ? { ...(previous.snapshot ?? {}), ...patch } : previous.snapshot,
  };
}
