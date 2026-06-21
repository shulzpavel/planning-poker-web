import { useCallback, useState } from "react";
import { apiUrl, wsUrl } from "../app/config";
import { useRealtimeChannel, useStoredParticipantId } from "./useRealtimeChannel";
import { saveWebIdentity } from "../shared/lib/participantIdentity";

export interface TaskInfo {
  task_id?: string;
  text: string;
  jira_key?: string;
  story_points?: number | null;
  story_points_by_track?: Record<string, number> | null;
  ai_summary?: AiTaskSummary | null;
  /** Jira description body captured at import time. `null`/undefined for
   *  manual tasks or when the import-time fetch came back empty. */
  description?: string | null;
  /** Raw Atlassian Document Format payload for the same description.
   *  When present, the voter UI renders this (with original Jira
   *  formatting) instead of the plain-text `description` fallback.
   *  `unknown` rather than a strict ADF type — the renderer treats any
   *  non-doc shape as opaque and falls back to plain text. */
  description_adf?: unknown;
  /** Sanitized HTML from Jira renderedFields — preferred for display. */
  description_html?: string | null;
  index: number;
  total: number;
}

export interface AiSummaryJiraExport {
  status: "ok" | "error";
  hash?: string;
  comment_id?: string | null;
  exported_at?: string;
  error?: string;
}

export interface AiTaskSummary {
  description: string;
  methods: string[];
  complexity: string;
  sp_dev?: number;
  sp_test?: number;
  sp_final?: number;
  scale_label?: string;
  confidence?: "low" | "medium" | "high";
  assumptions?: string[];
  estimation_model?: string;
  generated_at?: string;
  source?: string;
  jira_export?: AiSummaryJiraExport;
}

export type ParticipantRole = "backend" | "frontend" | "qa";

export interface ParticipantStatus {
  name: string;
  role?: ParticipantRole;
  voted: boolean;
  /** Live vote value (null until the participant casts a vote). Was previously
   *  hidden until the manager pressed Reveal — that stage has been removed,
   *  so the server now always sends the real value. */
  value?: string | null;
  track?: string | null;
  track_label?: string | null;
}

export interface VoteResult {
  name: string;
  value: string;
  track?: string;
  track_label?: string;
}

export interface EstimationTrackInfo {
  key: string;
  label: string;
}

export type Phase = "joining" | "waiting" | "voting" | "results" | "complete";

export interface WebSessionState {
  task: TaskInfo | null;
  phase: Phase;
  participants: ParticipantStatus[];
  results?: VoteResult[];
  track_results?: Record<string, VoteResult[]> | null;
  estimation_mode?: string;
  estimation_mode_label?: string;
  estimation_mode_description?: string;
  estimation_tracks?: EstimationTrackInfo[];
}

interface UseSessionReturn {
  state: WebSessionState | null;
  phase: Phase;
  participantId: string | null;
  join: (name: string, role: ParticipantRole) => Promise<void>;
  /** Returns true on a successful vote, false on server-side rejection. */
  vote: (value: string, track?: string | null) => Promise<boolean>;
  error: string | null;
}

export function useSession(token: string): UseSessionReturn {
  const pidKey = `pp_pid_${token}`;
  const { participantId, persistParticipantId, clearParticipantId } =
    useStoredParticipantId(pidKey);
  const [state, setState] = useState<WebSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phase: Phase = participantId === null ? "joining" : (state?.phase ?? "waiting");

  const refreshState = useCallback(async () => {
    try {
      const resp = await fetch(apiUrl(`/web/state/${encodeURIComponent(token)}`));
      if (!resp.ok) return;
      setState((await resp.json()) as WebSessionState);
    } catch {
      // WebSocket reconnect will keep retrying; this is only catch-up.
    }
  }, [token]);

  const handleMessage = useCallback((msg: Record<string, unknown>) => {
    if (msg.type === "session_state") {
      setState(msg.state as WebSessionState);
    } else if (msg.type === "vote_cast") {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.name === msg.voter_name
              ? { ...p, voted: true, value: (msg.voter_value as string | null | undefined) ?? p.value ?? null }
              : p,
          ),
        };
      });
    } else if (msg.type === "results") {
      setState((prev) => ({
        ...(prev ?? { task: null, participants: [] }),
        phase: "results",
        results: msg.votes as VoteResult[],
        track_results: (msg.track_results as Record<string, VoteResult[]> | null | undefined) ?? prev?.track_results ?? null,
        task: (msg.task as TaskInfo | null | undefined) ?? prev?.task ?? null,
        estimation_mode: (msg.estimation_mode as string | undefined) ?? prev?.estimation_mode,
        estimation_mode_label: (msg.estimation_mode_label as string | undefined) ?? prev?.estimation_mode_label,
        estimation_mode_description: (msg.estimation_mode_description as string | undefined) ?? prev?.estimation_mode_description,
        estimation_tracks: (msg.estimation_tracks as EstimationTrackInfo[] | undefined) ?? prev?.estimation_tracks,
      }));
    } else if (msg.type === "next_task") {
      setState((prev) => ({
        ...(prev ?? { participants: [] }),
        phase: "voting",
        task: msg.task as TaskInfo,
        results: undefined,
        participants: (prev?.participants ?? []).map((p) => ({
          ...p,
          voted: false,
          value: null,
        })),
      }));
    } else if (msg.type === "batch_complete") {
      setState((prev) => ({
        ...(prev ?? { task: null, participants: [] }),
        phase: "complete",
      }));
    }
  }, []);

  useRealtimeChannel({
    connectWhenJoined: true,
    participantId,
    buildUrl: () => wsUrl(token),
    onMessage: handleMessage,
    refreshState,
    resetBackoffOnTypes: ["session_state"],
    onClose: (ev) => {
      if (ev.code !== 4004) return false;
      clearParticipantId();
      setState(null);
      setError("Сессия истекла. Откройте ссылку заново.");
      return true;
    },
  });

  const join = useCallback(
    async (name: string, role: ParticipantRole) => {
      setError(null);
      let resp: Response;
      try {
        resp = await fetch(apiUrl("/web/join"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, name, role }),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Network error";
        setError(message);
        throw new Error(message);
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const message = (data as { detail?: string }).detail ?? "Failed to join";
        setError(message);
        throw new Error(message);
      }
      const data = (await resp.json()) as { participant_id: string; session: WebSessionState };
      saveWebIdentity(name, role);
      persistParticipantId(data.participant_id);
      setState(data.session);
    },
    [token, persistParticipantId]
  );

  const vote = useCallback(
    async (value: string, track?: string | null): Promise<boolean> => {
      if (!participantId) return false;
      setError(null);
      let resp: Response;
      try {
        resp = await fetch(apiUrl("/web/vote"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            participant_id: participantId,
            value,
            track: track ?? undefined,
          }),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
        return false;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError((data as { detail?: string }).detail ?? "Vote failed");
        if (resp.status === 403 || resp.status === 404) {
          clearParticipantId();
          setState(null);
        }
        return false;
      }
      return true;
    },
    [token, participantId, clearParticipantId]
  );

  return { state, phase, participantId, join, vote, error };
}
