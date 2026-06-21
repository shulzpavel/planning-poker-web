import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Alert,
  AiGenerationProgress,
  AiSparkleButton,
  Badge,
  Button,
  DropdownField,
  EmptyState,
  Spinner,
  Surface,
  TextField,
  TextareaField,
  cn,
  useToast,
} from "../../../design-system";
import {
  cmsScopeApi,
  type ScopeAiAnalyzeResult,
  type ScopeAnalyzeStartResponse,
  type ScopeBoardIssue,
  type ScopeBoardRecord,
  type ScopeBoardSnapshot,
  type ScopePriorityQueueKind,
  type ScopeReleaseQuery,
  type ScopeReleaseSlot,
} from "../api/cmsClient";
import { AI_JOB_POLL_INTERVAL_MS, pollAiJob, SCOPE_AI_POLL_TIMEOUT_MS } from "../../../shared/lib/pollAiJob";
import type { CmsPrincipal } from "../api/cmsTypes";
import {
  FilterBar,
  HelpCallout,
  InlineError,
  MobileFeatureCard,
  MobileMetricTile,
  MobilePageHero,
  MobileRecordCard,
  MobileRecordField,
  SectionHeader,
  Skeleton,
} from "../components/CmsPrimitives";
import { cmsMobileSectionShell, cmsSectionHeaderPad, cmsMobileSurface } from "../components/cmsMobileLayout";
import { TeamBadge } from "../components/TeamBadge";
import { TeamFilter, teamFilterParams } from "../components/TeamFilter";
import {
  TeamSelect,
  useTeamIdState,
} from "../components/TeamSelect";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useCmsTeams } from "../hooks/useCmsTeams";
import { ListTableSurface, TeamGroupedSections } from "../components/TeamGroupedSections";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import {
  buildWorkloadAttentionIssues,
  currentMonthValue,
  computeScopeReport,
  formatScopeDisplayMonth,
  formatScopeSp,
  intakeStatusMeta,
  normalizeScopeReport,
  resolveOpenQuestions,
  roleAttentionReasons,
  resolveJiraRoleFieldsConfigured,
  workloadAttentionReasons,
} from "./scopeBoardHelpers";
import { ScopeActivityFeed } from "./ScopeActivityFeed";
import { ScopeAiPanel } from "./ScopeAiPanel";
import {
  normalizePlanEpicKey,
  pollScopeAiJiraExport,
} from "./scopeAiJiraExport";
import { ScopeBoardHeader, ScopeBoardMetaSeparator } from "./ScopeBoardHeader";
import { ScopeFloatingTodo } from "./ScopeFloatingTodo";
import { ScopeIncrementalFooter } from "./ScopeIncrementalFooter";
import { ScopePriorityQueuesSection } from "./ScopePriorityQueuesSection";
import { ScopeReportSection } from "./ScopeReportSection";
import { ScopeTopItemsSection } from "./ScopeTopItemsSection";
import { ScopeSectionEditor } from "./ScopeSectionEditor";
import { ScopeAssigneeCharts } from "./ScopeAssigneeCharts";
import { ScopePlanInsights, planChangeReasonLabel } from "./scopePlanInsights";
import { mergeScopeBoardRecord } from "./scopeBoardMerge";
import { ScopeFlowPaceSection } from "./ScopeFlowPaceSection";
import { shouldShowFlowPaceBlock } from "./scopeFlowPaceHelpers";
import { ScopeVisualDashboard, type ScopeDataQualityDetails, type ScopeReportSummary } from "./ScopeVisualDashboard";
import { SortableScopeBlock } from "./SortableScopeBlock";
import {
  ScopePresentationEnterButton,
  ScopePresentationLayer,
  ScopePresentationTile,
  presentationCloseDelayMs,
} from "./ScopePresentationLayer";
import {
  DEFAULT_SCOPE_LAYOUT_ORDER,
  mergeScopeLayoutOrder,
  reorderScopeLayoutOrder,
  type ScopeLayoutBlockKey,
} from "./scopeLayoutOrder";
import {
  defaultScopeSections,
  isReleaseTemplateTeam,
  normalizeScopeSectionOrder,
  resolveScopeSections,
  resolveSnapshotSections,
  validateScopeSections,
} from "./scopeSectionHelpers";
import { useIncrementalList } from "./scopeListPaging";
import type { ScopeAiSummary, ScopeAiHistoryEntry } from "./scopeAiTypes";
import { printScopeReport } from "./scopeReportPrint";
import {
  filterScopePresentationOrder,
  isScopePresentationDesktop,
  scopePresentationGridClass,
} from "./scopePresentationMode";
import type { ScopeSectionConfig, ScopeWorkloadMode } from "../api/cmsClient";
import WorkloadModePicker, { DEFAULT_SCOPE_WORKLOAD_MODE } from "./WorkloadModePicker";

interface ScopeBoardShellProps {
  principal: CmsPrincipal;
  canManage: boolean;
}

interface ScopeBoardForm {
  name: string;
  month: string;
  capacity_sp: string;
  capacity_sp_dev: string;
  capacity_sp_test: string;
  workload_mode: ScopeWorkloadMode;
  scope_sections: ScopeSectionConfig[];
  todo_jql: string;
  test_jql: string;
  previous_release_jql: string;
  next_release_jql: string;
  custom_release_name: string;
  custom_release_jql: string;
  release_queries: ScopeReleaseQuery[];
  release_comment: string;
  previous_release_comment: string;
  next_release_comment: string;
  custom_release_comment: string;
  plan_epic_key: string;
}

function createReleaseQuery(type: ScopeReleaseQuery["type"] = "future"): ScopeReleaseQuery {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `release-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, type, label: "", jql: "" };
}

function normalizeReleaseQueries(
  queries: ScopeReleaseQuery[] | null | undefined,
  legacy?: {
    previous_release_jql?: string;
    next_release_jql?: string;
    custom_release_name?: string;
    custom_release_jql?: string;
  },
): ScopeReleaseQuery[] {
  const normalized: ScopeReleaseQuery[] = (queries ?? [])
    .filter((query) => query && typeof query.jql === "string")
    .map((query, index) => ({
      id: query.id || `release-${index + 1}`,
      type: query.type === "past" ? "past" : "future",
      label: query.label ?? "",
      jql: query.jql ?? "",
    }));
  if (normalized.length > 0) return normalized;

  const legacyQueries: ScopeReleaseQuery[] = [];
  if (legacy?.previous_release_jql?.trim()) {
    legacyQueries.push({ id: "previous", type: "past", label: "Предыдущий релиз", jql: legacy.previous_release_jql });
  }
  if (legacy?.next_release_jql?.trim()) {
    legacyQueries.push({ id: "next", type: "future", label: "Следующий релиз", jql: legacy.next_release_jql });
  }
  if (legacy?.custom_release_jql?.trim()) {
    legacyQueries.push({
      id: "custom",
      type: "future",
      label: legacy.custom_release_name?.trim() || "Дополнительный релиз",
      jql: legacy.custom_release_jql,
    });
  }
  return legacyQueries;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatCreated(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU");
  } catch {
    return iso;
  }
}

function resolveCapacityFields(board: ScopeBoardRecord): { dev: string; test: string } {
  const fallback = String(board.capacity_sp);
  return {
    dev: board.capacity_sp_dev != null ? String(board.capacity_sp_dev) : fallback,
    test: board.capacity_sp_test != null ? String(board.capacity_sp_test) : fallback,
  };
}

function boardToForm(board: ScopeBoardRecord): ScopeBoardForm {
  const legacyReleaseQueries = normalizeReleaseQueries(board.release_queries, {
    previous_release_jql: board.previous_release_jql ?? "",
    next_release_jql: board.next_release_jql ?? "",
    custom_release_name: board.custom_release_name ?? "",
    custom_release_jql: board.custom_release_jql ?? "",
  });
  const capacities = resolveCapacityFields(board);
  return {
    name: board.name,
    month: board.month,
    capacity_sp: String(board.capacity_sp),
    capacity_sp_dev: capacities.dev,
    capacity_sp_test: capacities.test,
    workload_mode: board.workload_mode ?? DEFAULT_SCOPE_WORKLOAD_MODE,
    scope_sections: normalizeScopeSectionOrder(resolveScopeSections(board)),
    todo_jql: board.todo_jql ?? "",
    test_jql: board.test_jql ?? "",
    previous_release_jql: legacyReleaseQueries.length > 0 ? "" : board.previous_release_jql ?? "",
    next_release_jql: legacyReleaseQueries.length > 0 ? "" : board.next_release_jql ?? "",
    custom_release_name: legacyReleaseQueries.length > 0 ? "" : board.custom_release_name ?? "",
    custom_release_jql: legacyReleaseQueries.length > 0 ? "" : board.custom_release_jql ?? "",
    release_queries: legacyReleaseQueries,
    release_comment: board.release_comment ?? "",
    previous_release_comment: board.previous_release_comment ?? "",
    next_release_comment: board.next_release_comment ?? "",
    custom_release_comment: board.custom_release_comment ?? "",
    plan_epic_key: board.plan_epic_key ?? "",
  };
}

function defaultForm(): ScopeBoardForm {
  return {
    name: "",
    month: currentMonthValue(),
    capacity_sp: "80",
    capacity_sp_dev: "80",
    capacity_sp_test: "80",
    workload_mode: DEFAULT_SCOPE_WORKLOAD_MODE,
    scope_sections: defaultScopeSections(),
    todo_jql: "",
    test_jql: "",
    previous_release_jql: "",
    next_release_jql: "",
    custom_release_name: "",
    custom_release_jql: "",
    release_queries: [],
    release_comment: "",
    previous_release_comment: "",
    next_release_comment: "",
    custom_release_comment: "",
    plan_epic_key: "",
  };
}

function parseCapacity(raw: string): number | null {
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function sumIssueSp(issues: ScopeBoardIssue[]): number {
  return issues.reduce((sum, issue) => {
    const sp = issue.story_points;
    return sum + (typeof sp === "number" && sp > 0 ? sp : 0);
  }, 0);
}

function buildReportSummary(snapshot: ScopeBoardSnapshot): ScopeReportSummary {
  const report = snapshot.report ? normalizeScopeReport(snapshot.report) : computeScopeReport(snapshot);
  const sections = report.sections ?? [report.plan, report.unplan];
  return sections.reduce<ScopeReportSummary>(
    (summary, section) => ({
      inWorkSp: summary.inWorkSp + sumIssueSp(section.in_work ?? []),
      doneSp: summary.doneSp + sumIssueSp(section.done ?? []),
    }),
    { inWorkSp: 0, doneSp: 0 }
  );
}

function buildDataQualityDetails(
  snapshot: ScopeBoardSnapshot,
  workloadMode: ScopeWorkloadMode = DEFAULT_SCOPE_WORKLOAD_MODE,
): ScopeDataQualityDetails {
  const splitMode = workloadMode === "sp_dev_test";
  const jiraRoleFieldsConfigured = resolveJiraRoleFieldsConfigured(snapshot);
  const attentionIssues = splitMode
    ? buildWorkloadAttentionIssues(snapshot)
    : (snapshot.metrics?.unestimated_tasks ?? []);
  const unestimated = attentionIssues.map((issue) => {
    const backendReasons = (issue as ScopeBoardIssue & { workload_attention_reasons?: string[] }).workload_attention_reasons;
    const reasons = splitMode ? backendReasons ?? workloadAttentionReasons(issue) : undefined;
    return {
      key: issue.key,
      summary: issue.summary,
      url: issue.url,
      status: issue.status,
      section: issue.section_name || issue.bucket,
      storyPoints: issue.story_points,
      reasons,
    };
  });
  const roleByKey = new Map<string, ScopeDataQualityDetails["roleIssues"][number]>();

  for (const section of resolveSnapshotSections(snapshot)) {
    for (const issue of section.issues) {
      const reasons = roleAttentionReasons(issue, { jiraRoleFieldsConfigured });
      if (reasons.length === 0) continue;
      const existing = roleByKey.get(issue.key);
      const mergedReasons = Array.from(new Set([...(existing?.reasons ?? []), ...reasons]));
      roleByKey.set(issue.key, {
        key: issue.key,
        summary: issue.summary,
        url: issue.url,
        status: issue.status,
        section: issue.section_name || section.name,
        storyPoints: issue.story_points,
        reasons: mergedReasons,
      });
    }
  }

  return {
    unestimated,
    roleIssues: Array.from(roleByKey.values()),
  };
}

function applyWorkloadModeChange(form: ScopeBoardForm, workload_mode: ScopeWorkloadMode): ScopeBoardForm {
  if (workload_mode !== "sp_dev_test") {
    return { ...form, workload_mode };
  }
  return {
    ...form,
    workload_mode,
    capacity_sp_dev: form.capacity_sp_dev || form.capacity_sp,
    capacity_sp_test: form.capacity_sp_test || form.capacity_sp,
  };
}

function ScopeCapacityFields({
  form,
  disabled,
  onChange,
}: {
  form: ScopeBoardForm;
  disabled: boolean;
  onChange: (patch: Partial<ScopeBoardForm>) => void;
}) {
  if (form.workload_mode === "sp_dev_test") {
    return (
      <>
        <TextField
          label="Capacity SP Dev"
          inputMode="decimal"
          value={form.capacity_sp_dev}
          disabled={disabled}
          onChange={(event) => onChange({ capacity_sp_dev: event.target.value })}
        />
        <TextField
          label="Capacity SP Test"
          inputMode="decimal"
          value={form.capacity_sp_test}
          disabled={disabled}
          onChange={(event) => onChange({ capacity_sp_test: event.target.value })}
        />
      </>
    );
  }

  return (
    <TextField
      label="Capacity (SP)"
      inputMode="decimal"
      value={form.capacity_sp}
      disabled={disabled}
      onChange={(event) => onChange({ capacity_sp: event.target.value })}
    />
  );
}

export default function ScopeBoardShell({ principal, canManage }: ScopeBoardShellProps) {
  return (
    <Routes>
      <Route index element={<ScopeBoardListPage principal={principal} canManage={canManage} />} />
      <Route path="new" element={<ScopeBoardEditorPage principal={principal} canManage={canManage} mode="create" />} />
      <Route path=":boardId" element={<ScopeBoardEditorPage principal={principal} canManage={canManage} mode="edit" />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

function ScopeBoardListPage({ principal, canManage }: { principal: CmsPrincipal; canManage: boolean }) {
  const navigate = useNavigate();
  const { teams } = useCmsTeams(principal);
  const [teamFilter, setTeamFilter] = useState("");
  const debouncedTeamFilter = useDebouncedValue(teamFilter, 300);
  const [items, setItems] = useState<ScopeBoardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cmsScopeApi.list({
        ...teamFilterParams(debouncedTeamFilter),
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить отчёты.");
    } finally {
      setLoading(false);
    }
  }, [debouncedTeamFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function deleteBoard(record: ScopeBoardRecord) {
    setDeletingId(record.id);
    try {
      await cmsScopeApi.delete(record.id);
      setItems((current) => current.filter((item) => item.id !== record.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить отчёт.");
    } finally {
      setDeletingId(null);
    }
  }

  const boardStats = useMemo(() => {
    const teamsCount = new Set(items.map((item) => item.team_id ?? `legacy-${item.team?.name ?? "none"}`)).size;
    const stopCount = items.filter((item) => item.snapshot?.metrics?.intake_status === "stop").length;
    const latest = items.reduce<ScopeBoardRecord | null>((current, item) => {
      if (!current) return item;
      return new Date(item.updated_at).getTime() > new Date(current.updated_at).getTime() ? item : current;
    }, null);
    const totalCapacity = items.reduce((sum, item) => sum + (item.snapshot?.metrics?.capacity_sp ?? 0), 0);
    return { teamsCount, stopCount, latest, totalCapacity };
  }, [items]);

  return (
    <section className="space-y-5">
      <MobilePageHero
        title="Отчёты месяца"
        description="Capacity, буфер, intake-статус и последний Jira-срез по командам. Важные риски видны до открытия отчёта."
        action={
          canManage ? (
              <Button intent="create" size="sm" onClick={() => navigate("new")}>
              Новый
            </Button>
          ) : undefined
        }
        stats={[
          { label: "Отчёты", value: loading ? "..." : items.length },
          { label: "Команды", value: loading ? "..." : boardStats.teamsCount || "0" },
          { label: "Stop intake", value: loading ? "..." : boardStats.stopCount, tone: boardStats.stopCount > 0 ? "danger" : "success" },
          { label: "Capacity", value: loading ? "..." : `${formatScopeSp(boardStats.totalCapacity)} SP`, hint: boardStats.latest ? `Обновлено ${formatDate(boardStats.latest.updated_at)}` : undefined },
        ]}
      />

      <div className="hidden lg:block">
        <SectionHeader
          title="Отчёт месяца"
          description="JQL-секции, буфер capacity, статус задач и очереди на груминг — по команде."
          actions={
            canManage ? (
                <Button intent="create" size="sm" onClick={() => navigate("new")}>
                Новый отчёт
              </Button>
            ) : undefined
          }
        />
      </div>

      <div className="hidden lg:block">
        <HelpCallout title="Кратко">
          <p>
            Создайте отчёт для команды, задайте capacity и JQL-секции. Нажмите «Обновить из Jira» —
            несохранённые JQL применятся автоматически. Другие команды ваш отчёт не видят.
          </p>
        </HelpCallout>
      </div>

      {error ? <InlineError text={error} /> : null}

      {principal.is_superuser ? (
        <FilterBar>
          <TeamFilter teams={teams} value={teamFilter} onChange={setTeamFilter} />
        </FilterBar>
      ) : null}

      {loading ? (
        <Skeleton height="h-40" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Ещё нет ни одного отчёта"
          description="Создайте первый отчёт месяца для вашей команды."
          action={
            canManage ? (
                <Button intent="create" onClick={() => navigate("new")}>
                Новый отчёт
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ScopeBoardList
          items={items}
          teamFilter={teamFilter}
          canManage={canManage}
          deletingId={deletingId}
          onOpen={(id) => navigate(`${id}`)}
          onDelete={(record) => void deleteBoard(record)}
        />
      )}

    </section>
  );
}

function ScopeBoardList({
  items,
  teamFilter,
  canManage,
  deletingId,
  onOpen,
  onDelete,
}: {
  items: ScopeBoardRecord[];
  teamFilter: string;
  canManage: boolean;
  deletingId: number | null;
  onOpen: (id: number) => void;
  onDelete: (record: ScopeBoardRecord) => void;
}) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useIncrementalList(items);

  return (
    <>
      <TeamGroupedSections
        items={visibleItems}
        teamFilter={teamFilter}
        renderSection={(sectionItems, grouped) => (
        <div className="space-y-3 lg:space-y-0">
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {sectionItems.map((item) => {
              const metrics = item.snapshot?.metrics;
              const intake = metrics ? intakeStatusMeta(metrics.intake_status, metrics) : null;
              return (
                <MobileFeatureCard
                  key={item.id}
                  title={item.name}
                  onActivate={() => onOpen(item.id)}
                  eyebrow={
                    <span className="flex flex-wrap items-center gap-2">
                      {!grouped ? <TeamBadge teamId={item.team_id} team={item.team} /> : null}
                      <span>{formatScopeDisplayMonth(item.month)}</span>
                    </span>
                  }
                  status={intake ? <Badge tone={intake.tone}>{intake.label}</Badge> : null}
                  accent={intake?.tone === "danger" ? "red" : intake?.tone === "warning" ? "amber" : intake?.tone === "success" ? "green" : "blue"}
                  subtitle={`Обновлено ${formatDate(item.updated_at)}`}
                  metrics={[
                    { label: "Capacity", value: metrics ? `${formatScopeSp(metrics.capacity_sp)} SP` : "—" },
                    { label: "Буфер", value: metrics ? `${formatScopeSp(metrics.buffer_sp)} SP` : "—" },
                    { label: "Внеплан", value: metrics ? `${formatScopeSp(metrics.unplan_sp)} SP` : "—" },
                    { label: "Обновлён", value: formatDate(item.updated_at) },
                  ]}
                  primaryAction={
                      <Button size="sm" intent="open" onClick={() => onOpen(item.id)}>
                      Открыть
                    </Button>
                  }
                  secondaryAction={
                    canManage ? (
                        <Button
                          size="sm"
                          intent="delete"
                          loading={deletingId === item.id}
                          disabled={deletingId !== null}
                          confirmTitle="Удалить отчёт?"
                          confirmDescription={
                            <span>
                              Отчёт <b>«{item.name}»</b> будет удалён без возможности восстановить.
                            </span>
                          }
                          onClick={() => onDelete(item)}
                        >
                        Удалить
                      </Button>
                    ) : null
                  }
                />
              );
            })}
          </div>

          <ListTableSurface>
            <table className="hidden w-full table-auto text-sm lg:table">
              <thead className="bg-line2 text-xs uppercase text-ink3">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Название</th>
                  <th className="px-3 py-2 text-left font-bold">Месяц</th>
                  <th className="px-3 py-2 text-left font-bold">Буфер</th>
                  <th className="px-3 py-2 text-left font-bold">Intake</th>
                  <th className="px-3 py-2 text-left font-bold">Обновлён</th>
                  <th className="px-3 py-2 text-right font-bold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sectionItems.map((item) => {
                  const metrics = item.snapshot?.metrics;
                  const intake = metrics ? intakeStatusMeta(metrics.intake_status, metrics) : null;
                  return (
                    <tr key={item.id} className="border-t border-line">
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => onOpen(item.id)}
                          className="text-left font-semibold text-ink hover:text-blue focus-visible:outline-none focus-visible:underline"
                        >
                          {item.name}
                        </button>
                        {!grouped ? (
                          <p className="mt-1">
                            <TeamBadge teamId={item.team_id} team={item.team} />
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-top text-ink2">{formatScopeDisplayMonth(item.month)}</td>
                      <td className="px-3 py-2 align-top text-ink2">
                        {metrics ? `${formatScopeSp(metrics.buffer_sp)} SP` : "—"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {intake ? <Badge tone={intake.tone}>{intake.label}</Badge> : "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-ink3">{formatDate(item.updated_at)}</td>
                      <td className="px-3 py-2 align-top text-right">
                        <div className="inline-flex gap-1.5">
                            <Button size="sm" intent="open" onClick={() => onOpen(item.id)}>
                            Открыть
                          </Button>
                          {canManage ? (
                              <Button
                                size="sm"
                                intent="delete"
                                loading={deletingId === item.id}
                                disabled={deletingId !== null}
                                confirmTitle="Удалить отчёт?"
                                confirmDescription={
                                  <span>
                                    Отчёт <b>«{item.name}»</b> будет удалён без возможности восстановить.
                                  </span>
                                }
                                onClick={() => onDelete(item)}
                              >
                              Удалить
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ListTableSurface>
        </div>
      )}
    />
      <ScopeIncrementalFooter
        loadedCount={loadedCount}
        total={total}
        hasMore={hasMore}
        onMore={loadMore}
        itemNoun="отчётов"
      />
    </>
  );
}

interface ScopeBoardPayload {
  name: string;
  month: string;
  capacity_sp: number;
  capacity_sp_dev?: number | null;
  capacity_sp_test?: number | null;
  workload_mode: ScopeWorkloadMode;
  scope_sections: ScopeSectionConfig[];
  todo_jql: string;
  test_jql: string;
  previous_release_jql: string;
  next_release_jql: string;
  custom_release_name: string;
  custom_release_jql: string;
  release_queries: ScopeReleaseQuery[];
  release_comment: string;
  previous_release_comment: string;
  next_release_comment: string;
  custom_release_comment: string;
  plan_epic_key: string;
}

function validateScopeForm(form: ScopeBoardForm): { error: string } | { payload: ScopeBoardPayload } {
  const splitMode = form.workload_mode === "sp_dev_test";
  const capacity = parseCapacity(form.capacity_sp);
  const capacityDev = parseCapacity(form.capacity_sp_dev);
  const capacityTest = parseCapacity(form.capacity_sp_test);
  if (!form.name.trim()) {
    return { error: "Укажите название board." };
  }
  if (!form.month.match(/^\d{4}-\d{2}$/)) {
    return { error: "Месяц должен быть в формате YYYY-MM." };
  }
  if (splitMode) {
    if (capacityDev === null || capacityTest === null) {
      return { error: "Capacity SP Dev и SP Test должны быть неотрицательными числами." };
    }
  } else if (capacity === null) {
    return { error: "Capacity должен быть неотрицательным числом." };
  }
  const sectionError = validateScopeSections(form.scope_sections);
  if (sectionError) {
    return { error: sectionError };
  }
  const planEpicKey = normalizePlanEpicKey(form.plan_epic_key);
  if (form.plan_epic_key.trim() && !planEpicKey) {
    return { error: "Plan эпик: укажите ключ в формате PROJ-123 или оставьте поле пустым." };
  }
  const resolvedCapacity = splitMode ? Math.max(capacityDev ?? 0, capacityTest ?? 0) : (capacity ?? 0);
  return {
    payload: {
      name: form.name.trim(),
      month: form.month.trim(),
      capacity_sp: resolvedCapacity,
      capacity_sp_dev: splitMode ? capacityDev : null,
      capacity_sp_test: splitMode ? capacityTest : null,
      workload_mode: form.workload_mode,
      scope_sections: normalizeScopeSectionOrder(form.scope_sections),
      todo_jql: form.todo_jql.trim(),
      test_jql: form.test_jql.trim(),
      previous_release_jql: form.previous_release_jql.trim(),
      next_release_jql: form.next_release_jql.trim(),
      custom_release_name: form.custom_release_name.trim(),
      custom_release_jql: form.custom_release_jql.trim(),
      release_queries: form.release_queries
        .map((query) => ({
          id: query.id,
          type: query.type,
          label: (query.label ?? "").trim(),
          jql: query.jql.trim(),
        }))
        .filter((query) => query.jql.length > 0),
      release_comment: form.release_comment.trim(),
      previous_release_comment: form.previous_release_comment.trim(),
      next_release_comment: form.next_release_comment.trim(),
      custom_release_comment: form.custom_release_comment.trim(),
      plan_epic_key: planEpicKey,
    },
  };
}

function ReleaseQueriesEditor({
  queries,
  disabled,
  onChange,
}: {
  queries: ScopeReleaseQuery[];
  disabled: boolean;
  onChange: (queries: ScopeReleaseQuery[]) => void;
}) {
  function updateQuery(index: number, patch: Partial<ScopeReleaseQuery>) {
    onChange(queries.map((query, currentIndex) => (currentIndex === index ? { ...query, ...patch } : query)));
  }

  function addQuery() {
    onChange([...queries, createReleaseQuery("future")]);
  }

  function removeQuery(index: number) {
    onChange(queries.filter((_, currentIndex) => currentIndex !== index));
  }

  const releaseTypeOptions = [
    { value: "past", label: "Прошедший релиз", hint: "Покажем над текущим релизом" },
    { value: "future", label: "Будущий релиз", hint: "Покажем после текущего релиза" },
  ];

  return (
    <div className="space-y-3 rounded-lg border border-line bg-bg/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Дополнительные релизы</p>
          <p className="mt-1 text-xs text-ink3">
            Прошедшие релизы появятся над текущим, будущие — после текущего.
          </p>
        </div>
          <Button size="sm" intent="add" disabled={disabled} onClick={addQuery}>
          + Добавить запрос
        </Button>
      </div>

      {queries.length > 0 ? (
        <div className="space-y-3">
          {queries.map((query, index) => (
            <div key={query.id} className="rounded-lg border border-line bg-surface p-3">
              <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                <DropdownField
                  label="Тип релиза"
                  value={query.type}
                  options={releaseTypeOptions}
                  disabled={disabled}
                  onChange={(value) => updateQuery(index, { type: value === "past" ? "past" : "future" })}
                />
                <TextField
                  label="Название (необязательно)"
                  value={query.label ?? ""}
                  disabled={disabled}
                  placeholder={query.type === "past" ? "Например: 0.689" : "Например: 0.691"}
                  onChange={(event) => updateQuery(index, { label: event.target.value })}
                />
                <div className="flex items-end">
                    <Button size="sm" intent="delete" disabled={disabled} onClick={() => removeQuery(index)}>
                    Удалить
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <TextareaField
                  label="JQL"
                  rows={2}
                  value={query.jql}
                  disabled={disabled}
                  placeholder="project = AIG2 AND fixVersion = 12076"
                  onChange={(event) => updateQuery(index, { jql: event.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-line2/40 px-3 py-4 text-center text-sm text-ink3 sm:px-4 sm:py-5">
          Дополнительных релизов пока нет. Текущий релиз задаётся JQL выше.
        </p>
      )}
    </div>
  );
}

function ScopeBoardEditorPage({
  principal,
  canManage,
  mode,
}: {
  principal: CmsPrincipal;
  canManage: boolean;
  mode: "create" | "edit";
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { boardId: boardIdParam } = useParams();
  const boardId = mode === "edit" ? Number(boardIdParam) : null;
  const { teams } = useCmsTeams(principal);
  const [teamId, setTeamId] = useTeamIdState(teams, mode === "create");
  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === (typeof teamId === "number" ? teamId : -1)) ?? null,
    [teams, teamId]
  );

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<ScopeBoardRecord | null>(null);
  const [aiSummary, setAiSummary] = useState<ScopeAiSummary | null>(null);
  const [aiSummaryHistory, setAiSummaryHistory] = useState<ScopeAiHistoryEntry[]>([]);
  const [selectedAiHistoryId, setSelectedAiHistoryId] = useState<string | null>(null);
  const [aiPanelOpenSignal, setAiPanelOpenSignal] = useState(0);
  const [jiraExportPending, setJiraExportPending] = useState(false);
  const [form, setForm] = useState<ScopeBoardForm>(defaultForm);
  const [savedForm, setSavedForm] = useState<ScopeBoardForm>(defaultForm);
  const [layoutOrder, setLayoutOrder] = useState<ScopeLayoutBlockKey[]>(DEFAULT_SCOPE_LAYOUT_ORDER);
  const [layoutDragging, setLayoutDragging] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationClosing, setPresentationClosing] = useState(false);
  const printRootRef = useRef<HTMLDivElement>(null);
  const aiReportRef = useRef<HTMLDivElement>(null);

  const inferredReportType: "monthly" | "release" = useMemo(() => {
    if (mode === "edit") return (board?.report_type ?? "monthly") as "monthly" | "release";
    return isReleaseTemplateTeam(selectedTeam) ? "release" : "monthly";
  }, [board?.report_type, mode, selectedTeam]);
  const isReleaseTemplate = inferredReportType === "release";

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm]);

  const applyBoardMutation = useCallback((record: ScopeBoardRecord) => {
    setBoard((previous) => mergeScopeBoardRecord(previous, record));
  }, []);
  const planEpicKey = useMemo(
    () => normalizePlanEpicKey(board?.plan_epic_key ?? savedForm.plan_epic_key),
    [board?.plan_epic_key, savedForm.plan_epic_key],
  );
  const unsavedGuard = useUnsavedChangesGuard({ when: dirty && canManage });

  const loadBoard = useCallback(async () => {
    if (boardId === null || Number.isNaN(boardId)) return;
    setLoading(true);
    setError(null);
    try {
      const record = await cmsScopeApi.get(boardId);
      setBoard(record);
      setAiSummary(record.ai_summary ?? null);
      setAiSummaryHistory(record.ai_summary_history ?? []);
      setSelectedAiHistoryId(null);
      const nextForm = boardToForm(record);
      setForm(nextForm);
      setSavedForm(nextForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить board.");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (mode === "edit") {
      void loadBoard();
    }
  }, [loadBoard, mode]);

  useEffect(() => {
    setLayoutOrder(mergeScopeLayoutOrder(board?.layout_order));
  }, [board?.layout_order]);

  useEffect(() => {
    if (mode !== "create") return;
    setForm((current) => {
      if (isReleaseTemplate) {
        const currentReleaseJql = current.scope_sections?.[0]?.jql ?? "";
        return {
          ...current,
          scope_sections: [
            {
              id: "release",
              name: "Текущий релиз",
              kind: "planned",
              order: 0,
              jql: currentReleaseJql,
            },
          ],
        };
      }
      return {
        ...current,
        scope_sections: defaultScopeSections(),
      };
    });
  }, [mode, isReleaseTemplate]);

  const persistBoardConfig = useCallback(async (): Promise<ScopeBoardRecord | null> => {
    if (mode !== "edit" || boardId === null || Number.isNaN(boardId) || !canManage) {
      return board;
    }
    const validated = validateScopeForm(form);
    if ("error" in validated) {
      setError(validated.error);
      return null;
    }
    setError(null);
    const updated = await cmsScopeApi.update(boardId, validated.payload);
    setBoard(updated);
    const nextForm = boardToForm(updated);
    setForm(nextForm);
    setSavedForm(nextForm);
    return updated;
  }, [board, boardId, canManage, form, mode]);

  const refreshFromJira = useCallback(
    async () => {
      if (boardId === null || Number.isNaN(boardId)) return;
      setRefreshing(true);
      setError(null);
      let configBaseline = savedForm;
      try {
        if (dirty && canManage && mode === "edit") {
          const saved = await persistBoardConfig();
          if (!saved) {
            toast.error("Исправьте настройки — JQL не сохранён, refresh отменён");
            return;
          }
          configBaseline = boardToForm(saved);
        }
        const record = await cmsScopeApi.refresh(boardId);
        setBoard(record);
        setAiSummary(record.ai_summary ?? null);
        setAiSummaryHistory(record.ai_summary_history ?? []);
        setSelectedAiHistoryId(null);
        const nextForm = boardToForm(record);
        setSavedForm(nextForm);
        setForm((current) =>
          JSON.stringify(current) === JSON.stringify(configBaseline) ? nextForm : current
        );
        const m = record.snapshot?.metrics;
        const totalTasks = (m?.plan_count ?? 0) + (m?.unplan_count ?? 0);
        const todoCount = record.snapshot?.priority_queues?.todo?.issues?.length ?? 0;
        const testCount = record.snapshot?.priority_queues?.test?.issues?.length ?? 0;
        toast.success(
          totalTasks > 0 || todoCount > 0 || testCount > 0
            ? `Обновлено: плановых ${m?.plan_count ?? 0}, внеплановых ${m?.unplan_count ?? 0}, очереди ${todoCount}+${testCount}`
            : "Jira вернул 0 задач — проверьте JQL"
        );
        const openCount = record.snapshot ? resolveOpenQuestions(record.snapshot).length : 0;
        if (openCount > 0) {
          toast.info(`Открытые вопросы: ${openCount} задач в паузе`);
        }
        const truncated = record.snapshot?.jira_fetch_warnings ?? [];
        if (truncated.length > 0) {
          toast.warning(
            `Jira вернула лимит ${truncated[0]?.count ?? 500}+ задач по JQL — отчёт может быть неполным`,
            { title: "Обрезка выборки" }
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось обновить из Jira.";
        setError(message);
        toast.error(message);
      } finally {
        setRefreshing(false);
      }
    },
    [boardId, canManage, dirty, mode, persistBoardConfig, savedForm, toast]
  );

  const pollJiraExportIfNeeded = useCallback(
    async (summary: ScopeAiSummary, epicKey: string) => {
      if (boardId === null || Number.isNaN(boardId) || !epicKey) return;
      const status = summary.jira_export?.status;
      if (status === "ok" || status === "error") return;

      setJiraExportPending(true);
      try {
        const polledExport = await pollScopeAiJiraExport(boardId);
        if (!polledExport) return;
        setAiSummary((previous) => (previous ? { ...previous, jira_export: polledExport } : previous));
        setBoard((prev) =>
          prev?.ai_summary
            ? { ...prev, ai_summary: { ...prev.ai_summary, jira_export: polledExport } }
            : prev,
        );
        if (polledExport.status === "error") {
          toast.error(polledExport.error ?? "Не удалось сохранить комментарий в Jira", {
            title: "Jira",
          });
        }
      } finally {
        setJiraExportPending(false);
      }
    },
    [boardId, toast],
  );

  const analyzeScope = useCallback(async () => {
    if (boardId === null || Number.isNaN(boardId)) return;
    setAnalyzing(true);
    setAiProgress("Запускаем AI...");
    setError(null);
    window.setTimeout(() => {
      aiReportRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    try {
      const started = await cmsScopeApi.startAnalyze(boardId);
      const applyResult = (result: ScopeAiAnalyzeResult) => {
        setBoard((prev) => {
          if (!prev) return result.board;
          return {
            ...prev,
            ai_summary: result.board.ai_summary ?? result.ai_summary,
            ai_summary_history: result.board.ai_summary_history ?? prev.ai_summary_history,
          };
        });
        setAiSummary(result.ai_summary);
        setAiSummaryHistory(result.board.ai_summary_history ?? []);
        setSelectedAiHistoryId(null);
        setAiPanelOpenSignal((value) => value + 1);
        window.setTimeout(() => {
          aiReportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      };

      if (isScopeAnalyzeResult(started)) {
        applyResult(started);
        toast.success(started.cached ? "AI-сводка уже актуальна" : "AI-анализ готов");
        await pollJiraExportIfNeeded(
          started.ai_summary,
          normalizePlanEpicKey(started.board.plan_epic_key),
        );
        return;
      }

      const jobId = started.job_id;
      if (!jobId) {
        throw new Error("AI job was not started");
      }

      const result = await pollAiJob<ScopeAiAnalyzeResult>(
        () => cmsScopeApi.getAnalyzeJob(boardId, jobId),
        {
          intervalMs: AI_JOB_POLL_INTERVAL_MS,
          timeoutMs: SCOPE_AI_POLL_TIMEOUT_MS,
          onProgress: (job) => setAiProgress(job.message ?? "AI готовит сводку..."),
        }
      );
      applyResult(result);
      toast.success(result.cached ? "AI-сводка уже актуальна" : "AI-анализ готов");
      await pollJiraExportIfNeeded(
        result.ai_summary,
        normalizePlanEpicKey(result.board.plan_epic_key),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI-анализ не выполнен";
      setError(message);
      toast.error(message, { title: "Ошибка" });
    } finally {
      setAnalyzing(false);
      setAiProgress(null);
    }
  }, [boardId, pollJiraExportIfNeeded, toast]);

  const addManualQuestion = useCallback(
    async (text: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.addQuestion(boardId, text);
      applyBoardMutation(record);
      toast.success("Вопрос добавлен");
    },
    [applyBoardMutation, boardId, toast]
  );

  const resolveQuestion = useCallback(
    async (questionId: string, comment: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.resolveQuestion(boardId, questionId, comment);
      applyBoardMutation(record);
      toast.success("Вопрос закрыт");
    },
    [applyBoardMutation, boardId, toast]
  );

  const addTopItem = useCallback(
    async (text: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.addTopItem(boardId, text);
      applyBoardMutation(record);
      toast.success("Пункт добавлен");
    },
    [applyBoardMutation, boardId, toast]
  );

  const removeTopItem = useCallback(
    async (itemId: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.deleteTopItem(boardId, itemId);
      applyBoardMutation(record);
      toast.success("Пункт удалён");
    },
    [applyBoardMutation, boardId, toast]
  );

  const saveReleaseComment = useCallback(
    async (slot: ScopeReleaseSlot, text: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const trimmed = text.trim();
      const payload = {
        release_comment: board?.release_comment ?? form.release_comment,
        previous_release_comment: board?.previous_release_comment ?? form.previous_release_comment,
        next_release_comment: board?.next_release_comment ?? form.next_release_comment,
        custom_release_comment: board?.custom_release_comment ?? form.custom_release_comment,
      };
      if (slot === "current") payload.release_comment = trimmed;
      if (slot === "previous") payload.previous_release_comment = trimmed;
      if (slot === "next") payload.next_release_comment = trimmed;
      if (slot === "custom") payload.custom_release_comment = trimmed;

      const record = await cmsScopeApi.updateReleaseComments(boardId, payload);
      setBoard((previous) => {
        const merged = mergeScopeBoardRecord(previous, record);
        const nextForm = boardToForm(merged);
        setForm(nextForm);
        setSavedForm(nextForm);
        return merged;
      });
      toast.success("Комментарий сохранён");
    },
    [
      board?.custom_release_comment,
      board?.next_release_comment,
      board?.previous_release_comment,
      board?.release_comment,
      boardId,
      form.custom_release_comment,
      form.next_release_comment,
      form.previous_release_comment,
      form.release_comment,
      toast,
    ]
  );

  const addTodoItem = useCallback(
    async (text: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.addTodoItem(boardId, text);
      applyBoardMutation(record);
    },
    [applyBoardMutation, boardId]
  );

  const toggleTodoItem = useCallback(
    async (itemId: string, done: boolean) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.updateTodoItem(boardId, itemId, done);
      applyBoardMutation(record);
    },
    [applyBoardMutation, boardId]
  );

  const deleteTodoItem = useCallback(
    async (itemId: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.deleteTodoItem(boardId, itemId);
      applyBoardMutation(record);
    },
    [applyBoardMutation, boardId]
  );

  const reorderQueue = useCallback(
    async (queue: ScopePriorityQueueKind, order: string[], movedKey: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.reorderQueue(boardId, queue, order, movedKey);
      applyBoardMutation(record);
      toast.success("Порядок и значимость сохранены");
    },
    [applyBoardMutation, boardId, toast]
  );

  const addQueueComment = useCallback(
    async (queue: ScopePriorityQueueKind, issueKey: string, text: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.addQueueIssueComment(boardId, queue, issueKey, text);
      applyBoardMutation(record);
      toast.success("Комментарий отправлен в Jira");
    },
    [applyBoardMutation, boardId, toast]
  );

  const saveReportComment = useCallback(
    async (issueKey: string, text: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.updateReportComment(boardId, issueKey, text);
      applyBoardMutation(record);
      toast.success(text.trim() ? "Комментарий сохранён" : "Комментарий удалён");
    },
    [applyBoardMutation, boardId, toast]
  );

  const updateQueueDueDate = useCallback(
    async (queue: ScopePriorityQueueKind, issueKey: string, dueDate: string) => {
      if (boardId === null || Number.isNaN(boardId)) return;
      const record = await cmsScopeApi.updateQueueIssueDueDate(boardId, queue, issueKey, dueDate);
      applyBoardMutation(record);
      toast.success("Срок исполнения сохранён в Jira");
    },
    [applyBoardMutation, boardId, toast]
  );

  async function handleSave() {
    const validated = validateScopeForm(form);
    if ("error" in validated) {
      setError(validated.error);
      return;
    }
    if (mode === "create" && teamId === "") {
      setError("Выберите команду — без неё отчёт увидят все админы.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const created = await cmsScopeApi.create({
          ...validated.payload,
          team_id: teamId === "" ? null : teamId,
        });
        toast.success("Отчёт создан");
        navigate(`../${created.id}`, { replace: true });
        return;
      }

      if (boardId === null) return;
      const updated = await cmsScopeApi.update(boardId, validated.payload);
      setBoard(updated);
      const nextForm = boardToForm(updated);
      setForm(nextForm);
      setSavedForm(nextForm);
      toast.success("Сохранено");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить.");
    } finally {
      setSaving(false);
    }
  }

  const metrics = board?.snapshot?.metrics ?? null;
  const snapshot = board?.snapshot ?? null;
  const reportSummary = useMemo(() => (snapshot ? buildReportSummary(snapshot) : null), [snapshot]);
  const workloadMode = form.workload_mode ?? board?.workload_mode ?? DEFAULT_SCOPE_WORKLOAD_MODE;
  const dataQualityDetails = useMemo(
    () => (snapshot ? buildDataQualityDetails(snapshot, workloadMode) : null),
    [snapshot, workloadMode],
  );
  const snapshotRefreshedLabel = snapshot?.refreshed_at
    ? new Date(snapshot.refreshed_at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
    : null;
  const detailIntake = metrics ? intakeStatusMeta(metrics.intake_status, metrics, workloadMode === "sp_dev_test") : null;
  const showFlowPace = shouldShowFlowPaceBlock(
    board?.team ?? selectedTeam ?? (board?.name ? { name: board.name } : null),
    snapshot?.flow_pace,
  );

  const visibleBlockKeys = useMemo((): ScopeLayoutBlockKey[] => {
    if (mode !== "edit" || !snapshot || !metrics) return [];
    const keys: ScopeLayoutBlockKey[] = ["topItems", "capacity"];
    if (!isReleaseTemplate) {
      keys.push("roleWorkload", "planInsights");
    }
    if (showFlowPace) {
      keys.push("flowPace");
    }
    keys.push("aiSummary", "report", "priorityQueues", "activity", "snapshotSections", "settings");
    return keys;
  }, [isReleaseTemplate, metrics, mode, showFlowPace, snapshot]);

  const visibleLayoutOrder = useMemo(
    () => mergeScopeLayoutOrder(layoutOrder, visibleBlockKeys),
    [layoutOrder, visibleBlockKeys],
  );

  const presentationLayoutOrder = useMemo(
    () => filterScopePresentationOrder(visibleLayoutOrder),
    [visibleLayoutOrder],
  );

  const closePresentation = useCallback(() => {
    if (!presentationOpen || presentationClosing) return;
    setPresentationClosing(true);
    window.setTimeout(() => {
      setPresentationOpen(false);
      setPresentationClosing(false);
    }, presentationCloseDelayMs());
  }, [presentationClosing, presentationOpen]);

  const enterPresentationMode = useCallback(() => {
    if (!isScopePresentationDesktop() || !metrics) return;
    setPresentationClosing(false);
    setPresentationOpen(true);
  }, [metrics]);

  const layoutSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLayoutDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setLayoutDragging(false);
      if (!canManage || boardId === null || Number.isNaN(boardId)) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const previousOrder = layoutOrder;
      const nextOrder = reorderScopeLayoutOrder(
        layoutOrder,
        visibleBlockKeys,
        String(active.id),
        String(over.id),
      );
      setLayoutOrder(nextOrder);
      setBoard((current) => (current ? { ...current, layout_order: nextOrder } : current));

      try {
        const updated = await cmsScopeApi.updateLayout(boardId, nextOrder);
        applyBoardMutation(updated);
        setLayoutOrder(mergeScopeLayoutOrder(updated.layout_order));
      } catch (err) {
        setLayoutOrder(previousOrder);
        setBoard((current) => (current ? { ...current, layout_order: previousOrder } : current));
        toast.error(err instanceof Error ? err.message : "Не удалось сохранить порядок блоков.");
      }
    },
    [boardId, canManage, layoutOrder, toast, visibleBlockKeys],
  );

  function renderScopeLayoutBlock(key: ScopeLayoutBlockKey) {
    if (!snapshot || !metrics) return null;

    switch (key) {
      case "topItems":
        return (
          <ScopeTopItemsSection
            snapshot={snapshot}
            canManage={canManage}
            onAddItem={addTopItem}
            onRemoveItem={removeTopItem}
          />
        );
      case "capacity":
        return (
          <ScopeVisualDashboard
            metrics={metrics}
            workloadMode={workloadMode}
            reportSummary={reportSummary ?? undefined}
            dataQualityDetails={dataQualityDetails ?? undefined}
            jiraFetchTruncated={snapshot?.jira_fetch_warnings?.length ?? 0}
            presentation={presentationOpen}
          />
        );
      case "roleWorkload":
        return <ScopeAssigneeCharts metrics={metrics} presentation={presentationOpen} />;
      case "planInsights":
        return <ScopePlanInsights metrics={metrics} presentation={presentationOpen} />;
      case "flowPace":
        return snapshot.flow_pace ? (
          <ScopeFlowPaceSection
            flowPace={snapshot.flow_pace}
            boardId={boardId}
            canManage={canManage}
            chartOrder={board?.flow_pace_chart_order}
            onBoardUpdated={applyBoardMutation}
            onChartOrderError={(message) => toast.error(message)}
            presentation={presentationOpen}
          />
        ) : (
          <Alert tone="info" title="AI пульс спринта">
            Обновите snapshot из Jira — блок доступен для команды iGaming Rip.
          </Alert>
        );
      case "aiSummary":
        return (
          <div ref={aiReportRef} className="scroll-mt-24 space-y-3">
            {analyzing && aiProgress ? <AiGenerationProgress message={aiProgress} /> : null}
            <ScopeAiPanel
              summary={aiSummary}
              history={aiSummaryHistory}
              selectedHistoryId={selectedAiHistoryId}
              onSelectHistory={setSelectedAiHistoryId}
              metrics={metrics}
              workloadMode={workloadMode}
              openQuestionsCount={resolveOpenQuestions(snapshot).length}
              autoOpenSignal={aiPanelOpenSignal}
              analyzing={analyzing}
              planEpicKey={planEpicKey}
              jiraExportPending={jiraExportPending}
              presentation={presentationOpen}
            />
          </div>
        );
      case "report":
        return (
          <ScopeReportSection
            snapshot={snapshot}
            canManage={canManage}
            showTechnicalFields
            isReleaseReport={isReleaseTemplate}
            presentation={presentationOpen}
            releaseComments={{
              current: board?.release_comment ?? form.release_comment,
              previous: board?.previous_release_comment ?? form.previous_release_comment,
              next: board?.next_release_comment ?? form.next_release_comment,
              custom: board?.custom_release_comment ?? form.custom_release_comment,
            }}
            onSaveReleaseComment={saveReleaseComment}
            reportComments={snapshot.report_comments ?? {}}
            onSaveReportComment={saveReportComment}
            onAddQuestion={addManualQuestion}
            onResolveQuestion={resolveQuestion}
          />
        );
      case "priorityQueues":
        return (
          <ScopePriorityQueuesSection
            snapshot={snapshot}
            todoJql={board?.todo_jql ?? form.todo_jql}
            testJql={board?.test_jql ?? form.test_jql}
            canManage={canManage && !presentationOpen}
            onReorderQueue={reorderQueue}
            onAddQueueComment={addQueueComment}
            onUpdateQueueDueDate={updateQueueDueDate}
          />
        );
      case "activity":
        return <ScopeActivityFeed snapshot={snapshot} />;
      case "snapshotSections":
        return (
          <div className="space-y-4">
            {metrics.plan_count + metrics.unplan_count === 0 ? (
              <Alert tone="warning" title="Jira вернул 0 задач">
                Проверьте JQL в настройках.
              </Alert>
            ) : null}
            {resolveSnapshotSections(snapshot).map((section) => {
              const sectionMetrics = metrics.sections?.find((item) => item.id === section.id);
              return (
                <details key={section.id} className={cn("scope-collapsible-card group", cmsMobileSectionShell)}>
                  <summary className={cn("scope-section-header flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none", cmsSectionHeaderPad)}>
                    <div>
                      <p className="text-base font-semibold text-ink">
                        {section.name} · {sectionMetrics?.count ?? section.issues.length} задач
                      </p>
                      {sectionMetrics?.by_status && Object.keys(sectionMetrics.by_status).length > 0 ? (
                        <p className="scope-section-header-subtitle mt-1 text-sm">
                          {Object.entries(sectionMetrics.by_status)
                            .map(([status, count]) => `${status}: ${count}`)
                            .join(" · ")}
                        </p>
                      ) : null}
                      <p className="scope-section-header-subtitle mt-1 text-xs">
                        Полный список задач, полученный по JQL-фильтру. На его основе собираются метрики и отчёт.
                      </p>
                    </div>
                    <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
                      </svg>
                    </span>
                  </summary>
                  <ScopeTasksSection
                    title={section.name}
                    issues={section.issues}
                    byStatus={sectionMetrics?.by_status ?? {}}
                    showTechnicalFields
                    embedded
                  />
                </details>
              );
            })}
          </div>
        );
      case "settings":
        return (
          <details className={cn("scope-collapsible-card scope-no-print group", cmsMobileSectionShell)}>
            <summary className={cn("scope-section-header flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink marker:content-none", cmsSectionHeaderPad)}>
              <span>⚙ Настройки и JQL</span>
              <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
                </svg>
              </span>
            </summary>
            <div className="space-y-4 p-3 sm:p-4 lg:space-y-5 lg:p-7">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Название"
                  value={form.name}
                  disabled={!canManage}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
                <TextField
                  label="Месяц (YYYY-MM)"
                  value={form.month}
                  disabled={!canManage}
                  onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
                />
                <ScopeCapacityFields
                  form={form}
                  disabled={!canManage}
                  onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
                />
              </div>
              <WorkloadModePicker
                value={form.workload_mode}
                disabled={!canManage}
                onChange={(workload_mode) => setForm((current) => applyWorkloadModeChange(current, workload_mode))}
              />
              <TextField
                label="Jira-ключ Plan эпика"
                value={form.plan_epic_key}
                disabled={!canManage}
                placeholder="FLEX-100"
                onChange={(event) => setForm((current) => ({ ...current, plan_epic_key: event.target.value }))}
              />
              <p className="-mt-2 text-xs text-ink3">
                После генерации AI-сводка публикуется комментарием в этот эпик. Оставьте пустым, чтобы не отправлять в Jira.
              </p>
              {isReleaseTemplate ? (
                <div className="space-y-5">
                  <TextareaField
                    label="Введите релиз JQL"
                    rows={3}
                    value={form.scope_sections?.[0]?.jql ?? ""}
                    disabled={!canManage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scope_sections: [
                          {
                            id: "release",
                            name: "Текущий релиз",
                            kind: "planned",
                            order: 0,
                            jql: event.target.value,
                          },
                        ],
                      }))
                    }
                  />
                  <ReleaseQueriesEditor
                    queries={form.release_queries}
                    disabled={!canManage}
                    onChange={(release_queries) => setForm((current) => ({ ...current, release_queries }))}
                  />
                </div>
              ) : (
                <ScopeSectionEditor
                  sections={form.scope_sections}
                  disabled={!canManage}
                  onChange={(scope_sections) => setForm((current) => ({ ...current, scope_sections }))}
                />
              )}
              <TextareaField
                label="Задачи к выполнению — JQL"
                rows={3}
                value={form.todo_jql}
                disabled={!canManage}
                onChange={(event) => setForm((current) => ({ ...current, todo_jql: event.target.value }))}
              />
              <TextareaField
                label="Задачи к тестированию — JQL"
                rows={3}
                value={form.test_jql}
                disabled={!canManage}
                onChange={(event) => setForm((current) => ({ ...current, test_jql: event.target.value }))}
              />
            </div>
          </details>
        );
      default:
        return null;
    }
  }

  if (mode === "edit" && (boardId === null || Number.isNaN(boardId))) {
    return <Navigate to=".." replace />;
  }

  return (
    <section className="scope-board-shell min-w-0 space-y-5">
      <ScopeBoardHeader
        title={mode === "create" ? "Новый отчёт месяца" : board?.name ?? "Отчёт месяца"}
        onBack={() => navigate("..")}
        meta={
          mode === "edit" && board ? (
            <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <TeamBadge teamId={board.team_id} team={board.team} />
              <ScopeBoardMetaSeparator />
              <span>Месяц {formatScopeDisplayMonth(board.month)}</span>
              <ScopeBoardMetaSeparator />
              {snapshotRefreshedLabel ? (
                <span className="text-xs">Snapshot Jira: {snapshotRefreshedLabel}</span>
              ) : (
                <span className="text-xs text-amber">Нет snapshot — обновите из Jira</span>
              )}
            </span>
          ) : mode === "create" ? (
            "Выберите команду и задайте capacity с JQL-секциями."
          ) : undefined
        }
        toolbar={
          mode === "edit" && (snapshot || canManage) ? (
            <>
              {snapshot ? (
                <AiSparkleButton
                  className="shrink-0 whitespace-nowrap"
                  size="sm"
                  loading={analyzing}
                  disabled={analyzing || refreshing || saving}
                  onClick={() => void analyzeScope()}
                >
                  {aiSummary ? "Обновить AI" : "AI-анализ"}
                </AiSparkleButton>
              ) : null}
              {canManage ? (
                <Button
                  className="shrink-0 whitespace-nowrap"
                  size="sm"
                  intent="refresh"
                  disabled={refreshing || saving}
                  onClick={() => void refreshFromJira()}
                >
                  {refreshing ? <Spinner size="sm" /> : null}
                  Обновить из Jira
                </Button>
              ) : null}
              {snapshot ? (
                <ScopePresentationEnterButton disabled={!metrics} onClick={enterPresentationMode} />
              ) : null}
            </>
          ) : undefined
        }
      />

      {error ? <InlineError text={error} /> : null}
      {loading ? <Skeleton height="h-64" /> : null}
      {!loading && mode === "edit" && metrics ? (
        <section className="-mx-3 border-y border-line bg-surface/85 px-3 py-4 shadow-sm sm:-mx-4 sm:px-4 lg:hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-ink">Состояние отчёта</h2>
            {detailIntake ? <Badge tone={detailIntake.tone}>{detailIntake.label}</Badge> : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MobileMetricTile label="Capacity" value={`${formatScopeSp(metrics.capacity_sp)} SP`} />
            <MobileMetricTile label="План" value={`${formatScopeSp(metrics.plan_sp)} SP`} />
            <MobileMetricTile label="Внеплан" value={`${formatScopeSp(metrics.unplan_sp)} SP`} />
            <MobileMetricTile
              label="Буфер"
              value={`${formatScopeSp(metrics.buffer_sp)} SP`}
              tone={metrics.buffer_sp < 0 ? "danger" : metrics.buffer_sp === 0 ? "warning" : "success"}
            />
          </div>
          {snapshotRefreshedLabel ? (
            <p className="mt-3 text-xs leading-relaxed text-ink3">Snapshot Jira: {snapshotRefreshedLabel}</p>
          ) : null}
        </section>
      ) : null}
      {mode === "edit" && snapshot && boardId !== null && !Number.isNaN(boardId) ? (
        <ScopeFloatingTodo
          key={boardId}
          boardId={boardId}
          items={snapshot.todo_items ?? []}
          onAdd={addTodoItem}
          onToggle={toggleTodoItem}
          onDelete={deleteTodoItem}
          presentation={presentationOpen}
        />
      ) : null}

      {!loading ? (
        <>
          {mode === "create" ? (
            <Surface className={cn("space-y-4", cmsMobileSurface, "lg:p-5")}>
              <HelpCallout title="Команда">
                <p>
                  Отчёт привязан к команде — пользователи других команд его не увидят. Как при создании сессии
                  planning poker.
                </p>
              </HelpCallout>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Название"
                  value={form.name}
                  disabled={!canManage}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
                <TextField
                  label="Месяц (YYYY-MM)"
                  value={form.month}
                  disabled={!canManage}
                  onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
                />
                <TeamSelect
                  teams={teams}
                  value={teamId}
                  disabled={!canManage}
                  forcePicker
                  required
                  onChange={setTeamId}
                />
                <ScopeCapacityFields
                  form={form}
                  disabled={!canManage}
                  onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
                />
              </div>
              <WorkloadModePicker
                value={form.workload_mode}
                disabled={!canManage}
                onChange={(workload_mode) => setForm((current) => applyWorkloadModeChange(current, workload_mode))}
              />
              <TextField
                label="Jira-ключ Plan эпика"
                value={form.plan_epic_key}
                disabled={!canManage}
                placeholder="FLEX-100"
                onChange={(event) => setForm((current) => ({ ...current, plan_epic_key: event.target.value }))}
              />
              <p className="-mt-2 text-xs text-ink3">
                После генерации AI-сводка публикуется комментарием в этот эпик. Оставьте пустым, чтобы не отправлять в Jira.
              </p>
            </Surface>
          ) : null}

          {mode === "edit" && snapshot && metrics && !presentationOpen ? (
            canManage ? (
              <DndContext
                sensors={layoutSensors}
                collisionDetection={closestCenter}
                onDragStart={() => setLayoutDragging(true)}
                onDragEnd={(event) => void handleLayoutDragEnd(event)}
                onDragCancel={() => setLayoutDragging(false)}
              >
                {layoutDragging ? (
                  <div className="scope-no-print pointer-events-none fixed inset-0 z-20 bg-bg/10 backdrop-blur-[2px]" />
                ) : null}
                <div ref={printRootRef} className="scope-report-print-root space-y-5">
                  <div className="scope-print-cover hidden">
                    <h1 className="text-xl font-bold text-ink">{board?.name ?? "Отчёт месяца"}</h1>
                    <p className="mt-1 text-sm text-ink3">
                      {board ? (
                        <>
                          Месяц {formatScopeDisplayMonth(board.month)}
                          {snapshotRefreshedLabel ? ` · Snapshot Jira: ${snapshotRefreshedLabel}` : null}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <SortableContext items={visibleLayoutOrder} strategy={verticalListSortingStrategy}>
                    {visibleLayoutOrder.map((key) => (
                      <SortableScopeBlock key={key} id={key} canDrag>
                        {renderScopeLayoutBlock(key)}
                      </SortableScopeBlock>
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            ) : (
              <div ref={printRootRef} className="scope-report-print-root space-y-5">
                <div className="scope-print-cover hidden">
                  <h1 className="text-xl font-bold text-ink">{board?.name ?? "Отчёт месяца"}</h1>
                  <p className="mt-1 text-sm text-ink3">
                    {board ? (
                      <>
                        Месяц {formatScopeDisplayMonth(board.month)}
                        {snapshotRefreshedLabel ? ` · Snapshot Jira: ${snapshotRefreshedLabel}` : null}
                      </>
                    ) : null}
                  </p>
                </div>
                {visibleLayoutOrder.map((key) => (
                  <div key={key}>{renderScopeLayoutBlock(key)}</div>
                ))}
              </div>
            )
          ) : null}

          {mode === "create" ? (
            <details className={cn("scope-collapsible-card scope-no-print group", cmsMobileSectionShell)} open>
            <summary className={cn("scope-section-header flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink marker:content-none", cmsSectionHeaderPad)}>
              <span>
                <span className="group-open:hidden">⚙ Настройки и JQL</span>
                <span className="hidden group-open:inline">⚙ Настройки и JQL</span>
              </span>
              <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
                </svg>
              </span>
            </summary>
            <div className="space-y-4 p-3 sm:p-4 lg:space-y-5 lg:p-7">
              {isReleaseTemplate ? (
                <div className="space-y-5">
                  <TextareaField
                    label="Введите релиз JQL"
                    rows={3}
                    value={form.scope_sections?.[0]?.jql ?? ""}
                    disabled={!canManage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scope_sections: [
                          {
                            id: "release",
                            name: "Текущий релиз",
                            kind: "planned",
                            order: 0,
                            jql: event.target.value,
                          },
                        ],
                      }))
                    }
                  />
                  <ReleaseQueriesEditor
                    queries={form.release_queries}
                    disabled={!canManage}
                    onChange={(release_queries) => setForm((current) => ({ ...current, release_queries }))}
                  />
                </div>
              ) : (
                <ScopeSectionEditor
                  sections={form.scope_sections}
                  disabled={!canManage}
                  onChange={(scope_sections) => setForm((current) => ({ ...current, scope_sections }))}
                />
              )}
              <TextareaField
                label="Задачи к выполнению — JQL"
                rows={3}
                value={form.todo_jql}
                disabled={!canManage}
                onChange={(event) => setForm((current) => ({ ...current, todo_jql: event.target.value }))}
              />
              <TextareaField
                label="Задачи к тестированию — JQL"
                rows={3}
                value={form.test_jql}
                disabled={!canManage}
                onChange={(event) => setForm((current) => ({ ...current, test_jql: event.target.value }))}
              />
            </div>
          </details>
          ) : null}

          {mode === "edit" && !metrics ? (
            <EmptyState
              title="Нет snapshot"
              description="Откройте настройки, вставьте JQL и нажмите «Обновить из Jira»."
            />
          ) : null}
        </>
      ) : null}

      {!loading && canManage ? (
        <footer className="scope-board-footer scope-no-print mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {mode === "edit" && snapshot ? (
              <Button intent="save" disabled={!metrics} onClick={() => printScopeReport(printRootRef.current)}>
              Сохранить PDF
            </Button>
          ) : null}
            <Button intent={mode === "create" ? "create" : "save"} disabled={saving || refreshing} onClick={() => void handleSave()}>
            {saving ? <Spinner size="sm" /> : null}
            {mode === "create" ? "Создать" : "Сохранить"}
          </Button>
        </footer>
      ) : null}

      {presentationOpen ? (
        <ScopePresentationLayer
          open={presentationOpen}
          closing={presentationClosing}
          title={board?.name ?? "Отчёт месяца"}
          subtitle={
            board ? (
              <span>
                Месяц {formatScopeDisplayMonth(board.month)}
                {snapshotRefreshedLabel ? ` · Snapshot Jira: ${snapshotRefreshedLabel}` : null}
              </span>
            ) : null
          }
          contentRef={printRootRef}
          onClose={closePresentation}
        >
          {presentationLayoutOrder.map((key, index) => (
            <ScopePresentationTile
              key={key}
              blockKey={key}
              index={index}
              className={scopePresentationGridClass(key)}
            >
              {renderScopeLayoutBlock(key)}
            </ScopePresentationTile>
          ))}
        </ScopePresentationLayer>
      ) : null}

      {unsavedGuard.dialog}
    </section>
  );
}

function ScopeTasksSection({
  title,
  issues,
  byStatus,
  showTechnicalFields = false,
  embedded = false,
}: {
  title: string;
  issues: ScopeBoardIssue[];
  byStatus: Record<string, number>;
  showTechnicalFields?: boolean;
  embedded?: boolean;
}) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useIncrementalList(issues);
  const statusSummary = Object.entries(byStatus)
    .map(([status, count]) => `${status}: ${count}`)
    .join(" · ");

  const body =
    issues.length === 0 ? (
      <p className="px-3 py-5 text-sm text-ink3 sm:px-4 lg:px-5 lg:py-6">Нет задач по JQL.</p>
    ) : (
      <>
        <div className="space-y-2 p-0 sm:p-4 lg:hidden">
          {visibleItems.map((issue) => (
            <MobileRecordCard
              key={issue.key}
              title={<IssueLink issue={issue} />}
              meta={
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{formatScopeSp(issue.story_points)} SP</Badge>
                  <span>{issue.status}</span>
                  {issue.priority ? <Badge tone="info">{issue.priority}</Badge> : null}
                  {issue.severity ? <Badge tone="danger">{issue.severity}</Badge> : null}
                  {showTechnicalFields && issue.scope_creep ? <Badge tone="warning">Добавлено после плана</Badge> : null}
                </span>
              }
            >
              <MobileRecordField label="Тип" value={issue.issue_type || "—"} />
              <MobileRecordField label="Owner" value={issue.assignee || "—"} />
              <MobileRecordField label="Epic / Sprint" value={[issue.epic_key || issue.parent_key, issue.sprint].filter(Boolean).join(" · ") || "—"} />
              <MobileRecordField
                label="Front / Back / QA"
                value={[issue.role_contributors?.front?.name, issue.role_contributors?.back?.name, issue.role_contributors?.qa?.name]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              />
              <MobileRecordField label="Создана" value={formatCreated(issue.created)} />
              {showTechnicalFields ? (
                <>
                  <MobileRecordField label="Domain / Plan" value={[issue.domain, issue.plan_status].filter(Boolean).join(" · ") || "—"} />
                  <MobileRecordField label="Причина изменения плана" value={planChangeReasonLabel(issue) || "—"} />
                </>
              ) : null}
            </MobileRecordCard>
          ))}
        </div>

        <div className="hidden overflow-x-auto p-4 sm:p-5 lg:block">
          <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-sm">
            <thead className="text-xs uppercase text-ink3">
              <tr>
                <th className="px-3 pb-2 text-left font-bold">Key</th>
                <th className="px-3 pb-2 text-left font-bold">Summary</th>
                <th className="px-3 pb-2 text-left font-bold">SP</th>
                <th className="px-3 pb-2 text-left font-bold">Status</th>
                <th className="px-3 pb-2 text-left font-bold">Priority</th>
                <th className="px-3 pb-2 text-left font-bold">Owner</th>
                <th className="px-3 pb-2 text-left font-bold">Epic / Sprint</th>
                {showTechnicalFields ? <th className="px-3 pb-2 text-left font-bold">Технические сигналы</th> : null}
                {showTechnicalFields ? <th className="px-3 pb-2 text-left font-bold">Добавлено после плана</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((issue) => (
                <tr key={issue.key} className="bg-bg/70">
                  <td className="rounded-l-xl px-3 py-3 align-top">
                    <IssueLink issue={issue} />
                  </td>
                  <td className="px-3 py-3 align-top text-ink2">{issue.summary}</td>
                  <td className="px-3 py-3 align-top text-ink2">{formatScopeSp(issue.story_points)}</td>
                  <td className="px-3 py-3 align-top text-ink2">{issue.status || "—"}</td>
                  <td className="px-3 py-3 align-top text-ink2">
                    {[issue.priority, issue.severity || issue.final_priority].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-3 align-top text-ink2">{issue.assignee || "—"}</td>
                  <td className="px-3 py-3 align-top text-ink2">
                    {[issue.epic_key || issue.parent_key, issue.sprint].filter(Boolean).join(" · ") || "—"}
                  </td>
                  {showTechnicalFields ? (
                    <td className="px-3 py-3 align-top text-ink2">
                      {[issue.domain, issue.plan_status, planChangeReasonLabel(issue), issue.request_type]
                        .filter(Boolean)
                        .join(" · ") || issue.issue_type || "—"}
                    </td>
                  ) : null}
                  {showTechnicalFields ? (
                    <td className="rounded-r-xl px-3 py-3 align-top text-ink2">{issue.scope_creep ? "Да" : "—"}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5">
          <ScopeIncrementalFooter
            loadedCount={loadedCount}
            total={total}
            hasMore={hasMore}
            onMore={loadMore}
          />
        </div>
      </>
    );

  if (embedded) {
    return <div className="overflow-hidden">{body}</div>;
  }

  return (
    <Surface className="overflow-hidden p-0">
      <div className="border-b border-line px-3 py-3 sm:px-4 lg:px-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink3">{title}</h3>
        <p className="mt-1 text-xs text-ink3">
          {issues.length} задач{statusSummary ? ` · ${statusSummary}` : ""}
        </p>
      </div>
      {body}
    </Surface>
  );
}

function IssueLink({ issue }: { issue: ScopeBoardIssue }) {
  if (issue.url) {
    return (
      <a href={issue.url} target="_blank" rel="noreferrer" className="font-semibold text-blue hover:underline">
        {issue.key}
      </a>
    );
  }
  return <span className="font-semibold text-ink">{issue.key}</span>;
}

function isScopeAnalyzeResult(response: ScopeAnalyzeStartResponse): response is ScopeAiAnalyzeResult {
  return "ai_summary" in response && "board" in response;
}
