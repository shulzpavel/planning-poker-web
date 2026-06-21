import { useEffect, useMemo, useState } from "react";
import { Badge, cn } from "../../../design-system";
import { cmsMobileSectionShell, cmsSectionBody, cmsSectionHeaderPad } from "../components/cmsMobileLayout";
import { normalizeAiHistory } from "./scopeAiHistory";
import { ScopeAiJiraExportBadge } from "./scopeAiJiraExport";
import { ScopeAiView, formatAiTime, HEALTH_LABELS, HEALTH_TONE } from "./ScopeAiView";
import type { ScopeAiHistoryEntry, ScopeAiSummary } from "./scopeAiTypes";
import type { ScopeBoardMetrics, ScopeWorkloadMode } from "../api/cmsClient";
import { DEFAULT_SCOPE_WORKLOAD_MODE } from "./WorkloadModePicker";

export function ScopeAiPanel({
  summary,
  history,
  selectedHistoryId,
  onSelectHistory,
  metrics,
  workloadMode = DEFAULT_SCOPE_WORKLOAD_MODE,
  openQuestionsCount = 0,
  autoOpenSignal = 0,
  analyzing = false,
  jiraExportPending = false,
  planEpicKey,
  presentation = false,
}: {
  summary: ScopeAiSummary | null;
  history: ScopeAiHistoryEntry[];
  selectedHistoryId: string | null;
  onSelectHistory: (id: string | null) => void;
  metrics?: ScopeBoardMetrics | null;
  workloadMode?: ScopeWorkloadMode;
  openQuestionsCount?: number;
  autoOpenSignal?: number;
  analyzing?: boolean;
  jiraExportPending?: boolean;
  planEpicKey?: string | null;
  presentation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => normalizeAiHistory(summary, history), [summary, history]);

  const activeEntry = useMemo(() => {
    if (entries.length === 0) return null;
    if (selectedHistoryId) {
      return entries.find((entry) => entry.id === selectedHistoryId) ?? entries[0];
    }
    return entries[0];
  }, [entries, selectedHistoryId]);

  useEffect(() => {
    if (presentation) {
      setOpen(true);
    }
  }, [presentation]);

  useEffect(() => {
    if (autoOpenSignal > 0 || analyzing) {
      setOpen(true);
    }
  }, [analyzing, autoOpenSignal]);

  if (!activeEntry) {
    return (
      <details
        className={cn(
          "scope-collapsible-card group",
          cmsMobileSectionShell,
          presentation && "scope-presentation-section",
        )}
        open={open || analyzing}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className={cn("scope-section-header cursor-pointer list-none marker:content-none", cmsSectionHeaderPad)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-base font-semibold text-ink">AI-сводка для бизнеса</span>
            <span className="scope-print-hide inline-flex items-center gap-2 text-xs font-semibold text-ink">
              <span className="group-open:hidden">Показать</span>
              <span className="hidden group-open:inline">Скрыть</span>
              <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
                </svg>
              </span>
            </span>
          </div>
        </summary>
        <div className={cn(cmsSectionBody, "text-sm text-ink2")}>
          {analyzing
            ? "Генерируем AI-сводку по текущему snapshot..."
            : "Нажмите «AI-анализ» в шапке отчёта, чтобы получить бизнес-сводку."}
        </div>
      </details>
    );
  }

  const isHistorical = Boolean(selectedHistoryId && selectedHistoryId !== entries[0]?.id);
  const generatedLabel = formatAiTime(activeEntry.generated_at);
  const snapshotLabel = formatAiTime(activeEntry.snapshot_refreshed_at);

  return (
    <details
      className={cn(
        "scope-collapsible-card group",
        cmsMobileSectionShell,
        presentation && "scope-presentation-section",
      )}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={cn("scope-section-header cursor-pointer list-none marker:content-none", cmsSectionHeaderPad)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-ink">AI-сводка для бизнеса</span>
            <Badge tone={HEALTH_TONE[activeEntry.health]}>{HEALTH_LABELS[activeEntry.health]}</Badge>
            <ScopeAiJiraExportBadge
              jiraExport={activeEntry.analysis.jira_export}
              pending={jiraExportPending}
              planEpicKey={planEpicKey}
            />
            {generatedLabel ? <span className="scope-section-header-subtitle text-sm">{generatedLabel}</span> : null}
          </div>
          <span className="scope-print-hide inline-flex items-center gap-2 text-xs font-semibold text-ink">
            <span className="group-open:hidden">Показать</span>
            <span className="hidden group-open:inline">Скрыть</span>
            <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
              </svg>
            </span>
          </span>
        </div>
      </summary>

      <div className={cmsSectionBody}>
        <div className="scope-ai-panel-grid grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ScopeAiView
              key={activeEntry.id}
              summary={activeEntry.analysis}
              generatedLabel={generatedLabel}
              snapshotLabel={snapshotLabel}
              isHistorical={isHistorical}
              metrics={metrics}
              workloadMode={workloadMode}
              openQuestionsCount={openQuestionsCount}
              planEpicKey={planEpicKey}
              jiraExportPending={jiraExportPending}
            />

            {entries.length > 1 ? (
              <aside className="scope-ai-history-aside rounded-2xl bg-bg/70 p-4 xl:sticky xl:top-4 xl:self-start">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-ink">История AI</h4>
                  <span className="text-xs text-ink3">{entries.length}</span>
                </div>

                <ol className="max-h-[min(70vh,520px)] space-y-2 overflow-y-auto pr-1">
                  {entries.map((entry) => {
                    const isActive = selectedHistoryId
                      ? entry.id === selectedHistoryId
                      : entry.id === entries[0]?.id;
                    const when = formatAiTime(entry.generated_at) ?? "—";
                    const preview = entry.summary.trim() || entry.analysis.summary;

                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => onSelectHistory(entry.id === entries[0]?.id ? null : entry.id)}
                          className={cn(
                            "w-full rounded-xl px-3 py-3 text-left transition-colors",
                            isActive
                              ? "bg-blue/[0.08]"
                              : "bg-surface/80 hover:bg-line2/40"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-ink3">{when}</span>
                            <Badge tone={HEALTH_TONE[entry.health]}>{HEALTH_LABELS[entry.health]}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-3 text-sm text-ink2">{preview}</p>
                          {entry.snapshot_refreshed_at ? (
                            <p className="mt-1 text-[11px] text-ink3">Snapshot: {formatAiTime(entry.snapshot_refreshed_at)}</p>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </aside>
            ) : null}
        </div>
      </div>
    </details>
  );
}
