import { useEffect, useState } from "react";
import { fetchMaintenanceStatus, MAINTENANCE_POLL_MS } from "../shared/lib/systemStatus";

export function useMaintenanceStatus(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const next = await fetchMaintenanceStatus();
        if (!cancelled) {
          setActive(next);
        }
      } catch {
        // Keep the last known state while the API is briefly unavailable.
      }
    }

    void poll();
    timer = window.setInterval(() => {
      void poll();
    }, MAINTENANCE_POLL_MS);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return active;
}
