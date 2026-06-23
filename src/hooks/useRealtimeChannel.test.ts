// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeChannel } from "./useRealtimeChannel";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  url: string;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
}

describe("useRealtimeChannel", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not reconnect when inline callbacks change on parent re-render", () => {
    const onMessage = vi.fn();

    const { rerender } = renderHook(
      ({ url }) =>
        useRealtimeChannel({
          buildUrl: () => url,
          onMessage,
          resetBackoffOnTypes: ["retro_state"],
        }),
      { initialProps: { url: "ws://example.test/one" } },
    );

    expect(MockWebSocket.instances).toHaveLength(1);

    rerender({ url: "ws://example.test/two" });
    rerender({ url: "ws://example.test/three" });

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe("ws://example.test/one");
  });

  it("reconnects only when enabled flips off and on", () => {
    const onMessage = vi.fn();

    const { rerender } = renderHook(
      ({ enabled }) =>
        useRealtimeChannel({
          enabled,
          buildUrl: () => "ws://example.test/retro",
          onMessage,
        }),
      { initialProps: { enabled: true } },
    );

    expect(MockWebSocket.instances).toHaveLength(1);

    rerender({ enabled: false });
    expect(MockWebSocket.instances[0].readyState).toBe(3);

    rerender({ enabled: true });
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("uses the latest onMessage handler without reconnecting", () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) =>
        useRealtimeChannel({
          buildUrl: () => "ws://example.test/retro",
          onMessage: handler,
        }),
      { initialProps: { handler: first } },
    );

    const socket = MockWebSocket.instances[0];
    rerender({ handler: second });

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ type: "retro_state", state: {} }) });
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
