import { Button, cn } from "../../../design-system";
import type { ReactNode } from "react";
import type { ProductRadarDetailItem } from "../api/cmsClient";
import { JiraIssueLink } from "../scope/scopeFlowPaceAlerts";
import { useListDisplayWindow } from "../scope/scopeListPaging";

export type ChartDetailSection =
  | "team_blocking"
  | "closures"
  | "closure_weeks"
  | "phase_time"
  | "load_by_team";

export function ChartDetailInlineList({
  items,
  renderExtra,
}: {
  items: ProductRadarDetailItem[];
  renderExtra?: (item: ProductRadarDetailItem) => ReactNode;
}) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useListDisplayWindow(items);

  if (!items.length) {
    return <p className="text-sm text-ink3">Нет детализации для выбранного среза.</p>;
  }

  return (
    <div>
      <ul className="space-y-3">
        {visibleItems.map((item) => (
          <li
            key={`${item.issue_key}-${item.blocker_key || ""}-${item.resolved_at || ""}`}
            className={cn("rounded-lg border border-line/60 bg-surface px-4 py-3 shadow-sm")}
          >
            <div className="flex flex-wrap items-center gap-3">
              {item.issue_key ? <JiraIssueLink issueKey={item.issue_key} url={item.issue_url ?? null} /> : null}
              {item.team ? <span className="rounded-md bg-bg/60 px-2 py-0.5 text-xs text-ink3">{item.team}</span> : null}
              {item.metric_label && item.metric_value ? (
                <span className="ml-auto text-right text-xs">
                  <span className="text-ink3">{item.metric_label}: </span>
                  <span className="font-semibold tabular-nums text-ink">{item.metric_value}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{item.summary}</p>
            {item.detail ? <p className="mt-2 text-sm text-ink3">{item.detail}</p> : null}
            {renderExtra ? renderExtra(item) : null}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between text-sm text-ink3">
        <span>
          Показано {loadedCount} из {total}
        </span>
        {hasMore ? (
          <Button type="button" size="sm" variant="secondary" onClick={loadMore}>
            Ещё
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ProductRadarChartDetailPanel({
  title,
  subtitle,
  items,
  onClose,
  renderExtra,
}: {
  title: string;
  subtitle?: string;
  items: ProductRadarDetailItem[];
  onClose?: () => void;
  renderExtra?: (item: ProductRadarDetailItem) => ReactNode;
}) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useListDisplayWindow(items);

  if (!items.length) {
    return (
      <div className="rounded-xl border border-line/70 bg-bg/20 p-6">
        <p className="text-sm text-ink3">Нет детализации для выбранного среза.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line/70 bg-bg/20 p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-ink">{title}</h4>
          {subtitle ? <p className="text-sm text-ink3">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        ) : null}
      </div>
      <ul className="space-y-3">
        {visibleItems.map((item) => (
          <li
            key={`${item.issue_key}-${item.blocker_key || ""}-${item.resolved_at || ""}`}
            className={cn("rounded-xl border border-line/60 bg-surface px-4 py-4 shadow-sm")}
          >
            <div className="flex flex-wrap items-center gap-3">
              {item.issue_key ? <JiraIssueLink issueKey={item.issue_key} url={item.issue_url ?? null} /> : null}
              {item.team ? <span className="rounded-md bg-bg/60 px-2 py-0.5 text-xs text-ink3">{item.team}</span> : null}
              {item.metric_label && item.metric_value ? (
                <span className="ml-auto text-right text-xs">
                  <span className="text-ink3">{item.metric_label}: </span>
                  <span className="font-semibold tabular-nums text-ink">{item.metric_value}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink2">{item.summary}</p>
            {item.detail ? <p className="mt-2 text-sm text-ink3">{item.detail}</p> : null}
            {renderExtra ? renderExtra(item) : null}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between text-sm text-ink3">
        <span>
          Показано {loadedCount} из {total}
        </span>
        {hasMore ? (
          <Button type="button" size="sm" variant="secondary" onClick={loadMore}>
            Ещё
          </Button>
        ) : null}
      </div>
    </div>
  );
}
