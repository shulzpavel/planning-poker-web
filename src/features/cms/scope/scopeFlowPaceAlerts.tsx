import { Fragment, type ReactNode } from "react";
import { Badge, cn } from "../../../design-system";
import type { ScopeFlowAlert, ScopeFlowPaceChartDetailItem } from "../api/cmsClient";
import {
  buildJiraBrowseUrl,
  flowAlertSeverityLabel,
  flowAlertSeverityTone,
  formatFlowDays,
  formatStatusDurations,
  flowBucketLabel,
  flowBucketTone,
  highlightRoleLabel,
  resolveFlowIssueUrl,
} from "./scopeFlowPaceHelpers";
import { ScopeIncrementalFooter } from "./ScopeIncrementalFooter";
import { useIncrementalList } from "./scopeListPaging";

function alertGroupPanelClass(severity: ScopeFlowAlert["severity"]) {
  switch (severity) {
    case "high":
      return "border-y border-red/25 bg-red/[0.06] p-3 sm:rounded-lg sm:border sm:p-5";
    case "medium":
      return "border-y border-amber/25 bg-amber/[0.06] p-3 sm:rounded-lg sm:border sm:p-5";
    default:
      return "border-y border-blue/20 bg-blue/[0.05] p-3 sm:rounded-lg sm:border sm:p-5";
  }
}

function alertGroupTitleClass(severity: ScopeFlowAlert["severity"]) {
  switch (severity) {
    case "high":
      return "text-red";
    case "medium":
      return "text-amber";
    default:
      return "text-blue";
  }
}

function alertCardClass(severity: ScopeFlowAlert["severity"]) {
  switch (severity) {
    case "high":
      return "border-red/25 bg-surface shadow-sm ring-1 ring-red/10";
    case "medium":
      return "border-amber/25 bg-surface shadow-sm ring-1 ring-amber/10";
    default:
      return "border-blue/20 bg-surface shadow-sm ring-1 ring-blue/10";
  }
}

function alertAccentClass(severity: ScopeFlowAlert["severity"]) {
  switch (severity) {
    case "high":
      return "border-l-red";
    case "medium":
      return "border-l-amber";
    default:
      return "border-l-blue";
  }
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-line/60 bg-bg/80 px-2.5 py-1 text-xs text-ink3">
      {children}
    </span>
  );
}

export function JiraIssueLink({ issueKey, url }: { issueKey: string; url: string | null }) {
  if (!url) {
    return <span className="whitespace-nowrap font-mono text-sm font-semibold text-ink">{issueKey}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-sm font-semibold text-accent hover:underline"
      title={`Открыть ${issueKey} в Jira`}
    >
      {issueKey}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0 opacity-80"
        aria-hidden="true"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}

export function FlowPaceAlertCard({ alert, browseBase }: { alert: ScopeFlowAlert; browseBase?: string | null }) {
  const issueUrl = resolveFlowIssueUrl(alert, browseBase);
  const epicUrl = alert.epic_key ? buildJiraBrowseUrl(alert.epic_key, browseBase) : null;
  const durationsLabel = formatStatusDurations(alert.status_durations);
  const hasIssueKey = Boolean(alert.issue_key);

  return (
    <li
      className={cn(
        "rounded-lg border border-l-4 px-3 py-3 sm:px-5 sm:py-5",
        alertCardClass(alert.severity),
        alertAccentClass(alert.severity),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <Badge className="shrink-0 whitespace-nowrap" tone={flowAlertSeverityTone(alert.severity)}>
            {flowAlertSeverityLabel(alert.severity)}
          </Badge>
          {hasIssueKey ? <JiraIssueLink issueKey={alert.issue_key} url={issueUrl} /> : null}
        </div>
        {alert.days != null ? (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-line/60 bg-bg/90 px-3 py-1 text-xs font-medium tabular-nums text-ink2">
            {formatFlowDays(alert.days)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink">{alert.title}</p>
          {hasIssueKey && alert.summary ? (
            <p className="mt-1.5 text-sm leading-relaxed text-ink2">{alert.summary}</p>
          ) : null}
        </div>

        <p className="text-sm leading-relaxed text-ink3">{alert.detail}</p>

        {alert.criteria ? <p className="text-xs leading-relaxed text-ink4">{alert.criteria}</p> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {alert.status ? <MetaChip>{alert.status}</MetaChip> : null}
          {alert.section_name ? <MetaChip>{alert.section_name}</MetaChip> : null}
          {alert.epic_key ? (
            <MetaChip>
              эпик{" "}
              {epicUrl ? (
                <a href={epicUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {alert.epic_key}
                </a>
              ) : (
                alert.epic_key
              )}
            </MetaChip>
          ) : null}
          {alert.highlight_name ? (
            <MetaChip>
              {highlightRoleLabel(alert.highlight_role)}: {alert.highlight_name}
            </MetaChip>
          ) : null}
        </div>

        {durationsLabel ? (
          <p className="border-t border-line/60 pt-3 text-xs leading-relaxed text-ink4">История: {durationsLabel}</p>
        ) : null}
      </div>
    </li>
  );
}

export function FlowPaceAlertGroup({
  severity,
  title,
  count,
  alerts,
  browseBase,
}: {
  severity: ScopeFlowAlert["severity"];
  title: string;
  count: number;
  alerts: ScopeFlowAlert[];
  browseBase?: string | null;
}) {
  return (
    <section className={alertGroupPanelClass(severity)}>
      <h4 className={cn("text-xs font-bold uppercase tracking-wide", alertGroupTitleClass(severity))}>
        {title} · {count}
      </h4>
      {alerts.length === 0 ? (
        <p className="mt-3 text-sm text-ink4">Нет сигналов в этой группе.</p>
      ) : (
        <FlowPacePaginatedAlerts alerts={alerts} browseBase={browseBase} />
      )}
    </section>
  );
}

function FlowPacePaginatedAlerts({
  alerts,
  browseBase,
}: {
  alerts: ScopeFlowAlert[];
  browseBase?: string | null;
}) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useIncrementalList(alerts);

  return (
    <>
      <ul className="mt-3 space-y-3">
        {visibleItems.map((alert, index) => (
          <FlowPaceAlertCard key={`${alert.kind}-${alert.issue_key || "team"}-${index}`} alert={alert} browseBase={browseBase} />
        ))}
      </ul>
      <ScopeIncrementalFooter
        loadedCount={loadedCount}
        total={total}
        hasMore={hasMore}
        onMore={loadMore}
        itemNoun="сигналов"
      />
    </>
  );
}

function FlowPacePaginatedDetailItems({
  items,
  browseBase,
  tone,
  segmentLabel,
  renderItem,
}: {
  items: ScopeFlowPaceChartDetailItem[];
  browseBase?: string | null;
  tone: ScopeFlowAlert["severity"];
  segmentLabel: string;
  renderItem?: (item: ScopeFlowPaceChartDetailItem, index: number) => ReactNode;
}) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useIncrementalList(items);

  if (total === 0) {
    return <p className="mt-3 text-sm text-ink4">Нет задач в этой группе.</p>;
  }

  return (
    <>
      <ul className="mt-3 space-y-3">
        {visibleItems.map((item, index) =>
          renderItem ? (
            <Fragment key={`${item.issue_key}-${index}`}>{renderItem(item, index)}</Fragment>
          ) : item.alert ? (
            <FlowPaceAlertCard key={`${item.issue_key}-${index}`} alert={item.alert} browseBase={browseBase} />
          ) : (
            <FlowPaceDetailCard
              key={`${item.issue_key}-${index}`}
              tone={item.flow_bucket ? flowBucketTone(item.flow_bucket) : tone}
              badgeLabel={item.flow_bucket ? flowBucketLabel(item.flow_bucket) : segmentLabel}
              issueKey={item.issue_key}
              issueUrl={item.issue_url}
              title={item.metric_label || segmentLabel}
              summary={item.summary}
              detail={item.detail}
              metricValue={item.metric_value}
            />
          ),
        )}
      </ul>
      <ScopeIncrementalFooter
        loadedCount={loadedCount}
        total={total}
        hasMore={hasMore}
        onMore={loadMore}
        itemNoun="задач"
      />
    </>
  );
}

export function FlowPaceDetailGroup({
  tone,
  title,
  count,
  items,
  browseBase,
  renderItem,
}: {
  tone: ScopeFlowAlert["severity"];
  title: string;
  count: number;
  items: ScopeFlowPaceChartDetailItem[];
  browseBase?: string | null;
  renderItem?: (item: ScopeFlowPaceChartDetailItem, index: number) => ReactNode;
}) {
  return (
    <section className={alertGroupPanelClass(tone)}>
      <h4 className={cn("text-xs font-bold uppercase tracking-wide", alertGroupTitleClass(tone))}>
        {title} · {count}
      </h4>
      <FlowPacePaginatedDetailItems
        items={items}
        browseBase={browseBase}
        tone={tone}
        segmentLabel={title}
        renderItem={renderItem}
      />
    </section>
  );
}

export function severityFromSegmentKey(key: string): ScopeFlowAlert["severity"] | null {
  if (key === "high" || key === "medium" || key === "low") return key;
  return null;
}

export function segmentDetailTone(segmentKey: string): ScopeFlowAlert["severity"] {
  if (["high", "slow", "qa_heavy", "older", "late"].includes(segmentKey)) return "high";
  if (["medium", "normal", "last_14d", "unplan"].includes(segmentKey)) return "medium";
  return "low";
}

export function FlowPaceDetailCard({
  tone,
  badgeLabel,
  issueKey,
  issueUrl,
  title,
  summary,
  detail,
  metricValue,
  detailPrimary = false,
}: {
  tone: ScopeFlowAlert["severity"];
  badgeLabel: string;
  issueKey?: string;
  issueUrl?: string | null;
  title: string;
  summary?: string;
  detail?: string;
  metricValue?: string;
  detailPrimary?: boolean;
}) {
  const hasIssueKey = Boolean(issueKey);

  return (
    <li
      className={cn(
        "rounded-lg border border-l-4 px-3 py-3 sm:px-5 sm:py-5",
        alertCardClass(tone),
        alertAccentClass(tone),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <Badge className="shrink-0 whitespace-nowrap" tone={flowAlertSeverityTone(tone)}>
            {badgeLabel}
          </Badge>
          {hasIssueKey && issueKey ? <JiraIssueLink issueKey={issueKey} url={issueUrl ?? null} /> : null}
        </div>
        {metricValue ? (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-line/60 bg-bg/90 px-3 py-1 text-xs font-medium tabular-nums text-ink2">
            {metricValue}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          {hasIssueKey && summary ? <p className="mt-1.5 text-sm leading-relaxed text-ink2">{summary}</p> : null}
        </div>

        {detail ? (
          <p className={cn("text-sm leading-relaxed", detailPrimary ? "font-medium text-ink" : "text-ink3")}>
            {detail}
          </p>
        ) : null}
      </div>
    </li>
  );
}
