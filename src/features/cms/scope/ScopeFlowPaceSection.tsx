import { memo } from "react";
import { Badge, Surface, cn } from "../../../design-system";
import type { ScopeBoardRecord, ScopeFlowPace } from "../api/cmsClient";
import { flowPaceStatusLabel, flowPaceStatusTone } from "./scopeFlowPaceHelpers";
import { ScopeFlowPaceDonuts } from "./ScopeFlowPaceDonuts";

export const ScopeFlowPaceSection = memo(function ScopeFlowPaceSection({
  flowPace,
  boardId,
  canManage = false,
  chartOrder,
  onBoardUpdated,
  onChartOrderError,
  presentation = false,
}: {
  flowPace: ScopeFlowPace;
  boardId?: number | null;
  canManage?: boolean;
  chartOrder?: string[] | null;
  onBoardUpdated?: (board: ScopeBoardRecord) => void;
  onChartOrderError?: (message: string) => void;
  presentation?: boolean;
}) {
  const charts = flowPace.charts?.donuts ?? [];

  return (
    <Surface className={cn("scope-collapsible-card overflow-hidden border-0 bg-surface/80 p-0", presentation && "h-full")}>
      <details className="scope-presentation-section group">
        <summary className="scope-section-header flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none sm:px-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-ink">AI пульс спринта</h2>
              <Badge tone={flowPaceStatusTone(flowPace.pace_status)}>{flowPaceStatusLabel(flowPace.pace_status)}</Badge>
            </div>
            <p className="scope-section-header-subtitle mt-1 text-sm">
              Метрики по закрытым и сигналы по активным — клик по донату открывает детали ниже.
              {canManage ? " Порядок донатов можно менять перетаскиванием." : null}
            </p>
          </div>
          <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
            </svg>
          </span>
        </summary>

        <div className="border-t border-line/50 bg-bg/45 p-4 sm:p-6 lg:p-7">
          {charts.length > 0 ? (
            <ScopeFlowPaceDonuts
              charts={charts}
              browseBase={flowPace.jira_browse_base ?? null}
              boardId={boardId}
              canManage={canManage}
              chartOrder={chartOrder ?? flowPace.chart_order}
              onBoardUpdated={onBoardUpdated}
              onChartOrderError={onChartOrderError}
            />
          ) : (
            <p className="rounded-2xl border border-line/70 bg-surface px-6 py-8 text-center text-sm text-ink3 shadow-sm">
              Нет данных — обновите scope из Jira.
            </p>
          )}
        </div>
      </details>
    </Surface>
  );
});
