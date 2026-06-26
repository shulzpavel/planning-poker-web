import { useMemo, useState } from "react";
import { Badge, cn } from "../../../design-system";
import type { ProductRadarIssue, ProductRadarRefreshProgress, ScopeFlowAlert } from "../api/cmsClient";
import { JiraIssueLink } from "../scope/scopeFlowPaceAlerts";
import { flowAlertSeverityLabel, flowAlertSeverityTone } from "../scope/scopeFlowPaceHelpers";

function formatTimelineDate(value?: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("ru-RU");
}

function IssueTimeline({ issue }: { issue: ProductRadarIssue }) {
  const timeline = issue.drilldown?.timeline ?? issue.timeline ?? [];
  if (!timeline.length) {
    return <p className="text-xs text-ink3">Нет сегментов статуса — обогатите snapshot (partition refresh).</p>;
  }

  const bucketColors: Record<string, string> = {
    in_work: "#3b82f6",
    dev: "#3b82f6",
    in_test: "#8b5cf6",
    test: "#8b5cf6",
    pause: "#f59e0b",
    todo: "#94a3b8",
    done: "#10b981",
    release: "#06b6d4",
  };

  return (
    <ol className="space-y-2">
      {timeline.map((segment, index) => {
        const color = bucketColors[String(segment.bucket || "").toLowerCase()] || "#6366f1";
        return (
          <li
            key={`${segment.status}-${index}`}
            className="rounded-lg border border-line/60 bg-surface/80 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium text-ink">{segment.status || "—"}</span>
                </div>
                <p className="mt-1 text-xs text-ink3">
                  {segment.assignee || "без исполнителя"}
                  {segment.started_at ? ` · с ${formatTimelineDate(segment.started_at)}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {segment.days != null ? `${segment.days.toFixed(1)} дн.` : "—"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function IssueSubtasks({ issue }: { issue: ProductRadarIssue }) {
  const subtasks = issue.drilldown?.subtasks ?? issue.subtasks ?? [];
  if (!subtasks.length) {
    return <p className="text-xs text-ink3">Подзадач нет.</p>;
  }

  return (
    <ul className="space-y-2">
      {subtasks.map((subtask) => (
        <li
          key={subtask.key}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/60 bg-surface/80 px-3 py-2 text-xs"
        >
          <span className="font-mono font-semibold text-ink">{subtask.key}</span>
          <span className="text-ink2">{subtask.status || "—"}</span>
          <span className="text-ink3">{subtask.assignee || "без исполнителя"}</span>
        </li>
      ))}
    </ul>
  );
}

function IssueLinks({ issue }: { issue: ProductRadarIssue }) {
  const links = issue.drilldown?.issue_links ?? issue.issue_links ?? [];
  if (!links.length) {
    return <p className="text-xs text-ink3">Связей нет.</p>;
  }

  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={`${link.relation}-${link.key}`} className="rounded-lg border border-line/60 bg-surface/80 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={link.relation === "blocked_by" ? "danger" : "neutral"}>{link.relation}</Badge>
            <span className="font-mono font-semibold text-ink">{link.key}</span>
            <span className="text-ink2">{link.status || "—"}</span>
            {link.team ? <span className="text-ink3">команда {link.team}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function IssueDrilldownPanel({ issue }: { issue: ProductRadarIssue }) {
  const team = issue.drilldown?.team ?? issue.team;

  return (
    <div className="space-y-5 border-t border-line/70 pt-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <JiraIssueLink issueKey={issue.key} url={issue.url ?? null} />
        <span className="text-ink2">{issue.summary}</span>
        {team ? <Badge tone="neutral">команда {team}</Badge> : null}
        {issue.status ? <Badge tone="info">{issue.status}</Badge> : null}
      </div>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">Таймлайн статусов</h4>
        <IssueTimeline issue={issue} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">Подзадачи</h4>
          <IssueSubtasks issue={issue} />
        </section>
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">Зависимости</h4>
          <IssueLinks issue={issue} />
        </section>
      </div>
    </div>
  );
}

export function ProductRadarSignalsPanel({
  signals,
  issuesByKey,
  selectedKey,
  onSelectKey,
}: {
  signals: ScopeFlowAlert[];
  issuesByKey: Record<string, ProductRadarIssue>;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
}) {
  const grouped = useMemo(() => {
    const buckets: Record<string, ScopeFlowAlert[]> = { high: [], medium: [], low: [] };
    for (const signal of signals) {
      buckets[signal.severity]?.push(signal);
    }
    return buckets;
  }, [signals]);

  if (!signals.length) {
    return <p className="text-sm text-ink3">Сигналов нет — обновите данные из Jira.</p>;
  }

  return (
    <div className="space-y-4">
      {(["high", "medium", "low"] as const).map((severity) => {
        const items = grouped[severity];
        if (!items.length) return null;
        return (
          <section key={severity}>
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={flowAlertSeverityTone(severity)}>{severity.toUpperCase()}</Badge>
              <span className="text-sm text-ink3">{items.length}</span>
            </div>
            <ul className="space-y-2">
              {items.map((alert) => (
                <li key={`${alert.kind}-${alert.issue_key}-${alert.title}`}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-lg border border-line/70 bg-surface px-3 py-3 text-left transition-colors",
                      selectedKey === alert.issue_key ? "ring-2 ring-accent/30" : "hover:bg-bg/50",
                    )}
                    onClick={() => onSelectKey(selectedKey === alert.issue_key ? null : alert.issue_key)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={flowAlertSeverityTone(alert.severity)}>{flowAlertSeverityLabel(alert.severity)}</Badge>
                      <JiraIssueLink issueKey={alert.issue_key} url={alert.issue_url ?? null} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink">{alert.title}</p>
                    <p className="mt-1 text-xs text-ink3">{alert.detail}</p>
                    {alert.blocking_team ? (
                      <p className="mt-1 text-xs text-amber">Блокирует: {alert.blocking_team}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {selectedKey && issuesByKey[selectedKey] ? <IssueDrilldownPanel issue={issuesByKey[selectedKey]} /> : null}
    </div>
  );
}

export function ProductRadarAttentionList({
  issues,
  selectedKey,
  onSelectKey,
}: {
  issues: ProductRadarIssue[];
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (!issues.length) {
    return <p className="text-sm text-ink3">Нет задач для drill-down — дождитесь обогащения snapshot.</p>;
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue) => {
        const open = expandedKey === issue.key || selectedKey === issue.key;
        return (
          <li key={issue.key} className="rounded-lg border border-line/70 bg-bg/30">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
              onClick={() => {
                const next = open ? null : issue.key;
                setExpandedKey(next);
                onSelectKey(next);
              }}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <JiraIssueLink issueKey={issue.key} url={issue.url ?? null} />
                  {issue.team ? <Badge tone="neutral">{issue.team}</Badge> : null}
                </div>
                <p className="truncate text-sm text-ink2">{issue.summary}</p>
              </div>
              <span className="shrink-0 text-xs text-ink3">{open ? "▲" : "▼"}</span>
            </button>
            {open ? (
              <div className="px-3 pb-3">
                <IssueDrilldownPanel issue={issue} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ProductRadarRefreshProgressBar({
  progress,
  enriching,
}: {
  progress: ProductRadarRefreshProgress | null;
  enriching: boolean;
}) {
  if (!enriching || !progress) return null;

  const label =
    progress.status === "complete"
      ? "Обогащение завершено"
      : `Загрузка ${progress.enriched} / ${progress.total} задач (${progress.percent}%)`;

  return (
    <div className="rounded-lg border border-line/70 bg-bg/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-ink3">
        <span>{label}</span>
        <span>партия {progress.partition_size}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line2">
        <div
          className="h-2 rounded-full bg-accent transition-all duration-300"
          style={{ width: `${Math.max(progress.percent, progress.enriched > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}
