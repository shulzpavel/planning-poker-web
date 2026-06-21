import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Spinner, TextareaField, cn } from "../../../design-system";
import { cmsMobileSectionShell, cmsSectionBody, cmsSectionHeaderPad } from "../components/cmsMobileLayout";
import type {
  ScopeBoardIssue,
  ScopeBoardSnapshot,
  ScopeEpicReportSection,
  ScopeReleaseBucket,
  ScopeReleaseContext,
  ScopeReleaseSlot,
  ScopeReleaseVersionMeta,
  ScopeReportComment,
  ScopeReportSectionBlock,
  ScopeResolvedQuestion,
} from "../api/cmsClient";
import {
  computeScopeReport,
  formatCommentMeta,
  formatScopeSp,
  normalizeScopeReport,
  IN_TEST_REPORT_SUBGROUP_LABELS,
  inTestReportSubgroup,
  priorityBadgeTone,
  sortInTestReportIssues,
  resolveOpenQuestions,
  resolvedQuestions,
  sortDoneIssuesByRecentStatus,
  type ScopeOpenQuestion,
  snapshotOpenQuestionStats,
} from "./scopeBoardHelpers";
import { useIncrementalList } from "./scopeListPaging";
import { ScopeIncrementalFooter } from "./ScopeIncrementalFooter";
import { formatQueueTimelineDate } from "./scopePriorityQueueTimeline";
import { PlanFieldBadges } from "./scopePlanInsights";
import { RoleContributorsBadges } from "./scopeRoleContributors";
import { TextWithLinks } from "./textWithLinks";

const REPORT_COLUMNS = [
  { key: "in_work" as const, title: "В работе", tone: "info" as const },
  { key: "in_test" as const, title: "В тесте", tone: "warning" as const },
  { key: "done" as const, title: "Готово", tone: "success" as const },
];

const MAX_RELEASE_COMMENTS = 10;

interface ReleaseCommentItem {
  id: string;
  text: string;
  created_at?: string;
}

export function ScopeReportSection({
  snapshot,
  canManage,
  showTechnicalFields = false,
  isReleaseReport = false,
  releaseComments,
  onSaveReleaseComment,
  reportComments,
  onSaveReportComment,
  onAddQuestion,
  onResolveQuestion,
  presentation = false,
}: {
  snapshot: ScopeBoardSnapshot;
  canManage: boolean;
  showTechnicalFields?: boolean;
  isReleaseReport?: boolean;
  releaseComments?: Partial<Record<ScopeReleaseSlot, string>>;
  onSaveReleaseComment?: (slot: ScopeReleaseSlot, text: string) => Promise<void>;
  reportComments?: Record<string, ScopeReportComment>;
  onSaveReportComment?: (issueKey: string, text: string) => Promise<void>;
  onAddQuestion: (text: string) => Promise<void>;
  onResolveQuestion: (questionId: string, comment: string) => Promise<void>;
  presentation?: boolean;
}) {
  const report = useMemo(
    () => (snapshot.report ? normalizeScopeReport(snapshot.report) : computeScopeReport(snapshot)),
    [snapshot],
  );
  const openQuestions = useMemo(() => resolveOpenQuestions(snapshot), [snapshot]);
  const closedQuestions = useMemo(() => resolvedQuestions(snapshot), [snapshot]);
  const releaseContext = snapshot.release_context;
  const releaseMode = Boolean(releaseContext) || isReleaseReport;

  const body = (
    <div className={cmsSectionBody}>
      <div className="space-y-5">
        {releaseContext ? (
          <ReleaseReportBlocks
            releaseContext={releaseContext}
            showTechnicalFields={showTechnicalFields}
            canManage={canManage}
            releaseComments={releaseComments ?? {}}
            onSaveReleaseComment={onSaveReleaseComment}
            reportComments={reportComments ?? {}}
            onSaveReportComment={onSaveReportComment}
          />
        ) : (
          (report.sections ?? []).map((section) => (
            <EpicReportBlock
              key={section.id}
              title={section.name}
              subtitle={section.kind === "planned" ? "Плановый scope" : "Внеплановый scope"}
              accent={section.kind === "planned" ? "blue" : "amber"}
              section={section}
              showTechnicalFields={showTechnicalFields}
              reportComments={reportComments ?? {}}
              canManage={canManage}
              onSaveReportComment={onSaveReportComment}
            />
          ))
        )}
      </div>

      <OpenQuestionsBlock
        snapshot={snapshot}
        count={openQuestions.length}
        canManage={canManage}
        issues={openQuestions}
        resolved={closedQuestions}
        onAddQuestion={onAddQuestion}
        onResolveQuestion={onResolveQuestion}
        presentation={presentation}
      />
    </div>
  );

  if (releaseMode && releaseContext) {
    return (
      <section className={cn("scope-collapsible-card", cmsMobileSectionShell)}>
        <div className={cn("scope-section-header", cmsSectionHeaderPad)}>
          <div>
            <h2 className="text-base font-semibold text-ink">Релиз</h2>
            <p className="scope-section-header-subtitle mt-1 text-sm">
              Единый отчёт по fixVersion · задачи сгруппированы по статусу
            </p>
          </div>
        </div>
        {body}
      </section>
    );
  }

  return (
    <details className={cn("scope-collapsible-card scope-presentation-section group", cmsMobileSectionShell)}>
      <summary className={cn("scope-section-header flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none", cmsSectionHeaderPad)}>
        <div>
          <h2 className="text-base font-semibold text-ink">Отчёт</h2>
          <p className="scope-section-header-subtitle mt-1 text-sm">
            Каждая JQL-секция отдельно · внутри блока сортировка по приоритету Jira
          </p>
        </div>
        <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
          </svg>
        </span>
      </summary>
      {body}
    </details>
  );
}

function ReleaseReportBlocks({
  releaseContext,
  showTechnicalFields,
  canManage,
  releaseComments,
  onSaveReleaseComment,
  reportComments,
  onSaveReportComment,
}: {
  releaseContext: ScopeReleaseContext;
  showTechnicalFields: boolean;
  canManage: boolean;
  releaseComments: Partial<Record<ScopeReleaseSlot, string>>;
  onSaveReleaseComment?: (slot: ScopeReleaseSlot, text: string) => Promise<void>;
  reportComments: Record<string, ScopeReportComment>;
  onSaveReportComment?: (issueKey: string, text: string) => Promise<void>;
}) {
  const current = releaseContext.current;
  const dynamicReleases = releaseContext.releases ?? [];
  const pastSlots = [
    releaseContext.previous ? { bucket: releaseContext.previous, subtitle: "Прошедший релиз" } : null,
    ...dynamicReleases
      .filter((bucket) => bucket.relation === "past")
      .sort(compareReleaseBucketOrder)
      .map((bucket) => ({ bucket, subtitle: "Прошедший релиз" })),
  ].filter((item): item is { bucket: ScopeReleaseBucket; subtitle: string } => Boolean(item));
  const futureSlots = [
    ...dynamicReleases
      .filter((bucket) => bucket.relation !== "past")
      .sort(compareReleaseBucketOrder)
      .map((bucket) => ({ bucket, subtitle: "Будущий релиз" })),
    releaseContext.next ? { bucket: releaseContext.next, subtitle: "Будущий релиз" } : null,
    releaseContext.custom
      ? {
          bucket: releaseContext.custom,
          subtitle: releaseContext.custom.label ? `Контекст: ${releaseContext.custom.label}` : "Будущий релиз",
        }
      : null,
  ].filter((item): item is { bucket: ScopeReleaseBucket; subtitle: string } => Boolean(item));

  return (
    <div className="overflow-hidden border-y border-blue/20 bg-gradient-to-br from-blue/[0.12] via-surface to-surface shadow-none ring-1 ring-blue/10 sm:rounded-2xl sm:border sm:shadow-card lg:rounded-3xl">
      {pastSlots.length > 0 ? (
        <ReleaseContextGroup
          title="Прошедшие релизы"
          eyebrow="Контекст перед текущим релизом"
          slots={pastSlots}
          showTechnicalFields={showTechnicalFields}
          canManage={canManage}
          releaseComments={releaseComments}
          onSaveReleaseComment={onSaveReleaseComment}
          reportComments={reportComments}
          onSaveReportComment={onSaveReportComment}
        />
      ) : null}

      <ReleaseHeroHeader bucket={current} subtitle="Текущий релиз" />
      <div className="grid gap-3 border-t border-blue/10 p-3 sm:p-4 lg:grid-cols-3 lg:gap-4 lg:p-5">
        {REPORT_COLUMNS.map((column) => (
          <ReportColumn
            key={column.key}
            columnKey={column.key}
            title={column.title}
            tone={column.tone}
            count={current.counts[column.key]}
            issues={current[column.key]}
            showTechnicalFields={showTechnicalFields}
            hidePlanFields
            reportComments={reportComments}
            canManage={canManage}
            onSaveReportComment={onSaveReportComment}
          />
        ))}
      </div>
      <ReleaseCommentBlock
        slot="current"
        comment={releaseComments.current ?? ""}
        canManage={canManage}
        onSave={onSaveReleaseComment}
      />

      {futureSlots.length > 0 ? (
        <ReleaseContextGroup
          title="Будущие релизы"
          eyebrow="Контекст после текущего релиза"
          slots={futureSlots}
          showTechnicalFields={showTechnicalFields}
          canManage={canManage}
          releaseComments={releaseComments}
          onSaveReleaseComment={onSaveReleaseComment}
          reportComments={reportComments}
          onSaveReportComment={onSaveReportComment}
        />
      ) : null}
    </div>
  );
}

function ReleaseContextGroup({
  title,
  eyebrow,
  slots,
  showTechnicalFields,
  canManage,
  releaseComments,
  onSaveReleaseComment,
  reportComments,
  onSaveReportComment,
}: {
  title: string;
  eyebrow: string;
  slots: Array<{ bucket: ScopeReleaseBucket; subtitle: string }>;
  showTechnicalFields: boolean;
  canManage: boolean;
  releaseComments: Partial<Record<ScopeReleaseSlot, string>>;
  onSaveReleaseComment?: (slot: ScopeReleaseSlot, text: string) => Promise<void>;
  reportComments: Record<string, ScopeReportComment>;
  onSaveReportComment?: (issueKey: string, text: string) => Promise<void>;
}) {
  return (
    <div className="border-t border-line/70 bg-line2/20 p-3 sm:p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink3">{eyebrow}</p>
          <h3 className="mt-1 text-base font-semibold text-ink">{title}</h3>
        </div>
      </div>
      <div className="space-y-4">
        {slots.map(({ bucket, subtitle }) => (
          <ReleaseSecondarySlot
            key={bucket.slot}
            bucket={bucket}
            subtitle={subtitle}
            showTechnicalFields={showTechnicalFields}
            canManage={canManage}
            comment={releaseComments[bucket.slot] ?? ""}
            onSaveComment={isStoredReleaseCommentSlot(bucket.slot) ? onSaveReleaseComment : undefined}
            reportComments={reportComments}
            onSaveReportComment={onSaveReportComment}
          />
        ))}
      </div>
    </div>
  );
}

function compareReleaseBucketOrder(left: ScopeReleaseBucket, right: ScopeReleaseBucket): number {
  return (left.order ?? 0) - (right.order ?? 0);
}

function isStoredReleaseCommentSlot(slot: string): slot is "current" | "previous" | "next" | "custom" {
  return slot === "current" || slot === "previous" || slot === "next" || slot === "custom";
}

function ReleaseHeroHeader({ bucket, subtitle }: { bucket: ScopeReleaseBucket; subtitle: string }) {
  const meta = bucket.version_meta;
  const displayName = releaseDisplayName(bucket);
  const releaseUrl = buildReleaseReportUrl(bucket);
  const totalSp = bucket.story_points ?? 0;
  const progress = releaseProgress(bucket);

  return (
    <div className="relative overflow-hidden p-3 sm:p-4 lg:p-6">
      <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-blue/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue/20 bg-blue/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue">
            <span className="h-2 w-2 rounded-full bg-blue" />
            Релиз
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-2xl font-bold tracking-tight text-ink sm:text-4xl">{displayName}</h3>
            {bucket.project_key ? <Badge tone="info">{bucket.project_key}</Badge> : null}
            <ReleaseStatusBadge meta={meta} />
          </div>
          <p className="text-sm text-ink3">{subtitle}</p>
          {meta?.description ? <p className="max-w-3xl text-sm text-ink2">{meta.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {releaseUrl ? (
            <a
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-blue/20 bg-surface px-3 py-1.5 text-sm font-medium text-blue hover:bg-blue/[0.06]"
            >
              Открыть в Jira
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:gap-3 xl:grid-cols-4">
        <ReleaseDateCard label="Дата начала" value={meta?.start_date} emptyLabel="Не указана дата начала" />
        <ReleaseDateCard label="Дата релиза" value={meta?.release_date} emptyLabel="Не указана дата релиза" />
        <ReleaseMetricCard label="Задач в релизе" value={String(bucket.counts.total)} />
        <ReleaseMetricCard label="Story Points" value={`${formatScopeSp(totalSp)} SP`} />
      </div>

      <ReleaseProgressBar bucket={bucket} />

      <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
        <Badge tone="info">{bucket.counts.in_work} в работе</Badge>
        <Badge tone="warning">{bucket.counts.in_test} в тесте</Badge>
        <Badge tone="success">{bucket.counts.done} готово</Badge>
        {bucket.counts.open_questions > 0 ? <Badge tone="warning">{bucket.counts.open_questions} на паузе</Badge> : null}
      </div>

      <p className="mt-3 text-sm text-ink3">
        {progress.isInStore ? (
          <span className="font-semibold text-green">Релиз уже в сторе: все задачи в статусе «Готово».</span>
        ) : (
          <>
            Готовность к выпуску в стор:{" "}
            <span className="font-semibold text-ink">{progress.storeReadinessPct}%</span>
            <span className="text-ink3"> · считаем «К релизу» + «Готово»</span>
          </>
        )}
      </p>
    </div>
  );
}

function ReleaseSecondarySlot({
  bucket,
  subtitle,
  showTechnicalFields,
  canManage,
  comment,
  onSaveComment,
  reportComments,
  onSaveReportComment,
}: {
  bucket: ScopeReleaseBucket;
  subtitle: string;
  showTechnicalFields: boolean;
  canManage: boolean;
  comment: string;
  onSaveComment?: (slot: ScopeReleaseSlot, text: string) => Promise<void>;
  reportComments: Record<string, ScopeReportComment>;
  onSaveReportComment?: (issueKey: string, text: string) => Promise<void>;
}) {
  const meta = bucket.version_meta;
  const releaseDate = formatReleaseDate(meta?.release_date);
  const startDate = formatReleaseDate(meta?.start_date);
  const isPrevious = bucket.slot === "previous";

  return (
    <details
      className={
        isPrevious
          ? "group overflow-hidden rounded-lg border border-line bg-surface/60"
          : "group overflow-hidden rounded-lg border border-line bg-surface/80"
      }
    >
      <summary className="cursor-pointer list-none border-b border-line px-3 py-3 marker:content-none sm:px-4 lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-ink">{releaseDisplayName(bucket)}</h4>
              <ReleaseStatusBadge meta={meta} />
            </div>
            <p className="mt-1 text-xs text-ink3">
              {subtitle}
              {releaseDate ? ` · релиз ${releaseDate}` : " · дата релиза не указана"}
              {startDate ? ` · старт ${startDate}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{bucket.counts.total} задач</Badge>
            <Badge tone="info">{bucket.counts.in_work} в работе</Badge>
            <Badge tone="warning">{bucket.counts.in_test} в тесте</Badge>
            <Badge tone="success">{bucket.counts.done} готово</Badge>
            <span className="scope-section-header-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
              </svg>
            </span>
          </div>
        </div>
      </summary>
      {isPrevious ? (
        <ReleaseArchiveSummary bucket={bucket} />
      ) : (
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-3 lg:gap-4">
        {REPORT_COLUMNS.map((column) => (
          <ReportColumn
            key={column.key}
            columnKey={column.key}
            title={column.title}
            tone={column.tone}
            count={bucket.counts[column.key]}
            issues={bucket[column.key]}
            showTechnicalFields={showTechnicalFields}
            hidePlanFields
            reportComments={reportComments}
            canManage={canManage}
            onSaveReportComment={onSaveReportComment}
          />
        ))}
      </div>
      )}
      {onSaveComment || comment.trim() ? (
        <ReleaseCommentBlock
          slot={bucket.slot}
          comment={comment}
          canManage={canManage}
          onSave={onSaveComment}
          compact
        />
      ) : null}
    </details>
  );
}

function ReleaseProgressBar({ bucket }: { bucket: ScopeReleaseBucket }) {
  const progress = releaseProgress(bucket);

  return (
    <div className="mt-4 rounded-lg border border-line/80 bg-surface/70 p-3 sm:mt-5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Пульс релиза</p>
        <p className="text-xs text-ink3">{bucket.counts.total} задач</p>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-line2">
        <div className="bg-blue transition-all" style={{ width: `${progress.inWorkPct}%` }} />
        <div className="bg-amber transition-all" style={{ width: `${progress.inTestPct}%` }} />
        <div className="bg-purple transition-all" style={{ width: `${progress.readyToReleasePct}%` }} />
        <div className="bg-green transition-all" style={{ width: `${progress.donePct}%` }} />
        <div className="bg-red transition-all" style={{ width: `${progress.pausedPct}%` }} />
      </div>
      <div className="mt-3 grid gap-1.5 text-xs text-ink3 sm:grid-cols-5 sm:gap-2">
        <ReleaseProgressLegend colorClass="bg-blue" label="В работе" value={`${progress.inWorkPct}%`} />
        <ReleaseProgressLegend colorClass="bg-amber" label="В тесте" value={`${progress.inTestPct}%`} />
        <ReleaseProgressLegend colorClass="bg-purple" label="К релизу" value={`${progress.readyToReleasePct}%`} />
        <ReleaseProgressLegend colorClass="bg-green" label="Готово" value={`${progress.donePct}%`} />
        <ReleaseProgressLegend colorClass="bg-red" label="На паузе" value={`${progress.pausedPct}%`} />
      </div>
    </div>
  );
}

function ReleaseProgressLegend({ colorClass, label, value }: { colorClass: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-bg/60 px-2.5 py-2">
      <span className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
        {label}
      </span>
      <span className="font-semibold text-ink2">{value}</span>
    </div>
  );
}

function ReleaseArchiveSummary({ bucket }: { bucket: ScopeReleaseBucket }) {
  const totalSp = bucket.story_points ?? 0;
  const visibleIssues = bucket.issues.slice(0, 14);
  const hiddenCount = Math.max(0, bucket.issues.length - visibleIssues.length);
  const statusEntries = sortedCountEntries(bucket.by_status).slice(0, 6);
  const issueTypeEntries = sortedCountEntries(bucket.by_issue_type).slice(0, 6);

  return (
    <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        <ReleaseMetricCard label="Итог" value={`${bucket.counts.done}/${bucket.counts.total} готово`} />
        <ReleaseMetricCard label="Story Points" value={`${formatScopeSp(totalSp)} SP`} />
        <ReleaseMetricCard label="Дата релиза" value={formatReleaseDate(bucket.version_meta?.release_date) || "Не указана"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReleaseBreakdownList title="Типы задач" items={issueTypeEntries} emptyLabel="Типы задач не заполнены." />
        <ReleaseBreakdownList title="Финальные статусы" items={statusEntries} emptyLabel="Статусы не заполнены." />
      </div>

      {bucket.issues.length > 0 ? (
        <div className="rounded-lg bg-bg/60 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-ink">Задачи релиза</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleIssues.map((issue) => (
              <a
                key={issue.key}
                href={issue.url || undefined}
                target={issue.url ? "_blank" : undefined}
                rel={issue.url ? "noreferrer" : undefined}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink2 hover:border-blue/30 hover:text-blue"
              >
                {issue.key}
              </a>
            ))}
            {hiddenCount > 0 ? (
              <span className="rounded-full bg-line2 px-2.5 py-1 text-xs font-medium text-ink3">ещё {hiddenCount}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReleaseCommentBlock({
  slot,
  comment,
  canManage,
  onSave,
  compact = false,
}: {
  slot: ScopeReleaseSlot;
  comment: string;
  canManage: boolean;
  onSave?: (slot: ScopeReleaseSlot, text: string) => Promise<void>;
  compact?: boolean;
}) {
  const items = useMemo(() => parseReleaseCommentItems(comment), [comment]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleaned = draft.trim();
  const atLimit = items.length >= MAX_RELEASE_COMMENTS;

  useEffect(() => {
    setDraft("");
  }, [comment]);

  async function addComment() {
    if (!canManage || !onSave || saving || atLimit || !cleaned) return;
    setSaving(true);
    setError(null);
    try {
      const nextItems = [
        ...items,
        {
          id: createReleaseCommentId(),
          text: cleaned,
          created_at: new Date().toISOString(),
        },
      ];
      await onSave(slot, serializeReleaseCommentItems(nextItems));
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить комментарий.");
    } finally {
      setSaving(false);
    }
  }

  async function removeComment(itemId: string) {
    if (!canManage || !onSave || saving || removingId) return;
    setRemovingId(itemId);
    setError(null);
    try {
      await onSave(slot, serializeReleaseCommentItems(items.filter((item) => item.id !== itemId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить комментарий.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className={compact ? "border-t border-line bg-surface/60 p-3 sm:p-4" : "border-t border-blue/10 bg-surface/70 p-3 sm:p-4 lg:p-5"}>
      <div className="rounded-lg border border-line bg-bg/70 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink3">Комментарий к релизу</p>
            <h3 className="mt-1 text-base font-semibold text-ink">Итоги и выводы</h3>
          </div>
          <Badge tone={items.length > 0 ? "info" : "neutral"}>{items.length}/{MAX_RELEASE_COMMENTS}</Badge>
        </div>

        {items.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {items.map((item, index) => (
              <ReleaseCommentCard
                key={item.id}
                index={index + 1}
                item={item}
                canManage={canManage}
                removing={removingId === item.id}
                onRemove={() => void removeComment(item.id)}
              />
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-lg bg-line2/40 px-3 py-4 text-center text-sm text-ink3 sm:px-4 sm:py-5">
            Пока нет комментариев — добавьте первый итог по релизу.
          </p>
        )}

        <div className="scope-print-hide mt-3">
          <TextareaField
            label="Новый комментарий"
            rows={compact ? 3 : 5}
            value={draft}
            disabled={!canManage || saving || atLimit}
            placeholder="Как прошёл релиз, что было ок, что было не очень, какие выводы забираем дальше."
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <div className="scope-print-hide mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink3">
            {atLimit ? "Достигнут лимит 10 комментариев — удалите один, чтобы добавить новый." : "Комментарий появится в списке после сохранения."}
          </p>
          {canManage ? (
            <Button size="sm" intent="save" disabled={!cleaned || saving || atLimit || !onSave} onClick={() => void addComment()}>
              {saving ? <Spinner size="sm" /> : null}
              Сохранить комментарий
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReleaseCommentCard({
  index,
  item,
  canManage,
  removing,
  onRemove,
}: {
  index: number;
  item: ReleaseCommentItem;
  canManage: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const createdLabel = formatReleaseCommentTime(item.created_at);

  return (
    <li className="flex gap-3 rounded-lg bg-surface/80 px-3 py-3 sm:px-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/10 text-sm font-bold text-blue">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <TextWithLinks text={item.text} className="text-sm font-medium text-ink" />
        {createdLabel ? <p className="mt-1 text-xs text-ink3">{createdLabel}</p> : null}
      </div>
      {canManage ? (
        <Button size="sm" intent="delete" disabled={removing} onClick={onRemove}>
          {removing ? <Spinner size="sm" /> : "Удалить"}
        </Button>
      ) : null}
    </li>
  );
}

function parseReleaseCommentItems(raw: string): ReleaseCommentItem[] {
  const text = raw.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index): ReleaseCommentItem | null => {
          if (typeof item === "string") {
            const itemText = item.trim();
            return itemText ? { id: `legacy-${index}`, text: itemText } : null;
          }
          if (!item || typeof item !== "object") return null;
          const itemText = typeof item.text === "string" ? item.text.trim() : "";
          if (!itemText) return null;
          return {
            id: typeof item.id === "string" && item.id.trim() ? item.id : `item-${index}`,
            text: itemText,
            created_at: typeof item.created_at === "string" ? item.created_at : undefined,
          };
        })
        .filter((item): item is ReleaseCommentItem => Boolean(item))
        .slice(0, MAX_RELEASE_COMMENTS);
    }
  } catch {
    // Legacy comments were stored as plain text before the list format.
  }

  return [{ id: "legacy-0", text }];
}

function serializeReleaseCommentItems(items: ReleaseCommentItem[]): string {
  const cleaned = items
    .map((item) => ({
      id: item.id || createReleaseCommentId(),
      text: item.text.trim(),
      created_at: item.created_at,
    }))
    .filter((item) => item.text)
    .slice(0, MAX_RELEASE_COMMENTS);

  return cleaned.length > 0 ? JSON.stringify(cleaned) : "";
}

function createReleaseCommentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `comment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatReleaseCommentTime(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function ReleaseBreakdownList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: Array<[string, number]>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-bg/60 p-3 sm:p-4">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <p className="mt-3 text-sm text-ink3">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-bg/60 p-3 sm:p-4">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map(([label, count]) => (
          <li key={label} className="flex items-center justify-between gap-3 rounded-lg bg-surface/80 px-3 py-2 text-sm">
            <span className="min-w-0 break-words text-ink2">{label}</span>
            <span className="shrink-0 rounded-full bg-line2 px-2 py-0.5 text-xs font-semibold text-ink3">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReleaseStatusBadge({ meta }: { meta?: ScopeReleaseVersionMeta }) {
  if (!meta) {
    return <Badge tone="neutral">Статус неизвестен</Badge>;
  }
  if (meta.archived) {
    return <Badge tone="neutral">Архив</Badge>;
  }
  if (meta.released) {
    return <Badge tone="success">Выпущен</Badge>;
  }
  if (meta.overdue) {
    return <Badge tone="warning">Просрочен</Badge>;
  }
  return <Badge tone="info">В работе</Badge>;
}

function ReleaseDateCard({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value?: string | null;
  emptyLabel: string;
}) {
  const formatted = formatReleaseDate(value);
  const isEmpty = !formatted;

  return (
    <div className="rounded-lg border border-line/80 bg-surface/80 px-3 py-3 sm:px-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink3">{label}</p>
      <p className={`mt-2 text-base font-semibold ${isEmpty ? "text-ink3" : "text-ink"}`}>
        {formatted || emptyLabel}
      </p>
    </div>
  );
}

function ReleaseMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/80 bg-surface/80 px-3 py-3 sm:px-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink3">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

function releaseDisplayName(bucket: ScopeReleaseBucket): string {
  return bucket.version_meta?.name || bucket.version_name || bucket.version_id || bucket.label || "Релиз";
}

function releaseProgress(bucket: ScopeReleaseBucket): {
  inWorkPct: number;
  inTestPct: number;
  readyToReleasePct: number;
  donePct: number;
  pausedPct: number;
  storeReadinessPct: number;
  isInStore: boolean;
} {
  const total = Math.max(1, bucket.counts.total);
  const readyToReleaseCount = bucket.in_test.filter(isReadyToReleaseIssue).length;
  const testingCount = Math.max(0, bucket.counts.in_test - readyToReleaseCount);
  const inWorkPct = Math.round((bucket.counts.in_work / total) * 100);
  const inTestPct = Math.round((testingCount / total) * 100);
  const readyToReleasePct = Math.round((readyToReleaseCount / total) * 100);
  const pausedPct = Math.round((bucket.counts.open_questions / total) * 100);
  const donePct = Math.round((bucket.counts.done / total) * 100);
  const storeReadinessPct = Math.min(100, Math.round(((readyToReleaseCount + bucket.counts.done) / total) * 100));
  return {
    inWorkPct,
    inTestPct,
    readyToReleasePct,
    donePct,
    pausedPct,
    storeReadinessPct,
    isInStore: bucket.counts.total > 0 && bucket.counts.done === bucket.counts.total,
  };
}

function isReadyToReleaseIssue(issue: ScopeBoardIssue): boolean {
  return (issue.status ?? "").trim().toLocaleLowerCase("ru-RU") === "к релизу";
}

function sortedCountEntries(counts: Record<string, number> | undefined): Array<[string, number]> {
  if (!counts) return [];
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ru"));
}

function buildReleaseReportUrl(bucket: ScopeReleaseBucket): string | null {
  const projectKey = bucket.project_key || bucket.version_meta?.project_key;
  const versionId = bucket.version_id || bucket.version_meta?.id;
  if (!projectKey || !versionId) return null;
  const issueUrl = bucket.issues.find((issue) => issue.url)?.url;
  if (!issueUrl) return null;
  try {
    const origin = new URL(issueUrl).origin;
    return `${origin}/projects/${projectKey}/versions/${versionId}/tab/release-report-all-issues`;
  } catch {
    return null;
  }
}

function formatReleaseDate(value?: string | null): string {
  if (!value) return "";
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    }
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }
  return value;
}

function EpicReportBlock({
  title,
  subtitle,
  accent,
  section,
  showTechnicalFields,
  reportComments,
  canManage,
  onSaveReportComment,
}: {
  title: string;
  subtitle: string;
  accent: "blue" | "amber";
  section: ScopeEpicReportSection | ScopeReportSectionBlock;
  showTechnicalFields: boolean;
  reportComments: Record<string, ScopeReportComment>;
  canManage: boolean;
  onSaveReportComment?: (issueKey: string, text: string) => Promise<void>;
}) {
  const accentStyles =
    accent === "blue"
      ? {
          shell: "bg-blue/[0.04]",
          header: "bg-blue/[0.08]",
          title: "text-blue",
          chip: "info" as const,
        }
      : {
          shell: "bg-line2/30",
          header: "bg-line2/60",
          title: "text-ink",
          chip: "warning" as const,
        };

  return (
    <details className={`overflow-hidden rounded-lg shadow-none sm:shadow-sm ${accentStyles.shell}`}>
      <summary
        className={`cursor-pointer list-none px-3 py-3 marker:content-none sm:px-4 lg:px-5 ${accentStyles.header}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-base font-semibold ${accentStyles.title}`}>{title}</h3>
              <Badge tone={accentStyles.chip}>{section.counts.total} задач</Badge>
            </div>
            <p className="mt-1 text-sm text-ink3">
              {subtitle} · «Готово» — недавно закрытые сверху · остальное по priority
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-ink3">
            <span className="rounded-full bg-surface/70 px-2.5 py-1">В работе: {section.counts.in_work}</span>
            <span className="rounded-full bg-surface/70 px-2.5 py-1">В тесте: {section.counts.in_test}</span>
            <span className="rounded-full bg-surface/70 px-2.5 py-1">Готово: {section.counts.done}</span>
          </div>
        </div>
      </summary>

      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-3 lg:gap-4 lg:p-5">
        {REPORT_COLUMNS.map((column) => (
          <ReportColumn
            key={column.key}
            columnKey={column.key}
            title={column.title}
            tone={column.tone}
            count={section.counts[column.key]}
            issues={section[column.key]}
            showTechnicalFields={showTechnicalFields}
            reportComments={reportComments}
            canManage={canManage}
            onSaveReportComment={onSaveReportComment}
          />
        ))}
      </div>
    </details>
  );
}

function OpenQuestionsBlock({
  snapshot,
  count,
  canManage,
  issues,
  resolved,
  onAddQuestion,
  onResolveQuestion,
  presentation = false,
}: {
  snapshot: ScopeBoardSnapshot;
  count: number;
  canManage: boolean;
  issues: ScopeOpenQuestion[];
  resolved: ScopeResolvedQuestion[];
  onAddQuestion: (text: string) => Promise<void>;
  onResolveQuestion: (questionId: string, comment: string) => Promise<void>;
  presentation?: boolean;
}) {
  const needsAttention = count > 0;
  const stats = snapshotOpenQuestionStats(snapshot);
  const refreshedLabel = snapshot.refreshed_at
    ? new Date(snapshot.refreshed_at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
    : null;
  const [manualDraft, setManualDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const {
    visibleItems: visibleOpenQuestions,
    hasMore: hasMoreOpenQuestions,
    loadMore: loadMoreOpenQuestions,
    loadedCount: loadedOpenQuestionsCount,
    total: openQuestionsTotal,
  } = useIncrementalList(issues);

  async function addManualQuestion() {
    const text = manualDraft.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      await onAddQuestion(text);
      setManualDraft("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className={
        needsAttention
          ? "border-t-4 border-t-amber bg-amber/[0.06] px-3 py-4 sm:px-4 lg:px-5 lg:py-5"
          : "border-t border-line bg-line2/20 px-3 py-3 sm:px-4 lg:px-5 lg:py-4"
      }
    >
      <div
        className={
          needsAttention
            ? "rounded-lg border border-line bg-surface p-3 shadow-sm sm:p-4 lg:p-5"
            : "rounded-lg border border-line bg-surface/60 p-3 sm:p-4 lg:p-5"
        }
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {needsAttention ? (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber/15 text-base font-bold leading-none text-amber">
                  !
                </span>
              ) : null}
              <h3 className={`font-semibold text-ink ${needsAttention ? "text-base" : "text-sm"}`}>
                Открытые вопросы
              </h3>
              {needsAttention ? <Badge tone="warning">Требует внимания</Badge> : null}
            </div>
            <p className="max-w-2xl text-sm text-ink2">
              {needsAttention
                ? "Обсудите вопрос и сразу зафиксируйте решение. Jira-вопросы сохранят ответ комментарием в Jira."
                : "Добавьте вопрос вручную или переведите Jira-задачу в «Пауза»."}
            </p>
          </div>
          <Badge tone={needsAttention ? "warning" : "neutral"}>{count}</Badge>
        </div>

        {canManage ? (
          <div className="mb-4 rounded-md border border-line bg-bg px-3 py-3">
            <TextareaField
              label="Добавить вопрос вручную"
              rows={2}
              value={manualDraft}
              disabled={adding}
              onChange={(event) => setManualDraft(event.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" intent="add" disabled={adding || manualDraft.trim().length === 0} onClick={() => void addManualQuestion()}>
                {adding ? <Spinner size="sm" /> : null}
                Добавить вопрос
              </Button>
            </div>
          </div>
        ) : null}

        {needsAttention ? (
          <>
            <ul className="space-y-2">
              {visibleOpenQuestions.map((issue) => (
                <OpenQuestionCard
                  key={issue.id}
                  issue={issue}
                  canManage={canManage}
                  presentation={presentation}
                  onResolveQuestion={onResolveQuestion}
                />
              ))}
            </ul>
            <ScopeIncrementalFooter
              loadedCount={loadedOpenQuestionsCount}
              total={openQuestionsTotal}
              hasMore={hasMoreOpenQuestions}
              onMore={loadMoreOpenQuestions}
              itemNoun="вопросов"
            />
          </>
        ) : (
          <div className="space-y-2 text-sm text-ink3">
            <p>Нет задач в паузе — блокеров нет.</p>
            {refreshedLabel ? <p>Snapshot обновлён: {refreshedLabel}</p> : null}
            {stats.totalIssues === 0 ? (
              <p className="rounded-md border border-line bg-bg px-3 py-2 text-xs leading-relaxed">
                Jira не вернул задач по JQL-секциям. Проверьте JQL в настройках и нажмите «Обновить из Jira».
              </p>
            ) : stats.pausedIssues === 0 ? (
              <p className="rounded-md border border-line bg-bg px-3 py-2 text-xs leading-relaxed">
                В snapshot {stats.totalIssues} задач по секциям, но ни одна не в статусе «Пауза».
                Убедитесь, что задача входит в Epic из JQL и статус в Jira — «Пауза», затем нажмите «Обновить из Jira» (F5 не подтягивает Jira).
              </p>
            ) : null}
          </div>
        )}

        <ResolvedQuestionsList items={resolved} />
      </div>
    </div>
  );
}

function OpenQuestionCard({
  issue,
  canManage,
  presentation = false,
  onResolveQuestion,
}: {
  issue: ScopeOpenQuestion;
  canManage: boolean;
  presentation?: boolean;
  onResolveQuestion: (questionId: string, comment: string) => Promise<void>;
}) {
  const isJira = issue.kind === "jira";
  const jiraIssue = isJira ? (issue as ScopeBoardIssue) : null;
  const commentMeta = jiraIssue ? formatCommentMeta(jiraIssue) : null;
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolveQuestion() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onResolveQuestion(issue.id, text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось закрыть вопрос.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-md border border-line border-l-4 border-l-amber bg-bg px-3 py-3 sm:px-4">
      <div className={presentation ? "grid gap-3" : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]"}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {jiraIssue ? <ReportIssueLink issue={jiraIssue} /> : <span className="text-sm font-medium text-ink">Вручную</span>}
            <Badge tone="warning">{isJira ? jiraIssue?.status || "Пауза" : "Вопрос"}</Badge>
              {issue.bucket ? <Badge tone={issue.section_kind === "planned" ? "info" : "warning"}>{issue.section_name || issue.bucket}</Badge> : null}
            {jiraIssue?.priority ? <Badge tone={priorityBadgeTone(jiraIssue.priority)}>{jiraIssue.priority}</Badge> : null}
            {jiraIssue ? <span className="text-xs text-ink3">{formatScopeSp(jiraIssue.story_points)} SP</span> : null}
          </div>
          <p className="mt-1 text-sm text-ink2">{issue.summary}</p>
          {jiraIssue?.assignee ? <p className="mt-1 text-xs text-ink3">Owner: {jiraIssue.assignee}</p> : null}
          {jiraIssue?.last_comment ? (
            presentation ? (
              <div className="mt-2 rounded-md border border-line bg-surface px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink3">Контекст из Jira</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink2">{jiraIssue.last_comment}</p>
                {commentMeta ? <p className="mt-1 text-xs text-ink3">{commentMeta}</p> : null}
              </div>
            ) : (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-ink2">Контекст из Jira</summary>
              <p className="mt-1 whitespace-pre-wrap rounded border border-line bg-surface px-2 py-2 text-xs text-ink2">{jiraIssue.last_comment}</p>
              {commentMeta ? <p className="mt-1 text-xs text-ink3">{commentMeta}</p> : null}
            </details>
            )
          ) : null}
        </div>

        {canManage ? (
          <div>
            <TextareaField
              label={isJira ? "Ответ и закрытие → Jira" : "Ответ и закрытие"}
              rows={2}
              value={draft}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
            />
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
            <div className="mt-2 flex justify-end">
                <Button size="sm" intent="apply" disabled={saving || draft.trim().length === 0} onClick={() => void resolveQuestion()}>
                {saving ? <Spinner size="sm" /> : null}
                Закрыть вопрос
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ResolvedQuestionsList({ items }: { items: ScopeResolvedQuestion[] }) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useIncrementalList(items);
  if (items.length === 0) return null;

  return (
    <details className="mt-4 rounded-md border border-line bg-bg px-3 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Решённые вопросы · {items.length}
      </summary>
      <ul className="mt-3 space-y-2">
        {visibleItems.map((item) => (
          <li key={`${item.id}-${item.resolved_at}`} className="rounded border border-line bg-surface px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {item.url && item.key ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                  {item.key}
                </a>
              ) : (
                <span className="font-medium text-ink">Вручную</span>
              )}
              {item.bucket ? <Badge tone={item.section_kind === "planned" ? "info" : "warning"}>{item.section_name || item.bucket}</Badge> : null}
              <span className="text-xs text-ink3">{formatResolvedDate(item.resolved_at)}</span>
            </div>
            <p className="mt-1 text-ink2">{item.summary}</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-ink3">{item.comment}</p>
          </li>
        ))}
      </ul>
      <ScopeIncrementalFooter
        loadedCount={loadedCount}
        total={total}
        hasMore={hasMore}
        onMore={loadMore}
        itemNoun="вопросов"
      />
    </details>
  );
}

function formatResolvedDate(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function ReportColumn({
  columnKey,
  title,
  tone,
  count,
  issues,
  showTechnicalFields,
  hidePlanFields = false,
  reportComments = {},
  canManage = false,
  onSaveReportComment,
}: {
  columnKey: "in_work" | "in_test" | "done";
  title: string;
  tone: "info" | "warning" | "success";
  count: number;
  issues: ScopeBoardIssue[];
  showTechnicalFields: boolean;
  hidePlanFields?: boolean;
  reportComments?: Record<string, ScopeReportComment>;
  canManage?: boolean;
  onSaveReportComment?: (issueKey: string, text: string) => Promise<void>;
}) {
  const sortedIssues = useMemo(
    () =>
      columnKey === "done"
        ? sortDoneIssuesByRecentStatus(issues)
        : columnKey === "in_test"
          ? sortInTestReportIssues(issues)
          : issues,
    [columnKey, issues]
  );
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useIncrementalList(sortedIssues);

  return (
    <div className="bg-transparent p-0 sm:rounded-2xl sm:bg-bg/70 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <Badge tone={tone}>{count}</Badge>
      </div>
      {sortedIssues.length === 0 ? (
        <p className="rounded-lg bg-line2/40 px-3 py-4 text-center text-sm text-ink3 sm:py-5">Нет задач</p>
      ) : (
        <>
          <ul className="space-y-0 text-sm sm:space-y-3">
            {visibleItems.map((issue, index) => {
              const subgroup = columnKey === "in_test" ? inTestReportSubgroup(issue) : null;
              const previousSubgroup =
                columnKey === "in_test" && index > 0 ? inTestReportSubgroup(visibleItems[index - 1]!) : null;
              const showSubgroupHeader = subgroup != null && subgroup !== previousSubgroup;

              return (
                <Fragment key={issue.key}>
                  {showSubgroupHeader ? (
                    <li className="list-none pt-1 first:pt-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink3">
                        {IN_TEST_REPORT_SUBGROUP_LABELS[subgroup]}
                      </p>
                    </li>
                  ) : null}
                  <li className="border-t border-line bg-transparent px-0 py-3 first:border-t-0 sm:rounded-xl sm:border-t-0 sm:bg-surface/80 sm:px-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReportIssueLink issue={issue} />
                      {issue.priority ? (
                        <Badge tone={priorityBadgeTone(issue.priority)}>{issue.priority}</Badge>
                      ) : (
                        <Badge tone="neutral">—</Badge>
                      )}
                      <span className="text-xs text-ink3">{formatScopeSp(issue.story_points)} SP</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-ink2">{issue.summary}</p>
                    <div className="mt-2">
                      <RoleContributorsBadges issue={issue} showSource={showTechnicalFields} />
                      {hidePlanFields ? null : <PlanFieldBadges issue={issue} />}
                    </div>
                    {columnKey === "done" && (issue.status_entered_at || issue.status_changed_at) ? (
                      <p className="mt-2 text-xs text-ink3">
                        В «{issue.status || "Готово"}» с{" "}
                        {formatQueueTimelineDate(issue.status_entered_at || issue.status_changed_at || "")}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-ink3">
                        {[issue.status, issue.assignee].filter(Boolean).join(" · ") || "—"}
                      </p>
                    )}
                    {columnKey !== "done" ? (
                      <ReportIssueComment
                        issueKey={issue.key}
                        comment={lookupReportComment(reportComments, issue.key)}
                        canManage={canManage}
                        onSave={onSaveReportComment}
                      />
                    ) : null}
                  </li>
                </Fragment>
              );
            })}
          </ul>
          <ScopeIncrementalFooter
            loadedCount={loadedCount}
            total={total}
            hasMore={hasMore}
            onMore={loadMore}
          />
        </>
      )}
    </div>
  );
}

function ReportIssueLink({ issue }: { issue: ScopeBoardIssue }) {
  if (issue.url) {
    return (
      <a href={issue.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-accent hover:underline">
        {issue.key}
      </a>
    );
  }
  return <span className="text-sm font-medium text-ink">{issue.key}</span>;
}

function lookupReportComment(
  comments: Record<string, ScopeReportComment>,
  issueKey: string
): ScopeReportComment | undefined {
  if (!issueKey) return undefined;
  const direct = comments[issueKey];
  if (direct?.text?.trim()) return direct;
  const upper = issueKey.toUpperCase();
  const match = Object.entries(comments).find(([key, value]) => key.toUpperCase() === upper && value.text?.trim());
  return match?.[1];
}

function ReportIssueComment({
  issueKey,
  comment,
  canManage,
  onSave,
}: {
  issueKey: string;
  comment?: ScopeReportComment;
  canManage: boolean;
  onSave?: (issueKey: string, text: string) => Promise<void>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(comment?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedText = comment?.text?.trim() ?? "";
  const draftText = draft.trim();
  const isDirty = draftText !== savedText;

  useEffect(() => {
    setDraft(comment?.text ?? "");
  }, [comment?.text, issueKey]);

  const adjustHeight = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [draft, savedText, adjustHeight]);

  if (!canManage && !savedText) {
    return null;
  }

  async function persist(nextText: string) {
    if (!onSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(issueKey, nextText);
      setDraft(nextText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить комментарий.");
    } finally {
      setSaving(false);
    }
  }

  async function removeComment() {
    setDraft("");
    await persist("");
  }

  if (!canManage) {
    return (
      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink2">{savedText}</p>
    );
  }

  const canSave = Boolean(draftText) && isDirty;

  return (
    <div className="scope-print-hide mt-2">
      <div className="flex items-stretch gap-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          disabled={saving}
          placeholder="комментарий"
          className="min-h-8 w-0 min-w-0 flex-1 resize-none overflow-hidden rounded-md border border-line/70 bg-bg/40 px-2 py-1.5 text-xs leading-relaxed text-ink placeholder:text-ink4 outline-none transition-[border-color] focus:border-blue/40 disabled:opacity-60"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
        />
        <div className="flex shrink-0 flex-col gap-0.5 self-stretch">
          {canSave ? (
            <button
              type="button"
              aria-label="Сохранить комментарий"
              title="Сохранить"
              disabled={saving || !onSave}
              className="flex min-h-8 w-8 flex-1 items-center justify-center rounded-md border border-line/80 bg-surface text-sm font-semibold text-ink2 transition hover:border-blue/30 hover:text-blue disabled:opacity-40"
              onClick={() => void persist(draftText)}
            >
              {saving ? <Spinner size="sm" /> : "+"}
            </button>
          ) : null}
          {savedText ? (
            <button
              type="button"
              aria-label="Удалить комментарий"
              title="Удалить"
              disabled={saving}
              className="flex min-h-8 w-8 flex-1 items-center justify-center rounded-md border border-line/80 bg-surface text-sm font-semibold text-ink3 transition hover:border-red/30 hover:text-danger disabled:opacity-40"
              onClick={() => void removeComment()}
            >
              −
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
