import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, cn } from "../../../design-system";
import type {
  ProductRadarAnalytics,
  ProductRadarAnalyticsPeriod,
  ProductRadarBarItem,
  ProductRadarDetailItem,
  ProductRadarIssue,
  ProductRadarPeriodAnalytics,
} from "../api/cmsClient";
import { ChartDetailInlineList } from "./ProductRadarChartDetail";
import { buildClosureBucketDetails, closureBucketTitle } from "./productRadarClosureDetails";
import {
  buildStatusAgeIssueDetails,
  resolveStatusAgeBuckets,
  type StatusAgeBucket,
} from "./productRadarStatusAge";

const PERIOD_OPTIONS: Array<{ id: ProductRadarAnalyticsPeriod; label: string }> = [
  { id: "month", label: "Месяц" },
  { id: "quarter", label: "Квартал" },
  { id: "all", label: "Всё время" },
];

const PERIOD_LABEL_BY_ID: Record<ProductRadarAnalyticsPeriod, string> = {
  month: "Месяц",
  quarter: "Квартал",
  all: "Всё время",
};

function emptyPhaseTotals() {
  return { dev: 0, test: 0, pause: 0, todo: 0, other: 0 };
}

function normalizeThroughput(
  throughput: ProductRadarPeriodAnalytics["throughput"] | ProductRadarAnalytics["throughput"],
): NonNullable<ProductRadarPeriodAnalytics["throughput"]> {
  const done = throughput?.done_in_period ?? throughput?.done_7d ?? 0;
  const target = throughput?.target_in_period ?? throughput?.target_per_week ?? 3;
  return {
    wip: throughput?.wip ?? 0,
    active: throughput?.active ?? 0,
    done_in_period: done,
    done_sp_in_period: throughput?.done_sp_in_period ?? 0,
    done_7d: throughput?.done_7d,
    done_14d: throughput?.done_14d,
    target_in_period: target,
    target_per_week: throughput?.target_per_week ?? Math.max(1, target),
    ratio: throughput?.ratio ?? (target > 0 ? done / target : 0),
    period_days: throughput?.period_days ?? 30,
  };
}

function makePeriodBundle(
  analytics: ProductRadarAnalytics,
  period: ProductRadarAnalyticsPeriod,
): ProductRadarPeriodAnalytics {
  const nested = analytics.periods?.[period];
  if (nested?.label) {
    return {
      ...nested,
      throughput: normalizeThroughput(nested.throughput),
      phase_totals: nested.phase_totals ?? emptyPhaseTotals(),
      load_by_team: nested.load_by_team ?? [],
      status_age: nested.status_age ?? [],
      closure_trend: nested.closure_trend ?? [],
      chart_details: nested.chart_details ?? analytics.chart_details,
      insights: nested.insights ?? [],
      team_blocking: nested.team_blocking ?? analytics.team_blocking,
    };
  }

  const source = nested ?? analytics;
  return {
    period,
    label: PERIOD_LABEL_BY_ID[period],
    issue_count: source.issue_count ?? analytics.issue_count ?? 0,
    active_count: source.active_count ?? analytics.active_count ?? 0,
    insights: source.insights ?? analytics.insights ?? [],
    team_blocking: source.team_blocking ?? analytics.team_blocking,
    release_contour: source.release_contour ?? analytics.release_contour,
    load_by_team: source.load_by_team ?? analytics.load_by_team ?? [],
    status_age: source.status_age ?? analytics.status_age ?? [],
    phase_totals: source.phase_totals ?? analytics.phase_totals ?? emptyPhaseTotals(),
    closure_trend: source.closure_trend ?? analytics.closure_trend ?? [],
    chart_details: source.chart_details ?? analytics.chart_details,
    throughput: normalizeThroughput(source.throughput ?? analytics.throughput),
  };
}

function normalizeAnalytics(analytics: ProductRadarAnalytics): ProductRadarAnalytics {
  return {
    ...analytics,
    default_period: analytics.default_period ?? "month",
    periods: {
      month: makePeriodBundle(analytics, "month"),
      quarter: makePeriodBundle(analytics, "quarter"),
      all: makePeriodBundle(analytics, "all"),
    },
  };
}

function sortBars(items: ProductRadarBarItem[]) {
  return [...items].sort(
    (a, b) => (b.value ?? 0) - (a.value ?? 0) || String(a.label ?? "").localeCompare(String(b.label ?? ""), "ru"),
  );
}

function resolvePeriodAnalytics(
  analytics: ProductRadarAnalytics | null | undefined,
  period: ProductRadarAnalyticsPeriod,
): ProductRadarPeriodAnalytics | null {
  if (!analytics) return null;
  return normalizeAnalytics(analytics).periods?.[period] ?? null;
}

export { resolvePeriodAnalytics };

export function AnalyticsPeriodPicker({
  period,
  onChange,
}: {
  period: ProductRadarAnalyticsPeriod;
  onChange: (period: ProductRadarAnalyticsPeriod) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.id}
          type="button"
          size="sm"
          variant={period === option.id ? "primary" : "secondary"}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function ReleaseContourTimeline({ contour }: { contour: ProductRadarPeriodAnalytics["release_contour"] }) {
  const stages = contour?.stages ?? [];
  const activeStages = stages.filter((stage) => stage.count > 0);
  const total = Math.max(contour?.total_active ?? 0, 1);

  if (!stages.length) {
    return <p className="text-sm text-ink3">Нет активных задач для релизного контура.</p>;
  }

  return (
    <div className="min-w-0 space-y-4">
      {activeStages.length > 0 ? (
        <div
          className="flex h-4 w-full min-w-0 overflow-hidden rounded-full border border-line/60 bg-line2/40"
          role="img"
          aria-label="Распределение задач по этапам релизного контура"
        >
          {activeStages.map((stage) => (
            <div
              key={stage.key}
              className="h-full shrink-0 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${Math.max((stage.count / total) * 100, 4)}%`,
                backgroundColor: stage.color,
              }}
              title={`${stage.label}: ${stage.count} задач, ${stage.sp} SP, ср. ${stage.avg_days} дн.`}
            />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className="min-w-0 rounded-lg border border-line/60 bg-surface/80 p-3"
            title={`${stage.label}: ${stage.count} задач, ${stage.sp} SP, ср. ${stage.avg_days} дн.`}
          >
            <div className="mb-2 flex min-w-0 items-start gap-2">
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-ink">{stage.label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-ink">{stage.count}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink3">
              {stage.sp} SP · ср. {stage.avg_days} дн.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

type ClosureMonthGroup = {
  monthKey: string;
  monthLabel: string;
  items: ProductRadarBarItem[];
};

function groupClosureByMonth(items: ProductRadarBarItem[]): ClosureMonthGroup[] {
  const groups: ClosureMonthGroup[] = [];
  for (const item of items) {
    const monthKey = item.month_key ?? item.key.slice(0, 7);
    const monthLabel = item.month_label ?? monthKey;
    const last = groups[groups.length - 1];
    if (!last || last.monthKey !== monthKey) {
      groups.push({ monthKey, monthLabel, items: [item] });
    } else {
      last.items.push(item);
    }
  }
  return groups;
}

function ClosureDetailPanel({
  bucket,
  granularity,
  items,
}: {
  bucket: ProductRadarBarItem;
  granularity: "day" | "month";
  items: ProductRadarDetailItem[];
}) {
  return (
    <div className="rounded-xl border border-line/70 bg-surface/50 p-4">
      <p className="mb-4 text-xs font-medium text-ink2">
        {closureBucketTitle(bucket, granularity)} · {bucket.value} задач
      </p>
      <ChartDetailInlineList
        items={items}
        renderExtra={(item) => (item.team ? <p className="mt-2 text-xs text-ink3">Команда: {item.team}</p> : null)}
      />
    </div>
  );
}

function ClosureBar({
  item,
  max,
  selected,
  onSelect,
  titlePrefix,
}: {
  item: ProductRadarBarItem;
  max: number;
  selected: boolean;
  onSelect?: (item: ProductRadarBarItem) => void;
  titlePrefix?: string;
}) {
  const active = item.value > 0;
  const height = Math.max(active ? 10 : 3, (item.value / max) * 112);
  const title = titlePrefix
    ? `${titlePrefix} ${item.label}: ${item.value} задач${item.sp != null ? ` · ${item.sp} SP` : ""}`
    : active
      ? `${item.label}: ${item.value} задач${item.sp != null ? ` · ${item.sp} SP` : ""}`
      : `${item.label}: 0`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className={cn(
        "group flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 px-0 py-1 text-center transition-colors",
        onSelect ? "cursor-pointer" : "cursor-default",
      )}
      title={title}
      aria-pressed={selected}
    >
      {active ? (
        <span className="text-[9px] font-semibold tabular-nums text-ink sm:text-[10px]">{item.value}</span>
      ) : (
        <span className="h-[9px] sm:h-[10px]" />
      )}
      <div
        className={cn(
          "w-full rounded-t-sm transition-all sm:rounded-t-md",
          active
            ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm group-hover:from-emerald-500 group-hover:to-emerald-300"
            : "bg-line2/80",
        )}
        style={{ height }}
      />
      <span
        className={cn(
          "w-full truncate text-[7px] leading-none sm:text-[8px]",
          selected ? "font-bold text-accent" : "text-ink3",
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

function ClosureMonthSection({
  group,
  max,
  selectedKey,
  granularity,
  issuesByKey,
  closureDetails,
  onSelect,
}: {
  group: ClosureMonthGroup;
  max: number;
  selectedKey: string | null;
  granularity: "day" | "month";
  issuesByKey: Record<string, ProductRadarIssue>;
  closureDetails?: ProductRadarDetailItem[];
  onSelect: (key: string | null) => void;
}) {
  const selectedBucket = group.items.find((item) => item.key === selectedKey) ?? null;
  const selectedDetailItems = useMemo(
    () =>
      selectedBucket ? buildClosureBucketDetails(selectedBucket, closureDetails, issuesByKey, granularity) : [],
    [closureDetails, granularity, issuesByKey, selectedBucket],
  );

  const handleSelect = (item: ProductRadarBarItem) => {
    onSelect(selectedKey === item.key ? null : item.key);
  };

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-semibold text-ink">{group.monthLabel}</h4>
      <div
        className="flex min-h-[11rem] w-full items-end gap-1 sm:gap-1.5"
        role="img"
        aria-label={`Закрытия за ${group.monthLabel}`}
      >
        {group.items.map((item) => (
          <ClosureBar
            key={item.key}
            item={item}
            max={max}
            selected={selectedKey === item.key}
            onSelect={handleSelect}
            titlePrefix={group.monthLabel}
          />
        ))}
      </div>
      {selectedBucket ? (
        <ClosureDetailPanel bucket={selectedBucket} granularity={granularity} items={selectedDetailItems} />
      ) : null}
    </section>
  );
}

function ClosureTrendChart({
  items,
  granularity,
  period,
  issuesByKey,
  closureDetails,
  selectedKey,
  onSelect,
}: {
  items: ProductRadarBarItem[];
  granularity: "day" | "month";
  period: ProductRadarAnalyticsPeriod;
  issuesByKey: Record<string, ProductRadarIssue>;
  closureDetails?: ProductRadarDetailItem[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const totalSp = items.reduce((sum, item) => sum + (item.sp ?? 0), 0);
  const max = Math.max(...items.map((item) => item.value), 1);
  const monthGroups = period === "quarter" && granularity === "day" ? groupClosureByMonth(items) : null;
  const periodBadge =
    granularity === "month"
      ? `${items.length} мес.`
      : period === "month"
        ? items[0]?.month_label ?? "текущий месяц"
        : "3 месяца";
  const selectedBucket = items.find((item) => item.key === selectedKey) ?? null;
  const selectedDetailItems = useMemo(
    () =>
      selectedBucket ? buildClosureBucketDetails(selectedBucket, closureDetails, issuesByKey, granularity) : [],
    [closureDetails, granularity, issuesByKey, selectedBucket],
  );

  const handleSelect = (item: ProductRadarBarItem) => {
    onSelect(selectedKey === item.key ? null : item.key);
  };

  if (!items.length) {
    return (
      <p className="text-sm text-ink3">
        Нет данных для графика. Обновите snapshot из Jira — Done подтягиваются автоматически.
      </p>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink3">
          {granularity === "month" ? "Фактические закрытия по месяцам" : "Фактические закрытия по дням"} ·{" "}
          <span className="font-medium text-ink">{total}</span> задач
          {totalSp > 0 ? (
            <>
              {" "}
              · <span className="font-medium text-ink">{totalSp}</span> SP
            </>
          ) : null}
        </p>
        <Badge tone="neutral">{periodBadge}</Badge>
      </div>

      {monthGroups ? (
        <div className="space-y-10">
          {monthGroups.map((group) => (
            <ClosureMonthSection
              key={group.monthKey}
              group={group}
              max={max}
              selectedKey={selectedKey}
              granularity={granularity}
              issuesByKey={issuesByKey}
              closureDetails={closureDetails}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <>
          <div
            className="flex min-h-[12rem] w-full items-end gap-1 sm:gap-1.5"
            role="img"
            aria-label={
              granularity === "month"
                ? `Закрытия по месяцам: всего ${total} задач`
                : `Закрытия по дням: всего ${total} задач`
            }
          >
            {items.map((item) => (
              <ClosureBar
                key={item.key}
                item={item}
                max={max}
                selected={selectedKey === item.key}
                onSelect={handleSelect}
                titlePrefix={granularity === "day" && period === "month" ? item.month_label : undefined}
              />
            ))}
          </div>
          {selectedBucket ? (
            <ClosureDetailPanel bucket={selectedBucket} granularity={granularity} items={selectedDetailItems} />
          ) : null}
        </>
      )}
    </div>
  );
}

function PhaseStackBar({ phaseTotals }: { phaseTotals: ProductRadarPeriodAnalytics["phase_totals"] }) {
  if (!phaseTotals) return null;
  const segments = sortBars([
    { key: "dev", label: "Dev", value: phaseTotals.dev ?? 0, color: "#3b82f6" },
    { key: "test", label: "Test", value: phaseTotals.test ?? 0, color: "#8b5cf6" },
    { key: "pause", label: "Pause", value: phaseTotals.pause ?? 0, color: "#f59e0b" },
    { key: "todo", label: "Todo", value: phaseTotals.todo ?? 0, color: "#94a3b8" },
  ]).filter((segment) => segment.value > 0);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  return (
    <div>
      <div className="flex h-8 overflow-hidden rounded-full border border-line/60">
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
            title={`${segment.label}: ${segment.value} дн.`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs text-ink3">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label} {segment.value} дн.
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusAgeBarChart({
  buckets,
  selectedKey,
  onSelect,
  issuesByKey,
  emptyText = "Нет активных задач для распределения по возрасту в статусе.",
}: {
  buckets: StatusAgeBucket[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  issuesByKey: Record<string, ProductRadarIssue>;
  emptyText?: string;
}) {
  const visible = buckets.filter((bucket) => bucket.value > 0);
  if (!visible.length) {
    return <p className="text-sm text-ink3">{emptyText}</p>;
  }

  const max = Math.max(...visible.map((bucket) => bucket.value), 1);

  return (
    <ul className="space-y-3">
      {visible.map((bucket) => {
        const expanded = selectedKey === bucket.key;
        const width = Math.max(6, (bucket.value / max) * 100);
        const detailItems = expanded ? buildStatusAgeIssueDetails(issuesByKey, bucket) : [];

        return (
          <li
            key={bucket.key}
            className={cn(
              "overflow-hidden rounded-xl transition-all",
              expanded ? "border border-line/70 bg-surface/50" : "",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(expanded ? null : bucket.key)}
              aria-expanded={expanded}
              className={cn(
                "w-full px-4 py-3 text-left transition-colors",
                expanded ? "" : "rounded-lg hover:bg-bg/60",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-ink">{bucket.label}</span>
                <span className="shrink-0 tabular-nums text-ink3">{bucket.value}</span>
              </div>
              <div className="h-3 rounded-full bg-line2">
                <div
                  className="h-3 rounded-full"
                  style={{ width: `${width}%`, backgroundColor: bucket.color || "#3b82f6" }}
                />
              </div>
            </button>
            {expanded ? (
              <div className="border-t border-line/60 px-4 pb-4 pt-4">
                <ChartDetailInlineList
                  items={detailItems}
                  renderExtra={(item) =>
                    item.team ? <p className="mt-2 text-xs text-ink3">Команда: {item.team}</p> : null
                  }
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function AnalyticsSection({
  title,
  children,
  onExpand,
  expanded,
  bordered,
  detail,
  className,
}: {
  title: string;
  children: ReactNode;
  onExpand?: () => void;
  expanded?: boolean;
  bordered?: boolean;
  detail?: ReactNode;
  className?: string;
}) {
  const framed = bordered ?? Boolean(onExpand && expanded);

  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {onExpand ? (
          <Button type="button" size="sm" variant={expanded ? "primary" : "secondary"} onClick={onExpand}>
            {expanded ? "Свернуть" : "Подробнее"}
          </Button>
        ) : null}
      </div>
      <div className={cn(framed && "rounded-xl border border-line/70 bg-surface/50 p-5")}>
        {children}
        {framed && detail ? <div className="mt-5 border-t border-line/60 pt-5">{detail}</div> : null}
      </div>
    </section>
  );
}

export function ProductRadarAnalyticsPanel({
  analytics,
  issuesByKey,
  period,
  onPeriodChange,
}: {
  analytics?: ProductRadarAnalytics | null;
  issuesByKey: Record<string, ProductRadarIssue>;
  period: ProductRadarAnalyticsPeriod;
  onPeriodChange: (period: ProductRadarAnalyticsPeriod) => void;
}) {
  const [expandedSection, setExpandedSection] = useState<"phase_time" | null>(null);
  const [selectedStatusAgeKey, setSelectedStatusAgeKey] = useState<string | null>(null);
  const [selectedClosureKey, setSelectedClosureKey] = useState<string | null>(null);
  const periodAnalytics = useMemo(() => resolvePeriodAnalytics(analytics, period), [analytics, period]);

  useEffect(() => {
    setSelectedStatusAgeKey(null);
    setSelectedClosureKey(null);
  }, [period]);

  const closureGranularity = period === "all" ? "month" : "day";

  const closureItems = useMemo(
    () =>
      (periodAnalytics?.closure_trend ?? []).map((item) => ({
        key: item.key,
        label: item.label,
        value: item.value,
        color: item.color,
        sp: item.sp,
        month_key: item.month_key,
        month_label: item.month_label,
        issue_keys: item.issue_keys,
      })),
    [periodAnalytics?.closure_trend],
  );

  const chartDetails = periodAnalytics?.chart_details;
  const closureDetails = chartDetails?.closures;

  const phaseDetailItems = useMemo((): ProductRadarDetailItem[] => {
    return (chartDetails?.phase_time ?? []).map((item) => ({
      ...item,
      metric_label: "Фаза",
      metric_value: `${item.dominant_phase} · ${item.phase_days} дн.`,
    }));
  }, [chartDetails?.phase_time]);

  const statusAgeBuckets = useMemo(
    () => resolveStatusAgeBuckets(issuesByKey, periodAnalytics?.status_age),
    [issuesByKey, periodAnalytics?.status_age],
  );

  const toggleSection = (section: "phase_time") => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  if (!analytics || !periodAnalytics) {
    return <p className="text-sm text-ink3">Обновите snapshot — аналитика появится после enrich.</p>;
  }

  return (
    <div className="min-w-0 space-y-12">
      <AnalyticsPeriodPicker period={period} onChange={onPeriodChange} />

      <AnalyticsSection title={closureGranularity === "month" ? "Закрытия по месяцам" : "Закрытия по дням"}>
        <ClosureTrendChart
          items={closureItems}
          granularity={closureGranularity}
          period={period}
          issuesByKey={issuesByKey}
          closureDetails={closureDetails}
          selectedKey={selectedClosureKey}
          onSelect={setSelectedClosureKey}
        />
      </AnalyticsSection>

      <AnalyticsSection title="Возраст задач в статусе">
        <StatusAgeBarChart
          buckets={statusAgeBuckets}
          selectedKey={selectedStatusAgeKey}
          onSelect={setSelectedStatusAgeKey}
          issuesByKey={issuesByKey}
        />
      </AnalyticsSection>

      <AnalyticsSection
        title="Где застряло время"
        onExpand={() => toggleSection("phase_time")}
        expanded={expandedSection === "phase_time"}
        detail={<ChartDetailInlineList items={phaseDetailItems} />}
      >
        <PhaseStackBar phaseTotals={periodAnalytics.phase_totals} />
      </AnalyticsSection>

      <AnalyticsSection title="Релизный контур">
        <ReleaseContourTimeline contour={periodAnalytics.release_contour} />
      </AnalyticsSection>
    </div>
  );
}
