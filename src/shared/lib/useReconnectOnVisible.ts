import { useEffect } from "react";

/**
 * Browsers and reverse proxies often suspend or drop WebSockets while a tab is
 * in the background. When the user returns, force a reconnect and/or HTTP
 * catch-up so live boards do not stay stale until a full page reload.
 */
export function useReconnectOnVisible(onVisible: () => void): void {
  useEffect(() => {
    const handle = () => {
      if (document.visibilityState === "visible") {
        onVisible();
      }
    };
    document.addEventListener("visibilitychange", handle);
    window.addEventListener("focus", handle);
    return () => {
      document.removeEventListener("visibilitychange", handle);
      window.removeEventListener("focus", handle);
    };
  }, [onVisible]);
}
