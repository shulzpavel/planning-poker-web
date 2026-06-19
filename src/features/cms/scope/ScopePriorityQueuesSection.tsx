import { Fragment, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Badge,
  Button,
  DatePickerPopover,
  EmptyState,
  Spinner,
  TextareaField,
  cn,
} from "../../../design-system";
import type {
  ScopeBoardIssue,
  ScopeBoardSnapshot,
  ScopePriorityQueue,
  ScopePriorityQueueHistoryEntry,
  ScopePriorityQueueKind,
} from "../api/cmsClient";
import { formatScopeSp, jiraPriorityRank, priorityBadgeTone } from "./scopeBoardHelpers";
import {
  formatQueueTimelineDate,
  formatReorderLine,
  lastReorderForIssue,
  resolveQueueIssueMilestone,
  type QueueIssueMilestone,
} from "./scopePriorityQueueTimeline";
import { useIncrementalList } from "./scopeListPaging";
import { ScopeIncrementalFooter } from "./ScopeIncrementalFooter";
import { PlanFieldBadges } from "./scopePlanInsights";
import {
  RANKED_DROP_ZONE_ID,
  WAREHOUSE_DROP_ZONE_ID,
  computeNextRankedOrder,
  groupWarehouseIssues,
  isIssueNewOnWarehouse,
  splitPriorityQueue,
  totalWarehouseNewCounts,
} from "./scopePriorityQueueModel";

const QUEUE_META: Record<
  ScopePriorityQueueKind,
  { title: string; subtitle: string; jqlHint: string }
> = {
  todo: {
    title: "Задачи к выполнению",
    subtitle: "Приоритетная очередь задаёт значимость в Jira. Склад — новые поступления из фильтра.",
    jqlHint: "JQL для задач в работе / ready for dev",
  },
  test: {
    title: "Задачи к тестированию",
    subtitle: "Приоритетная очередь задаёт значимость в Jira. Склад — новые поступления из фильтра.",
    jqlHint: "JQL для задач в статусах тестирования",
  },
};

function emptyQueue(): ScopePriorityQueue {
  return { order: [], issues: [], history: [], warehouse_new_counts: {}, warehouse_new_keys: [] };
}

function resolveQueue(snapshot: ScopeBoardSnapshot, kind: ScopePriorityQueueKind): ScopePriorityQueue {
  const queue = snapshot.priority_queues?.[kind];
  if (!queue) return emptyQueue();
  return {
    order: queue.order ?? [],
    ranked_order: queue.ranked_order ?? [],
    issues: queue.issues ?? [],
    history: queue.history ?? [],
    warehouse_new_counts: queue.warehouse_new_counts ?? {},
    warehouse_new_keys: queue.warehouse_new_keys ?? [],
  };
}

function queueBlockToneClasses(kind: ScopePriorityQueueKind): { header: string; count: string } {
  if (kind === "test") {
    return {
      header: "bg-purple/[0.07]",
      count: "bg-purple/[0.08] text-ink",
    };
  }
  return {
    header: "bg-blue/[0.07]",
    count: "bg-blue/[0.08] text-ink",
  };
}

function formatHistoryTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function QueueNewArrivalsLabel({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge
      tone="warning"
      className="motion-safe:animate-new-badge-bob min-h-5 px-2 text-[10px] uppercase tracking-wide"
      aria-label={`${count} новых задач после обновления из Jira`}
    >
      +{count} new
    </Badge>
  );
}

export function ScopePriorityQueuesSection({
  snapshot,
  todoJql,
  testJql,
  canManage,
  onReorderQueue,
  onAddQueueComment,
  onUpdateQueueDueDate,
}: {
  snapshot: ScopeBoardSnapshot;
  todoJql: string;
  testJql: string;
  canManage: boolean;
  onReorderQueue: (queue: ScopePriorityQueueKind, order: string[], movedKey: string) => Promise<void>;
  onAddQueueComment: (queue: ScopePriorityQueueKind, issueKey: string, text: string) => Promise<void>;
  onUpdateQueueDueDate: (queue: ScopePriorityQueueKind, issueKey: string, dueDate: string) => Promise<void>;
}) {
  return (
    <div className="min-w-0 space-y-5">
      <PriorityQueueBlock
        kind="todo"
        queue={resolveQueue(snapshot, "todo")}
        jql={todoJql}
        canManage={canManage}
        onReorderQueue={onReorderQueue}
        onAddQueueComment={onAddQueueComment}
        onUpdateQueueDueDate={onUpdateQueueDueDate}
      />
      <PriorityQueueBlock
        kind="test"
        queue={resolveQueue(snapshot, "test")}
        jql={testJql}
        canManage={canManage}
        onReorderQueue={onReorderQueue}
        onAddQueueComment={onAddQueueComment}
        onUpdateQueueDueDate={onUpdateQueueDueDate}
      />
    </div>
  );
}

function PriorityQueueBlock({
  kind,
  queue,
  jql,
  canManage,
  onReorderQueue,
  onAddQueueComment,
  onUpdateQueueDueDate,
}: {
  kind: ScopePriorityQueueKind;
  queue: ScopePriorityQueue;
  jql: string;
  canManage: boolean;
  onReorderQueue: (queue: ScopePriorityQueueKind, order: string[], movedKey: string) => Promise<void>;
  onAddQueueComment: (queue: ScopePriorityQueueKind, issueKey: string, text: string) => Promise<void>;
  onUpdateQueueDueDate: (queue: ScopePriorityQueueKind, issueKey: string, dueDate: string) => Promise<void>;
}) {
  const meta = QUEUE_META[kind];
  const blockTone = queueBlockToneClasses(kind);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const split = useMemo(() => splitPriorityQueue(queue), [queue]);
  const warehouseGroups = useMemo(
    () => groupWarehouseIssues(split.warehouseIssues, split.warehouseNewKeys, split.warehouseNewCounts),
    [split.warehouseIssues, split.warehouseNewKeys, split.warehouseNewCounts]
  );
  const warehouseNewTotal = totalWarehouseNewCounts(split.warehouseNewCounts);
  const { visibleItems: visibleRanked, hasMore, loadMore, loadedCount, total } = useIncrementalList(split.rankedIssues);
  const sortableIds = useMemo(() => visibleRanked.map((issue) => issue.key), [visibleRanked]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function saveRankedOrder(nextOrder: string[], movedKey: string) {
    setReordering(true);
    setReorderError(null);
    try {
      await onReorderQueue(kind, nextOrder, movedKey);
    } catch (err) {
      setReorderError(err instanceof Error ? err.message : "Не удалось сохранить порядок.");
    } finally {
      setReordering(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canManage || reordering) return;
    const activeKey = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    const nextOrder = computeNextRankedOrder(split.rankedOrder, activeKey, overId);
    if (!nextOrder) return;
    void saveRankedOrder(nextOrder, activeKey);
  }

  return (
    <details className="min-w-0 overflow-hidden rounded-2xl bg-surface shadow-card">
      <summary className={cn("cursor-pointer list-none px-4 py-4 marker:content-none sm:px-5", blockTone.header)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
            <div>
              <p className="text-base font-semibold text-ink">{meta.title}</p>
              <p className="mt-0.5 text-xs text-ink3">{meta.jqlHint}</p>
            </div>
            <QueueNewArrivalsLabel count={warehouseNewTotal} />
          </div>
          <span className={cn("rounded-full px-3 py-1 text-sm font-semibold tabular-nums shadow-sm", blockTone.count)}>
            {queue.issues.length} задач
          </span>
        </div>
      </summary>
      <div className="space-y-6 px-4 py-5 sm:px-5">
        <p className="text-sm text-ink2">{meta.subtitle}</p>
        {jql.trim() ? (
          <p className="break-all rounded-md border border-line bg-bg px-3 py-2 font-mono text-xs text-ink3">{jql.trim()}</p>
        ) : (
          <p className="text-xs text-ink3">JQL не задан — добавьте в «Настройки и JQL» и нажмите «Обновить из Jira».</p>
        )}

        {reorderError ? <p className="text-sm text-danger">{reorderError}</p> : null}
        {reordering ? (
          <p className="flex items-center gap-2 text-sm text-ink3">
            <Spinner size="sm" />
            Сохраняем порядок и значимость в Jira…
          </p>
        ) : null}

        {queue.issues.length === 0 ? (
          <EmptyState title="Список пуст" description={`Задайте JQL (${meta.jqlHint}) и обновите board из Jira.`} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <RankedQueueSection
              issues={visibleRanked}
              allRankedCount={split.rankedIssues.length}
              sortableIds={sortableIds}
              history={queue.history}
              canManage={canManage}
              reordering={reordering}
              hasMore={hasMore}
              loadedCount={loadedCount}
              total={total}
              onLoadMore={loadMore}
              onAddComment={(issueKey, text) => onAddQueueComment(kind, issueKey, text)}
              onUpdateDueDate={(issueKey, dueDate) => onUpdateQueueDueDate(kind, issueKey, dueDate)}
            />
            <WarehouseSection
              groups={warehouseGroups}
              history={queue.history}
              canManage={canManage}
              reordering={reordering}
              newKeys={split.warehouseNewKeys}
              onAddComment={(issueKey, text) => onAddQueueComment(kind, issueKey, text)}
              onUpdateDueDate={(issueKey, dueDate) => onUpdateQueueDueDate(kind, issueKey, dueDate)}
            />
          </DndContext>
        )}
      </div>
    </details>
  );
}

function RankedQueueSection({
  issues,
  allRankedCount,
  sortableIds,
  history,
  canManage,
  reordering,
  hasMore,
  loadedCount,
  total,
  onLoadMore,
  onAddComment,
  onUpdateDueDate,
}: {
  issues: ScopeBoardIssue[];
  allRankedCount: number;
  sortableIds: string[];
  history: ScopePriorityQueueHistoryEntry[];
  canManage: boolean;
  reordering: boolean;
  hasMore: boolean;
  loadedCount: number;
  total: number;
  onLoadMore: () => void;
  onAddComment: (issueKey: string, text: string) => Promise<void>;
  onUpdateDueDate: (issueKey: string, dueDate: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: RANKED_DROP_ZONE_ID });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-2xl border border-line bg-bg/40 p-4 transition-colors",
        isOver && "border-blue/40 bg-blue/[0.03]"
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Приоритетная очередь</p>
          <p className="text-xs text-ink3">Порядок = значимость в Jira</p>
        </div>
        <Badge tone="info">{allRankedCount}</Badge>
      </div>

      {allRankedCount === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink3">
          Перетащите задачи со склада, чтобы задать значимость.
        </p>
      ) : (
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <ol className="space-y-4">
            {issues.map((issue, index) => (
              <SortableQueueIssueCard
                key={issue.key}
                issue={issue}
                index={index}
                history={history}
                canManage={canManage}
                draggable={canManage && !reordering}
                showSignificance
                onAddComment={(text) => onAddComment(issue.key, text)}
                onUpdateDueDate={(dueDate) => onUpdateDueDate(issue.key, dueDate)}
              />
            ))}
          </ol>
        </SortableContext>
      )}
      {allRankedCount > 0 ? (
        <ScopeIncrementalFooter
          loadedCount={loadedCount}
          total={total}
          hasMore={hasMore}
          onMore={onLoadMore}
        />
      ) : null}
    </section>
  );
}

function WarehouseSection({
  groups,
  history,
  canManage,
  reordering,
  newKeys,
  onAddComment,
  onUpdateDueDate,
}: {
  groups: ReturnType<typeof groupWarehouseIssues>;
  history: ScopePriorityQueueHistoryEntry[];
  canManage: boolean;
  reordering: boolean;
  newKeys: Set<string>;
  onAddComment: (issueKey: string, text: string) => Promise<void>;
  onUpdateDueDate: (issueKey: string, dueDate: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: WAREHOUSE_DROP_ZONE_ID });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-2xl border border-line bg-bg/20 p-4 transition-colors",
        isOver && "border-amber/60 bg-amber/[0.03]"
      )}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold text-ink">Склад задач</p>
        <p className="text-xs text-ink3">Новые поступления — перетащите в очередь</p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink3">
          Склад пуст — все задачи уже в приоритетной очереди.
        </p>
      ) : (
        <ol className="space-y-4">
          {groups.map((group) => (
            <Fragment key={group.type}>
              <QueueGroupDivider label={group.label} count={group.issues.length} newCount={group.newCount} />
              {group.issues.map((issue) => (
                <WarehouseIssueCard
                  key={issue.key}
                  issue={issue}
                  history={history}
                  canManage={canManage}
                  draggable={canManage && !reordering}
                  isNew={isIssueNewOnWarehouse(issue.key, newKeys)}
                  onAddComment={(text) => onAddComment(issue.key, text)}
                  onUpdateDueDate={(dueDate) => onUpdateDueDate(issue.key, dueDate)}
                />
              ))}
            </Fragment>
          ))}
        </ol>
      )}
    </section>
  );
}

function QueueGroupDivider({
  label,
  count,
  newCount = 0,
}: {
  label: string;
  count: number;
  newCount?: number;
}) {
  return (
    <li className="list-none pb-3 pt-6 first:pt-1" aria-label={`${label}: ${count}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink3">
        <span className="rounded-full bg-line2/60 px-2.5 py-1">
          {label} · {count}
        </span>
        {newCount > 0 ? (
          <Badge tone="warning" className="min-h-5 px-1.5 text-[10px] uppercase tracking-wide">
            +{newCount} new
          </Badge>
        ) : null}
      </div>
    </li>
  );
}

function WarehouseIssueCard({
  issue,
  history,
  canManage,
  draggable,
  isNew,
  onAddComment,
  onUpdateDueDate,
}: {
  issue: ScopeBoardIssue;
  history: ScopePriorityQueueHistoryEntry[];
  canManage: boolean;
  draggable: boolean;
  isNew: boolean;
  onAddComment: (text: string) => Promise<void>;
  onUpdateDueDate: (dueDate: string) => Promise<void>;
}) {
  const drag = useDraggable({ id: issue.key, disabled: !draggable });
  const style = {
    transform: CSS.Translate.toString(drag.transform),
    opacity: drag.isDragging ? 0.72 : 1,
  };

  return (
    <li ref={drag.setNodeRef} style={style} className="list-none">
      <QueueIssueCard
        issue={issue}
        index={-1}
        history={history}
        canManage={canManage}
        isNew={isNew}
        dragHandleProps={
          draggable
            ? {
                attributes: drag.attributes as unknown as Record<string, unknown>,
                listeners: drag.listeners as unknown as Record<string, unknown>,
                isDragging: drag.isDragging,
              }
            : undefined
        }
        onAddComment={onAddComment}
        onUpdateDueDate={onUpdateDueDate}
      />
    </li>
  );
}

function SortableQueueIssueCard({
  issue,
  index,
  history,
  canManage,
  draggable,
  showSignificance,
  onAddComment,
  onUpdateDueDate,
}: {
  issue: ScopeBoardIssue;
  index: number;
  history: ScopePriorityQueueHistoryEntry[];
  canManage: boolean;
  draggable: boolean;
  showSignificance?: boolean;
  onAddComment: (text: string) => Promise<void>;
  onUpdateDueDate: (dueDate: string) => Promise<void>;
}) {
  const sortable = useSortable({ id: issue.key, disabled: !draggable });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.72 : 1,
  };

  return (
    <li ref={sortable.setNodeRef} style={style} className="list-none">
      <QueueIssueCard
        issue={issue}
        index={index}
        history={history}
        canManage={canManage}
        showSignificance={showSignificance}
        dragHandleProps={
          draggable
            ? {
                attributes: sortable.attributes as unknown as Record<string, unknown>,
                listeners: sortable.listeners as unknown as Record<string, unknown>,
                isDragging: sortable.isDragging,
              }
            : undefined
        }
        onAddComment={onAddComment}
        onUpdateDueDate={onUpdateDueDate}
      />
    </li>
  );
}

function QueueIssueCard({
  issue,
  index,
  history,
  canManage,
  dragHandleProps,
  showSignificance = false,
  isNew = false,
  onAddComment,
  onUpdateDueDate,
}: {
  issue: ScopeBoardIssue;
  index: number;
  history: ScopePriorityQueueHistoryEntry[];
  canManage: boolean;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    isDragging: boolean;
  };
  showSignificance?: boolean;
  isNew?: boolean;
  onAddComment: (text: string) => Promise<void>;
  onUpdateDueDate: (dueDate: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDateDraft, setDueDateDraft] = useState(toDateInputValue(issue.due_date));
  const [savingDueDate, setSavingDueDate] = useState(false);
  const [dueDateError, setDueDateError] = useState<string | null>(null);
  const milestone = useMemo(() => resolveQueueIssueMilestone(issue, history), [issue, history]);
  const lastReorder = useMemo(() => lastReorderForIssue(history, issue.key), [history, issue.key]);
  const significance = issue.significance ?? (index >= 0 ? index + 1 : null);

  useEffect(() => {
    setDueDateDraft(toDateInputValue(issue.due_date));
  }, [issue.due_date]);

  async function submitComment() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onAddComment(text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить комментарий.");
    } finally {
      setSaving(false);
    }
  }

  async function submitDueDate(nextDueDate: string) {
    if (!nextDueDate || savingDueDate) return;
    setDueDateDraft(nextDueDate);
    setSavingDueDate(true);
    setDueDateError(null);
    try {
      await onUpdateDueDate(nextDueDate);
    } catch (err) {
      setDueDateDraft(toDateInputValue(issue.due_date));
      setDueDateError(err instanceof Error ? err.message : "Не удалось сохранить срок исполнения.");
    } finally {
      setSavingDueDate(false);
    }
  }

  const toneClasses = queueIssueToneClasses(issue);

  return (
    <div
      className={cn(
        "relative min-w-0 max-w-full rounded-xl bg-surface px-3 py-5 shadow-card ring-1 sm:px-5",
        isNew ? "bg-amber/[0.05] ring-amber/55" : "ring-line/50"
      )}
    >
      <span
        className={cn(
          "absolute inset-y-5 left-0 w-1 rounded-r-full",
          isNew ? "bg-amber/70" : toneClasses.rail
        )}
        aria-hidden="true"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <div className="flex min-w-0 gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5">
            {dragHandleProps ? (
              <button
                type="button"
                className={cn(
                  "inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-md bg-line2/70 text-xs text-ink3 transition-colors active:cursor-grabbing",
                  dragHandleProps.isDragging && "bg-blue/10 text-blue"
                )}
                aria-label="Перетащить"
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
              >
                ⋮⋮
              </button>
            ) : null}
            {index >= 0 ? (
              <span
                className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums", toneClasses.index)}
                aria-label={`Позиция ${index + 1}`}
              >
                {index + 1}
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <IssueLink issue={issue} className="text-sm" />
                {isNew ? (
                  <Badge
                    tone="warning"
                    className="motion-safe:animate-new-badge-bob min-h-5 px-1.5 text-[10px] uppercase tracking-wide"
                  >
                    NEW
                  </Badge>
                ) : null}
                {showSignificance && significance ? (
                  <Badge tone="warning" className="min-h-5 px-2 text-[11px] tabular-nums">
                    Значимость {significance}
                  </Badge>
                ) : null}
              </div>
              <QueueIssueSpBadge storyPoints={issue.story_points} />
            </div>

            <p className="break-words text-sm font-medium leading-snug text-ink">{issue.summary}</p>

            <QueueIssueMetaRow issue={issue} />
            <PlanFieldBadges issue={issue} />
            <QueueIssueDueDate
              dueDate={issue.due_date}
              value={dueDateDraft}
              canManage={canManage}
              saving={savingDueDate}
              error={dueDateError}
              onChange={(dueDate) => void submitDueDate(dueDate)}
            />
            <EpicCountryBadges labels={issue.epic_labels} />

            <QueueMilestoneLine milestone={milestone} />

            {issue.grooming_comment ? (
              <div className={cn("rounded-md border border-l-[3px] bg-surface px-2.5 py-2", toneClasses.grooming)}>
                <p className="text-xs leading-snug text-ink">
                  <span className={cn("font-semibold", toneClasses.accent)}>Груминг: </span>
                  {issue.grooming_comment}
                </p>
                {issue.grooming_comment_by ? (
                  <p className="mt-1 text-[11px] text-ink3">
                    {issue.grooming_comment_by}
                    {issue.grooming_comment_at ? ` · ${formatHistoryTime(issue.grooming_comment_at)}` : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {lastReorder || issue.assignee ? (
              <p className="text-[11px] leading-snug text-ink3/90">
                {issue.assignee ? <span>{issue.assignee}</span> : null}
                {issue.assignee && lastReorder ? <span className="mx-1.5 text-ink3/50">·</span> : null}
                {lastReorder ? <span>{formatReorderLine(lastReorder)}</span> : null}
              </p>
            ) : null}
          </div>
        </div>

        {canManage ? (
          <div className="rounded-lg p-1 lg:p-0">
            <TextareaField
              label="Комментарий → Jira"
              rows={2}
              value={draft}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
            />
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="ghost" disabled={saving || draft.trim().length === 0} onClick={() => void submitComment()}>
                {saving ? <Spinner size="sm" /> : null}
                Добавить комментарий
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QueueIssueSpBadge({ storyPoints }: { storyPoints: number | null | undefined }) {
  const hasEstimate = storyPoints !== null && storyPoints !== undefined && !Number.isNaN(storyPoints);
  const label = `${formatScopeSp(storyPoints)} SP`;

  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        hasEstimate ? "bg-line2 text-ink" : "border border-dashed border-line text-ink3/80"
      )}
      title={hasEstimate ? "Story points" : "Оценка не задана"}
    >
      {label}
    </span>
  );
}

function queueIssueTypeTone(issue: ScopeBoardIssue): "story" | "bug" | "epic" | "task" {
  const type = (issue.issue_type || "").trim().toLowerCase();
  if (type === "story" || type === "user story" || type === "история") return "story";
  if (type === "bug" || type === "баг" || type === "defect" || type === "ошибка") return "bug";
  if (type === "epic" || type === "эпик") return "epic";
  return "task";
}

function queueIssueToneClasses(issue: ScopeBoardIssue): {
  rail: string;
  index: string;
  grooming: string;
  accent: string;
} {
  const tone = queueIssueTypeTone(issue);
  if (tone === "story") {
    return {
      rail: "bg-green/70",
      index: "bg-line2 text-ink",
      grooming: "border-green/25 border-l-green/65",
      accent: "text-ink",
    };
  }
  if (tone === "bug") {
    return {
      rail: "bg-red/70",
      index: "bg-line2 text-ink",
      grooming: "border-red/25 border-l-red/65",
      accent: "text-ink",
    };
  }
  if (tone === "epic") {
    return {
      rail: "bg-purple/70",
      index: "bg-line2 text-ink",
      grooming: "border-purple/25 border-l-purple/65",
      accent: "text-ink",
    };
  }
  return {
    rail: "bg-blue/70",
    index: "bg-line2 text-ink",
    grooming: "border-blue/25 border-l-blue/65",
    accent: "text-ink",
  };
}

function formatQueueDate(value: string): string {
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return value;
  }
}

function toDateInputValue(value: string | null | undefined): string {
  const cleaned = value?.trim();
  if (!cleaned) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function QueueIssueDueDate({
  dueDate,
  value,
  canManage,
  saving,
  error,
  onChange,
}: {
  dueDate?: string | null;
  value: string;
  canManage: boolean;
  saving: boolean;
  error: string | null;
  onChange: (dueDate: string) => void;
}) {
  const dueValue = dueDate?.trim();
  const displayValue = dueValue ? formatQueueDate(dueValue) : "не задан";
  if (!canManage) {
    return (
      <p className="text-xs text-ink3">
        <span>Срок исполнения: </span>
        <span className={cn("font-semibold tabular-nums", dueValue ? "text-ink" : "text-ink3")}>{displayValue}</span>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <DatePickerPopover
          value={value}
          label="Срок исполнения"
          placeholder="не задан"
          disabled={saving}
          loading={saving}
          className="max-w-full"
          onChange={onChange}
        />
        {saving ? <Spinner size="sm" /> : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

const COUNTRY_LABELS: Record<string, { flag: string; label: string }> = {
  brazil: { flag: "🇧🇷", label: "Brazil" },
  brasil: { flag: "🇧🇷", label: "Brazil" },
  mexico: { flag: "🇲🇽", label: "Mexico" },
  "méxico": { flag: "🇲🇽", label: "Mexico" },
};

const CORE_COUNTRIES = [COUNTRY_LABELS.brazil, COUNTRY_LABELS.mexico];

function EpicCountryBadges({ labels }: { labels?: string[] }) {
  const countries = (labels ?? []).flatMap((label) => {
    const normalized = label.trim().toLowerCase();
    if (normalized === "core") {
      return CORE_COUNTRIES;
    }
    const country = COUNTRY_LABELS[normalized];
    return country ? [country] : [];
  });

  if (countries.length === 0) return null;

  const uniqueCountries = Array.from(new Map(countries.map((country) => [country.label, country])).values());
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {uniqueCountries.map((country) => (
        <span
          key={country.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink2"
          title={`Метка эпика: ${country.label}`}
        >
          <span aria-hidden="true">{country.flag}</span>
          {country.label}
        </span>
      ))}
    </div>
  );
}

function QueueIssueMetaRow({ issue }: { issue: ScopeBoardIssue }) {
  const priorityRank = jiraPriorityRank(issue.priority);
  const showPriorityBadge = issue.priority && priorityRank <= 2;

  if (!issue.status && !issue.priority) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {issue.status ? (
        <span className="text-xs text-ink3">{issue.status}</span>
      ) : null}
      {showPriorityBadge ? (
        <Badge tone={priorityBadgeTone(issue.priority)} className="min-h-5 px-1.5 text-[11px]">
          {issue.priority}
        </Badge>
      ) : issue.priority ? (
        <span className="text-xs text-ink3">· {issue.priority}</span>
      ) : null}
    </div>
  );
}

function QueueMilestoneLine({ milestone }: { milestone: QueueIssueMilestone }) {
  const hasDate = Boolean(milestone.at);
  const statusLabel = milestone.statusName ? `«${milestone.statusName}»` : "фильтре";
  const dateLabel = hasDate ? formatQueueTimelineDate(milestone.at) : null;

  return (
    <div className="max-w-full">
      {hasDate ? (
        <p className="inline-flex max-w-full flex-wrap rounded-full bg-line2/60 px-3 py-1.5 text-xs leading-snug text-ink">
          <span className="text-ink3">В статусе {statusLabel} с{"\u00a0\u00a0"}</span>
          <span className="font-semibold tabular-nums text-ink">{dateLabel}</span>
        </p>
      ) : (
        <p className="inline-flex max-w-full flex-wrap rounded-full bg-line2/60 px-3 py-1.5 text-xs leading-snug text-ink2">
          <span className="text-ink2">В очереди в {statusLabel}</span>
          <span className="text-ink3"> · дата перехода не найдена в Jira</span>
        </p>
      )}
    </div>
  );
}

function IssueLink({ issue, className }: { issue: ScopeBoardIssue; className?: string }) {
  const classes = cn("font-semibold text-blue hover:underline", className);
  if (issue.url) {
    return (
      <a href={issue.url} target="_blank" rel="noreferrer" className={classes}>
        {issue.key}
      </a>
    );
  }
  return <span className={cn("font-semibold text-ink", className)}>{issue.key}</span>;
}
