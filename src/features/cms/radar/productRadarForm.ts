import { DEFAULT_PRODUCT_RADAR_JQL } from "../api/cmsClient";

export function validateProductRadarCreate(input: { name: string; jql: string }): { name: string; jql: string } | { error: string } {
  const name = input.name.trim();
  const jql = input.jql.trim();
  if (!name) {
    return { error: "Укажите название радара" };
  }
  if (!jql) {
    return { error: "Укажите JQL-запрос" };
  }
  return { name, jql };
}

export function defaultProductRadarCreateForm() {
  return {
    name: "",
    jql: DEFAULT_PRODUCT_RADAR_JQL,
  };
}

export function needsProductRadarSnapshotRefresh(snapshot: { refreshed_at?: string | null } | null | undefined): boolean {
  if (!snapshot) return true;
  return !String(snapshot.refreshed_at ?? "").trim();
}

export function formatProductRadarUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
