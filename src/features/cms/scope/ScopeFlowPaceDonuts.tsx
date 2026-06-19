import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../../design-system";
import type { ScopeBoardRecord, ScopeFlowAlert, ScopeFlowPaceChart, ScopeFlowPaceChartDetailSegment } from "../api/cmsClient";
import { cmsScopeApi } from "../api/cmsClient";
import {
  FlowPaceAlertCard,
  FlowPaceAlertGroup,
  FlowPaceDetailCard,
  FlowPaceDetailGroup,
  segmentDetailTone,
  severityFromSegmentKey,
} from "./scopeFlowPaceAlerts";
import {
  mergeFlowPaceChartOrder,
  reorderFlowPaceChartOrder,
  sortFlowPaceCharts,
} from "./scopeFlowPaceChartOrder";
import { donutArcs } from "./scopeBoardVisuals";

export function FlowPaceChartDetail({
  chart,
  browseBase,
  className,
}: {
  chart: ScopeFlowPaceChart;
  browseBase?: string | null;
  className?: string;
}) {
  const segments = chart.detail_segments ?? [];
  const isSignals = chart.id === "active_signals";

  if (!chart.methodology && segments.length === 0) {
    return (
      <p className={cn("rounded-xl border border-line/70 bg-bg/70 px-4 py-3 text-sm text-ink3", className)}>
        Подробная разбивка недоступна — обновите данные из Jira.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4 px-4 py-4 sm:px-6 sm:py-5", className)}>
      {chart.methodology ? (
        <p className="rounded-xl border border-line/60 bg-bg/70 px-4 py-3 text-xs leading-relaxed text-ink3">
          {chart.methodology}
        </p>
      ) : null}

      {segments.map((segment: ScopeFlowPaceChartDetailSegment) => {
        const signalSeverity = isSignals ? severityFromSegmentKey(segment.key) : null;
        const tone = signalSeverity ?? segmentDetailTone(segment.key);
        const alertItems = segment.items
          .map((item) => item.alert)
          .filter((alert): alert is ScopeFlowAlert => Boolean(alert));

        if (isSignals && signalSeverity) {
          return (
            <FlowPaceAlertGroup
              key={segment.key}
              severity={signalSeverity}
              title={segment.label}
              count={alertItems.length}
              alerts={alertItems}
              browseBase={browseBase}
            />
          );
        }

        return (
          <FlowPaceDetailGroup key={segment.key} tone={tone} title={segment.label} count={segment.items.length}>
            {segment.items.length === 0 ? (
              <li className="px-1 text-sm text-ink4">Нет задач в этой группе.</li>
            ) : (
              segment.items.map((item, index) =>
                item.alert ? (
                  <FlowPaceAlertCard
                    key={`${item.issue_key}-${index}`}
                    alert={item.alert}
                    browseBase={browseBase}
                  />
                ) : (
                  <FlowPaceDetailCard
                    key={`${item.issue_key}-${index}`}
                    tone={tone}
                    badgeLabel={segment.label}
                    issueKey={item.issue_key}
                    issueUrl={item.issue_url}
                    title={item.metric_label || segment.label}
                    summary={item.summary}
                    detail={item.detail}
                    metricValue={item.metric_value}
                  />
                ),
              )
            )}
          </FlowPaceDetailGroup>
        );
      })}

      {segments.every((segment) => segment.items.length === 0) && !isSignals ? (
        <p className="text-center text-sm text-ink3">Нет данных для детализации.</p>
      ) : null}
    </div>
  );
}

function FlowPaceDonutCard({
  chart,
  selected,
  onSelect,
}: {
  chart: ScopeFlowPaceChart;
  selected: boolean;
  onSelect: () => void;
}) {
  const arcs = useMemo(() => donutArcs(chart.segments), [chart.segments]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-expanded={selected}
      aria-controls={`flow-pace-detail-${chart.id}`}
      className={cn(
        "flex w-full flex-col rounded-2xl border bg-surface p-4 text-left shadow-sm transition-colors",
        selected
          ? "border-accent/50 ring-2 ring-accent/25"
          : "border-line/80 hover:border-line hover:bg-surface/95",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-ink">{chart.title}</h3>
          <p className="text-xs leading-relaxed text-ink3">{chart.subtitle}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink3 transition-transform",
            selected && "rotate-180 text-accent",
          )}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
          </svg>
        </span>
      </div>

      <div className="relative mx-auto my-4 h-40 w-40">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="10" className="text-line2" />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke={arc.color}
              strokeWidth="10"
              strokeDasharray={arc.dasharray}
              strokeDashoffset={arc.dashoffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-bold tabular-nums text-ink">{chart.center_value}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink3">{chart.center_label}</p>
        </div>
      </div>

      <ul className="mt-auto space-y-1.5">
        {chart.segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-ink2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 tabular-nums font-medium text-ink">{segment.value}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function SortableFlowPaceDonutCard({
  chart,
  selected,
  onSelect,
  canDrag,
}: {
  chart: ScopeFlowPaceChart;
  selected: boolean;
  onSelect: () => void;
  canDrag: boolean;
}) {
  const sortable = useSortable({ id: chart.id, disabled: !canDrag });
  const style = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "group/flow-pace-sortable flex items-start gap-2",
        sortable.isDragging ? "relative z-30" : "",
      )}
    >
      {canDrag ? (
        <button
          type="button"
          className={cn(
            "scope-no-print mt-2 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full text-ink4 opacity-0",
            "touch-manipulation transition-[background-color,color,opacity] hover:bg-line2/60 hover:text-ink2 hover:opacity-100 active:cursor-grabbing",
            "focus-visible:opacity-100 group-hover/flow-pace-sortable:opacity-60 group-focus-within/flow-pace-sortable:opacity-100",
            sortable.isDragging ? "opacity-100" : "",
          )}
          aria-label="Переместить донат"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M7 5.5h6M7 10h6M7 14.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <FlowPaceDonutCard chart={chart} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  );
}

export function ScopeFlowPaceDonuts({
  charts,
  browseBase,
  boardId,
  canManage = false,
  chartOrder,
  onBoardUpdated,
  onChartOrderError,
  className,
}: {
  charts: ScopeFlowPaceChart[];
  browseBase?: string | null;
  boardId?: number | null;
  canManage?: boolean;
  chartOrder?: string[] | null;
  onBoardUpdated?: (board: ScopeBoardRecord) => void;
  onChartOrderError?: (message: string) => void;
  className?: string;
}) {
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const chartIds = useMemo(() => charts.map((chart) => chart.id), [charts]);
  const [order, setOrder] = useState(() => mergeFlowPaceChartOrder(chartOrder, chartIds));
  const canDrag = canManage && boardId != null && !Number.isNaN(boardId);

  useEffect(() => {
    setOrder(mergeFlowPaceChartOrder(chartOrder, chartIds));
  }, [chartOrder, chartIds]);

  const orderedCharts = useMemo(() => sortFlowPaceCharts(charts, order), [charts, order]);
  const activeChart = orderedCharts.find((chart) => chart.id === selectedChartId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!canDrag) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const previousOrder = order;
      const nextOrder = reorderFlowPaceChartOrder(order, String(active.id), String(over.id));
      setOrder(nextOrder);

      try {
        const updated = await cmsScopeApi.updateFlowPaceChartOrder(boardId!, nextOrder);
        const savedOrder = mergeFlowPaceChartOrder(updated.flow_pace_chart_order, chartIds);
        setOrder(savedOrder);
        onBoardUpdated?.(updated);
      } catch (err) {
        setOrder(previousOrder);
        onChartOrderError?.(err instanceof Error ? err.message : "Не удалось сохранить порядок донатов.");
      }
    },
    [boardId, canDrag, chartIds, onBoardUpdated, onChartOrderError, order],
  );

  if (!charts.length) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {orderedCharts.map((chart) => (
              <SortableFlowPaceDonutCard
                key={chart.id}
                chart={chart}
                selected={selectedChartId === chart.id}
                onSelect={() => setSelectedChartId((current) => (current === chart.id ? null : chart.id))}
                canDrag={canDrag}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {activeChart ? (
        <section
          id={`flow-pace-detail-${activeChart.id}`}
          className="scope-collapsible-card overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line/60 bg-bg/45 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink">{activeChart.title}</h3>
              <p className="mt-0.5 text-xs text-ink3">{activeChart.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedChartId(null)}
              className="shrink-0 rounded-full border border-line/70 px-3 py-1.5 text-xs font-medium text-ink3 transition-colors hover:bg-bg hover:text-ink"
            >
              Свернуть
            </button>
          </div>
          <FlowPaceChartDetail chart={activeChart} browseBase={browseBase} />
        </section>
      ) : null}
    </div>
  );
}
