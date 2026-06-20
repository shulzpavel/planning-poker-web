import { apiUrl } from "../../app/config";

export type SystemStatus = {
  maintenance: {
    active: boolean;
    service: string | null;
  };
};

export const MAINTENANCE_POLL_MS = 8_000;

export async function fetchMaintenanceStatus(): Promise<boolean> {
  const response = await fetch(apiUrl("/system/status"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = (await response.json()) as SystemStatus;
  return Boolean(data.maintenance?.active);
}
