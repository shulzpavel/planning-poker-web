import { useMemo, useState } from "react";
import { Badge, Button, Surface, cn } from "../../../design-system";
import { SortableLayoutBlockDragHandle } from "../components/SortableLayoutBlock";
import { cmsMobileSectionShell, cmsSectionBody, cmsSectionHeaderPad } from "../components/cmsMobileLayout";
import type {
  ScopeBoardMetrics,
  ScopeDeveloperBreakdown,
  ScopeRoleBreakdownMap,
} from "../api/cmsClient";
import { formatScopeSp } from "./scopeBoardHelpers";
import { formatQueueTimelineDate } from "./scopePriorityQueueTimeline";
import { RoleContributorsLines } from "./scopeRoleContributors";
import {
  buildDeveloperDonutSegments,
  developerDonutCenter,
  donutArcs,
  type DonutSegment,
} from "./scopeBoardVisuals";

type ChartMode = "sp" | "tasks";
type RoleKey = "front" | "back" | "qa";
type WorkloadHorizon = "active" | "sprint";

const ROLE_META: Record<RoleKey, { label: string; accent: "info" | "warning" | "neutral" }> = {
  front: { label: "Front", accent: "neutral" },
  back: { label: "Back", accent: "info" },
  qa: { label: "QA", accent: "warning" },
};

const HORIZON_META: Record<
  WorkloadHorizon,
  { label: string; description: (role: RoleKey) => string }
> = {
  active: {
    label: "Сейчас",
    description: (role) =>
      role === "qa"
        ? "Активная очередь тестирования: задачи в статусах «Тестирование» и «К релизу»."
        : "Активная разработка: задачи в работе и на тестировании.",
  },
  sprint: {
    label: "За спринт",
    description: (role) =>
      role === "qa"
        ? "Протестировано за спринт: тестирование, к релизу и готово."
        : "Весь объём спринта: все задачи, кроме «К выполнению» и бэклога.",
  },
};

function RoleSegmentPicker({ value, onChange }: { value: RoleKey; onChange: (role: RoleKey) => void }) {
  return (
    <div
      className="grid w-full grid-cols-3 gap-2 sm:inline-grid sm:w-auto sm:grid-cols-3"
      role="tablist"
      aria-label="Роль"
    >
      {(Object.keys(ROLE_META) as RoleKey[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={[
              "scope-presentation-keep min-h-10 rounded-lg border px-4 text-sm font-semibold transition-colors",
              active
                ? "border-blue bg-blue/10 text-ink"
                : "border-line bg-surface text-ink2 hover:border-blue/40 hover:bg-bg/80",
            ].join(" ")}
          >
            {ROLE_META[key].label}
          </button>
        );
      })}
    </div>
  );
}

function HorizonSegmentPicker({
  value,
  onChange,
}: {
  value: WorkloadHorizon;
  onChange: (horizon: WorkloadHorizon) => void;
}) {
  return (
    <div
      className="grid w-full grid-cols-2 gap-2 sm:inline-grid sm:w-auto sm:grid-cols-2"
      role="tablist"
      aria-label="Горизонт нагрузки"
    >
      {(Object.keys(HORIZON_META) as WorkloadHorizon[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={[
              "scope-presentation-keep min-h-10 rounded-lg border px-4 text-sm font-semibold transition-colors",
              active
                ? "border-blue bg-blue/10 text-ink"
                : "border-line bg-surface text-ink2 hover:border-blue/40 hover:bg-bg/80",
            ].join(" ")}
          >
            {HORIZON_META[key].label}
          </button>
        );
      })}
    </div>
  );
}

function roleBreakdownForHorizon(
  metrics: ScopeBoardMetrics,
  horizon: WorkloadHorizon,
): { plan: ScopeRoleBreakdownMap | undefined; unplan: ScopeRoleBreakdownMap | undefined } {
  if (horizon === "sprint") {
    return {
      plan: metrics.plan_by_role_sprint,
      unplan: metrics.unplan_by_role_sprint,
    };
  }
  return {
    plan: metrics.plan_by_role,
    unplan: metrics.unplan_by_role,
  };
}

export function ScopeAssigneeCharts({ metrics, presentation = false }: { metrics: ScopeBoardMetrics; presentation?: boolean }) {
  const [role, setRole] = useState<RoleKey>("front");
  const [horizon, setHorizon] = useState<WorkloadHorizon>("active");
  const { plan: planByRole, unplan: unplanByRole } = roleBreakdownForHorizon(metrics, horizon);
  const hasActive = hasRoleBreakdown(metrics.plan_by_role) || hasRoleBreakdown(metrics.unplan_by_role);
  const hasSprint =
    hasRoleBreakdown(metrics.plan_by_role_sprint) || hasRoleBreakdown(metrics.unplan_by_role_sprint);
  const hasData = hasActive || hasSprint;

  if (!hasData) {
    return null;
  }

  const roleMeta = ROLE_META[role];
  const horizonMeta = HORIZON_META[horizon];

  return (
    <Surface className={cn("scope-collapsible-card overflow-hidden border-0 bg-surface/80 p-0 shadow-none", cmsMobileSectionShell, presentation && "h-full lg:shadow-card")}>
      <details className="scope-presentation-section group">
        <summary className={cn("scope-section-header flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none", cmsSectionHeaderPad)}>
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <SortableLayoutBlockDragHandle />
            <div>
              <h2 className="text-base font-semibold text-ink">Нагрузка по ролям</h2>
              <p className="scope-section-header-subtitle mt-1 text-sm">
                Распределение SP и задач по Front / Back / QA — план и внеплан в горизонтах «Сейчас» и «За спринт».
              </p>
            </div>
          </div>
          <span className="scope-section-header-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
            </svg>
          </span>
        </summary>

        <div className={cmsSectionBody}>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <RoleSegmentPicker value={role} onChange={setRole} />
            <HorizonSegmentPicker value={horizon} onChange={setHorizon} />
          </div>

          <p className="rounded-xl bg-bg/70 px-3 py-2 text-sm text-ink3">{horizonMeta.description(role)}</p>

          <div className="grid gap-5 xl:grid-cols-2">
            <RoleDonutCard
              title={`План · ${roleMeta.label} · ${horizonMeta.label}`}
              rows={planByRole?.[role] ?? []}
              accent={roleMeta.accent}
              role={role}
            />
            <RoleDonutCard
              title={`Внеплан · ${roleMeta.label} · ${horizonMeta.label}`}
              rows={unplanByRole?.[role] ?? []}
              accent={roleMeta.accent}
              role={role}
            />
          </div>
        </div>
      </details>
    </Surface>
  );
}

export function summarizeRoleWorkload(
  metrics: ScopeBoardMetrics,
  role: RoleKey,
  horizon: WorkloadHorizon = "active",
) {
  const { plan, unplan } = roleBreakdownForHorizon(metrics, horizon);
  const planRows = plan?.[role] ?? [];
  const unplanRows = unplan?.[role] ?? [];
  const planCoverage =
    horizon === "sprint" ? metrics.plan_role_coverage_sprint?.[role] : metrics.plan_role_coverage?.[role];
  const unplanCoverage =
    horizon === "sprint" ? metrics.unplan_role_coverage_sprint?.[role] : metrics.unplan_role_coverage?.[role];
  return {
    scopeSp: Math.max(0, metrics.plan_sp) + Math.max(0, metrics.unplan_sp),
    scopeCount: metrics.plan_count + metrics.unplan_count,
    roleSp: sumRoleSp(planRows) + sumRoleSp(unplanRows),
    roleCount: sumRoleCount(planRows) + sumRoleCount(unplanRows),
    unattributedCount: (planCoverage?.unattributed ?? 0) + (unplanCoverage?.unattributed ?? 0),
  };
}

function sumRoleSp(rows: ScopeDeveloperBreakdown[]): number {
  return rows.reduce((sum, row) => sum + Math.max(0, row.story_points), 0);
}

function sumRoleCount(rows: ScopeDeveloperBreakdown[]): number {
  return rows.reduce((sum, row) => sum + Math.max(0, row.count), 0);
}

function formatRoleSp(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "— SP";
  }
  return `${formatScopeSp(value)} SP`;
}

function taskCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} задачи`;
  return `${count} задач`;
}

function RoleDonutCard({
  title,
  rows,
  accent,
  role,
}: {
  title: string;
  rows: ScopeDeveloperBreakdown[];
  accent: "info" | "warning" | "neutral";
  role: RoleKey;
}) {
  const [mode, setMode] = useState<ChartMode>("sp");
  const segments = useMemo(() => buildDeveloperDonutSegments(rows, mode), [rows, mode]);
  const arcs = useMemo(() => donutArcs(segments), [segments]);
  const center = useMemo(() => developerDonutCenter(rows, mode), [rows, mode]);
  const accentClass = accent === "info" ? "text-blue" : accent === "warning" ? "text-amber" : "text-ink";

  return (
    <div className="rounded-2xl bg-bg/70 p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${accentClass}`}>{title}</h3>
          <p className="mt-1 text-sm text-ink3">{rows.length} исполнителей</p>
        </div>
        <div className="inline-flex rounded-xl bg-line2/60 p-1">
          <ModeButton active={mode === "sp"} onClick={() => setMode("sp")}>
            SP
          </ModeButton>
          <ModeButton active={mode === "tasks"} onClick={() => setMode("tasks")}>
            Задачи
          </ModeButton>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-line2/40 px-3 py-8 text-center text-sm text-ink3">
          Нет задач с атрибуцией для этой роли.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto flex flex-col items-center gap-2">
            <div className="relative h-44 w-44 lg:h-48 lg:w-48">
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
                <p className="text-3xl font-bold text-ink">{center.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink3">{center.label}</p>
              </div>
            </div>
          </div>
          <RoleLegend rows={rows} segments={segments} mode={mode} role={role} />
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="scope-presentation-keep min-h-8 px-3 text-xs"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function formatRoleUnresolvedReason(reason: string): string {
  switch (reason) {
    case "jira_sp_test_empty":
      return "не заполнено поле SP Test";
    case "qa_user_missing":
      return "SP Test есть, но не указан исполнитель";
    case "jira_field_empty":
      return "не заполнено поле Jira";
    default:
      return reason;
  }
}

function RoleLegend({
  rows,
  segments,
  mode,
  role,
}: {
  rows: ScopeDeveloperBreakdown[];
  segments: DonutSegment[];
  mode: ChartMode;
  role: RoleKey;
}) {
  const total =
    mode === "sp"
      ? rows.reduce((sum, row) => sum + Math.max(0, row.story_points), 0)
      : rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const segment = segments.find((item) => item.key === row.developer);
        const sliceValue = mode === "sp" ? Math.max(0, row.story_points) : row.count;
        const percent = total > 0 ? Math.round((sliceValue / total) * 100) : 0;
        return (
          <li key={row.developer} className="rounded-2xl bg-surface/80">
            <details className="group overflow-hidden rounded-2xl">
              <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-3 marker:content-none">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: segment?.color ?? "#94a3b8" }}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words font-medium text-ink2 [overflow-wrap:anywhere]">{row.developer}</span>
                    <span className="shrink-0 rounded-full bg-line2/70 px-2 py-0.5 text-xs tabular-nums text-ink3">{percent}%</span>
                  </div>
                  <p className="mt-1 text-xs text-ink3">
                    {formatRoleSp(row.story_points)} · {taskCountLabel(row.count)}
                  </p>
                </div>
              </summary>
              <ul className="space-y-2 px-3 pb-3">
                {row.issues.map((task) => (
                  <li key={task.key} className="rounded-xl bg-bg/80 px-3 py-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {task.url ? (
                        <a href={task.url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                          {task.key}
                        </a>
                      ) : (
                        <span className="font-medium text-ink">{task.key}</span>
                      )}
                      <span className="text-ink3">{formatRoleSp(task.story_points ?? null)}</span>
                      {task.status ? <Badge tone="neutral">{task.status}</Badge> : null}
                      {role === "qa" && (task.status_entered_at || task.status_changed_at) ? (
                        <span className="text-ink3">
                          {formatQueueTimelineDate(task.status_entered_at || task.status_changed_at || "")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-ink2">{task.summary}</p>
                    <div className="mt-1.5">
                      <RoleContributorsLines issue={task} />
                    </div>
                    {task.role_unresolved && Object.keys(task.role_unresolved).length > 0 ? (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-ink3">Почему нет атрибуции</summary>
                        <p className="mt-1 text-ink3">
                          {Object.entries(task.role_unresolved)
                            .map(([roleKey, reason]) => `${roleKey}: ${formatRoleUnresolvedReason(reason)}`)
                            .join("; ")}
                        </p>
                      </details>
                    ) : null}
                    {role !== "qa" && task.assignee ? <p className="mt-1 text-ink3">Текущий assignee: {task.assignee}</p> : null}
                    {role === "qa" && task.qa ? <p className="mt-1 text-ink3">Исполнитель QA: {task.qa}</p> : null}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function hasRoleBreakdown(map: ScopeRoleBreakdownMap | undefined): boolean {
  if (!map) return false;
  return (["front", "back", "qa"] as RoleKey[]).some((role) => (map[role]?.length ?? 0) > 0);
}
