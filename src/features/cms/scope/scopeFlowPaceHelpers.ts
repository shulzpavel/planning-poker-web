import type { ScopeFlowAlert, ScopeFlowPaceStatus } from "../api/cmsClient";

export const FLOW_PACE_TEAM_SLUGS = new Set(["igaming-rip"]);

export function normalizeScopeTeamSlug(slug: string | null | undefined): string {
  return (slug ?? "").trim().toLowerCase();
}

export function isFlowPaceTeam(team: { slug?: string; name?: string } | null | undefined): boolean {
  const slug = normalizeScopeTeamSlug(team?.slug);
  if (FLOW_PACE_TEAM_SLUGS.has(slug)) return true;
  const name = (team?.name ?? "").trim().toLowerCase();
  return name.includes("igaming rip") || name === "igaming rip";
}

export function shouldShowFlowPaceBlock(
  team: { slug?: string; name?: string } | null | undefined,
  flowPace?: { enabled?: boolean } | null,
): boolean {
  return isFlowPaceTeam(team) || Boolean(flowPace?.enabled);
}

export function flowPaceStatusLabel(status: ScopeFlowPaceStatus): string {
  switch (status) {
    case "critical":
      return "Критично";
    case "attention":
      return "Внимание";
    default:
      return "Норма";
  }
}

export function flowAlertSeverityLabel(severity: ScopeFlowAlert["severity"]): string {
  switch (severity) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

export function flowAlertSeverityTone(severity: ScopeFlowAlert["severity"]): "danger" | "warning" | "info" {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "info";
}

export function flowPaceStatusTone(status: ScopeFlowPaceStatus): "success" | "warning" | "danger" {
  if (status === "critical") return "danger";
  if (status === "attention") return "warning";
  return "success";
}

export function highlightRoleLabel(role: string | undefined): string {
  switch (role) {
    case "qa":
      return "QA";
    case "back":
      return "Back";
    case "front":
      return "Front";
    case "dev":
      return "Dev";
    case "release":
      return "Release";
    case "lead":
      return "Lead";
    case "team":
      return "Команда";
    default:
      return role?.trim() || "";
  }
}

export function formatFlowDays(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 10) / 10} дн.`;
}

export function formatStatusDurations(durations: Record<string, number> | undefined): string {
  if (!durations) return "";
  return Object.entries(durations)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([status, days]) => `${status}: ${formatFlowDays(days)}`)
    .join(" · ");
}

export function buildJiraBrowseUrl(key: string, browseBase: string | null | undefined): string | null {
  const trimmedKey = key.trim();
  const base = (browseBase ?? "").trim().replace(/\/$/, "");
  if (!trimmedKey || !base) return null;
  return `${base}/${trimmedKey}`;
}

export function resolveFlowIssueUrl(
  alert: Pick<ScopeFlowAlert, "issue_key" | "issue_url" | "epic_key">,
  browseBase?: string | null,
): string | null {
  const direct = (alert.issue_url ?? "").trim();
  if (direct) return direct;
  const key = (alert.issue_key || alert.epic_key || "").trim();
  return buildJiraBrowseUrl(key, browseBase);
}
