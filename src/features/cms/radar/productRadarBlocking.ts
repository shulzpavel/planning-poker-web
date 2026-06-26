import type {
  ProductRadarAnalytics,
  ProductRadarInsight,
  ProductRadarSnapshot,
  ProductRadarTeamBlockingRow,
  ScopeFlowAlert,
} from "../api/cmsClient";
import { productRadarTeamBlocking, resolveProductRadarInsightsAnalytics } from "./productRadarPeriod";

function signalToInsight(signal: ScopeFlowAlert): ProductRadarInsight {
  return {
    kind: signal.kind,
    severity: signal.severity,
    score: signal.severity === "high" ? 85 : signal.severity === "medium" ? 55 : 30,
    issue_key: signal.issue_key,
    summary: signal.summary,
    issue_url: signal.issue_url,
    title: signal.title,
    detail: signal.detail,
    parent_team: signal.blocked_team,
    blocked_team: signal.blocked_team,
    blocker_key: signal.blocker_key,
    blocker_team: signal.blocking_team,
    blocker_status: signal.status,
    days: signal.days,
    metric_label: "Блокирует",
    metric_value: signal.blocking_team || signal.blocker_key || "—",
  };
}

function teamBlockingFromSignals(signals: ScopeFlowAlert[]): {
  teams?: ProductRadarTeamBlockingRow[];
  total_blocks?: number;
} {
  const cross = signals.filter((signal) => signal.kind === "cross_team_block");
  if (!cross.length) return { teams: [], total_blocks: 0 };

  const stats = new Map<string, ProductRadarTeamBlockingRow>();
  for (const signal of cross) {
    const team = signal.blocking_team || signal.blocker_key || "—";
    const row =
      stats.get(team) ??
      ({
        key: team,
        label: team,
        value: 0,
        color: "#ef4444",
        blocked_teams: [],
        items: [],
      } satisfies ProductRadarTeamBlockingRow);
    row.value = (row.value ?? 0) + 1;
    const blockedTeam = signal.blocked_team || "";
    if (blockedTeam && !row.blocked_teams?.includes(blockedTeam)) {
      row.blocked_teams = [...(row.blocked_teams ?? []), blockedTeam];
    }
    row.items = [
      ...(row.items ?? []),
      {
        issue_key: signal.issue_key,
        summary: signal.summary,
        issue_url: signal.issue_url,
        detail: signal.detail,
        blocked_team: blockedTeam,
        blocker_key: signal.blocker_key,
        blocker_status: signal.status,
      },
    ];
    stats.set(team, row);
  }

  return {
    teams: [...stats.values()].sort(
      (a, b) => (b.value ?? 0) - (a.value ?? 0) || String(a.label).localeCompare(String(b.label), "ru"),
    ),
    total_blocks: cross.length,
  };
}

function mergeCrossTeamInsights(
  insights: ProductRadarInsight[],
  crossSignals: ScopeFlowAlert[],
): ProductRadarInsight[] {
  const merged = new Map<string, ProductRadarInsight>();
  for (const insight of insights) {
    merged.set(`${insight.kind}:${insight.issue_key}:${insight.blocker_key ?? ""}`, insight);
  }
  for (const signal of crossSignals.map(signalToInsight)) {
    merged.set(`${signal.kind}:${signal.issue_key}:${signal.blocker_key ?? ""}`, signal);
  }
  return [...merged.values()];
}

export function resolveProductRadarBlocking(snapshot?: ProductRadarSnapshot | null): {
  insights: ProductRadarInsight[];
  teamBlocking?: { teams?: ProductRadarTeamBlockingRow[]; total_blocks?: number };
} {
  const periodAnalytics = resolveProductRadarInsightsAnalytics(snapshot?.analytics);
  const crossSignals = (snapshot?.signals ?? []).filter((signal) => signal.kind === "cross_team_block");
  let insights = periodAnalytics?.insights ?? [];
  let teamBlocking = productRadarTeamBlocking(periodAnalytics);

  const hasAnalyticsBlocking =
    (teamBlocking?.total_blocks ?? 0) > 0 ||
    insights.some((insight) => insight.kind === "cross_team_block" || insight.blocker_key);

  if (!hasAnalyticsBlocking && crossSignals.length) {
    return {
      insights: crossSignals.map(signalToInsight),
      teamBlocking: teamBlockingFromSignals(crossSignals),
    };
  }

  if (crossSignals.length) {
    insights = mergeCrossTeamInsights(insights, crossSignals);
    if ((teamBlocking?.total_blocks ?? 0) === 0) {
      teamBlocking = teamBlockingFromSignals(crossSignals);
    }
  }

  return { insights, teamBlocking };
}

export function resolveProductRadarBlockingFromAnalytics(analytics?: ProductRadarAnalytics | null) {
  return resolveProductRadarBlocking(analytics ? { analytics } : null);
}
