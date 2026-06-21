import { useCallback, useEffect, useRef, useState } from "react";
import { useReconnectOnVisible } from "../shared/lib/useReconnectOnVisible";

function readStoredParticipantId(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export interface UseStoredParticipantIdReturn {
  participantId: string | null;
  setParticipantId: React.Dispatch<React.SetStateAction<string | null>>;
  persistParticipantId: (id: string) => void;
  clearParticipantId: () => void;
}

/** Read/write a participant id in localStorage (web join flows). */
export function useStoredParticipantId(
  storageKey: string,
  initialOverride?: string | null,
): UseStoredParticipantIdReturn {
  const [participantId, setParticipantId] = useState<string | null>(() => {
    if (initialOverride !== undefined) return initialOverride;
    return readStoredParticipantId(storageKey);
  });

  const persistParticipantId = useCallback(
    (id: string) => {
      try {
        localStorage.setItem(storageKey, id);
      } catch {
        // ignore storage errors (private mode, etc.)
      }
      setParticipantId(id);
    },
    [storageKey],
  );

  const clearParticipantId = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
    setParticipantId(null);
  }, [storageKey]);

  return { participantId, setParticipantId, persistParticipantId, clearParticipantId };
}

export interface UseRealtimeChannelOptions {
  enabled?: boolean;
  /** When true, the socket opens only after a participant id exists. */
  connectWhenJoined?: boolean;
  participantId?: string | null;
  buildUrl: () => string;
  onMessage: (message: Record<string, unknown>) => void;
  /** HTTP catch-up after connect / visibility reconnect. */
  refreshState?: () => void | Promise<void>;
  /** Return true to stop reconnecting (e.g. invalid token). */
  onClose?: (event: CloseEvent) => boolean;
  /** Reset exponential backoff when these message types arrive. */
  resetBackoffOnTypes?: string[];
}

export interface UseRealtimeChannelReturn {
  reconnectNow: () => void;
}

/**
 * Shared WebSocket lifecycle: connect, ping ignore, exponential backoff,
 * visibility/focus reconnect. Message handling stays in the caller.
 */
export function useRealtimeChannel({
  enabled = true,
  connectWhenJoined = false,
  participantId = null,
  buildUrl,
  onMessage,
  refreshState,
  onClose,
  resetBackoffOnTypes,
}: UseRealtimeChannelOptions): UseRealtimeChannelReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const unmounted = useRef(false);

  const handleMessage = useCallback(
    (raw: string) => {
      try {
        const msg = JSON.parse(raw) as Record<string, unknown>;
        if (msg.type === "ping") return;
        onMessage(msg);
        if (resetBackoffOnTypes?.includes(String(msg.type))) {
          reconnectDelay.current = 1000;
        }
      } catch {
        // ignore parse errors
      }
    },
    [onMessage, resetBackoffOnTypes],
  );

  const resetBackoff = useCallback(() => {
    reconnectDelay.current = 1000;
  }, []);

  const connect = useCallback(() => {
    if (!enabled || unmounted.current) return;
    if (connectWhenJoined && !participantId) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(buildUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      resetBackoff();
      void refreshState?.();
    };

    ws.onmessage = (ev) => {
      handleMessage(ev.data as string);
    };

    ws.onclose = (ev) => {
      if (unmounted.current) return;
      if (onClose?.(ev)) return;
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, 30000);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [
    buildUrl,
    connectWhenJoined,
    enabled,
    handleMessage,
    onClose,
    participantId,
    refreshState,
    resetBackoff,
  ]);

  const reconnectNow = useCallback(() => {
    if (!enabled || unmounted.current) return;
    if (connectWhenJoined && !participantId) return;
    void refreshState?.();
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    resetBackoff();
    connect();
  }, [connect, connectWhenJoined, enabled, participantId, refreshState, resetBackoff]);

  useReconnectOnVisible(reconnectNow);

  useEffect(() => {
    if (!enabled) return;
    unmounted.current = false;
    if (!connectWhenJoined || participantId) {
      connect();
    }
    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect, connectWhenJoined, enabled, participantId]);

  return { reconnectNow };
}
