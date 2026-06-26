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
import { BackLink, Badge, Button, EmptyState, Surface, TextField, TextareaField, cn, useToast } from "../../../design-system";
import {
  cmsProductRadarApi,
  type ProductRadarRecord,
  type ProductRadarRefreshProgress,
  type ProductRadarSnapshot,
} from "../api/cmsClient";
import type { CmsPrincipal } from "../api/cmsTypes";
import { Centered, InlineError, SectionHeader } from "../components/CmsPrimitives";
import { CmsTeamListPage } from "../components/CmsTeamListPage";
import { cmsMobileSectionShell, cmsSectionHeaderPad } from "../components/cmsMobileLayout";
import { ProductRadarRefreshProgressBar } from "./ProductRadarDrilldown";
import { ProductRadarAnalyticsPanel } from "./ProductRadarAnalytics";
import { ProductRadarInsightsFeed } from "./ProductRadarInsightsFeed";
import { ProductRadarLayoutBlock } from "./ProductRadarLayoutBlock";
import { ProductRadarListView } from "./ProductRadarListView";
import {
  DEFAULT_PRODUCT_RADAR_LAYOUT_ORDER,
  mergeProductRadarLayoutOrder,
  readProductRadarLayoutOrder,
  reorderProductRadarLayoutOrder,
  writeProductRadarLayoutOrder,
  type ProductRadarLayoutBlockKey,
} from "./productRadarLayoutOrder";
import {
  defaultProductRadarCreateForm,
  formatProductRadarUpdatedAt,
  needsProductRadarSnapshotRefresh,
  validateProductRadarCreate,
} from "./productRadarForm";
import {
  productRadarTeamBlocking,
  resolveProductRadarInsightsAnalytics,
  useProductRadarPeriod,
} from "./productRadarPeriod";
import { SortableProductRadarBlock } from "./SortableProductRadarBlock";

function healthMeta(status: ProductRadarSnapshot["health_status"]) {
  switch (status) {
    case "critical":
      return { label: "Критично", tone: "danger" as const };
    case "attention":
      return { label: "Есть риски", tone: "warning" as const };
    default:
      return { label: "Под контролем", tone: "success" as const };
  }
}

function ProductRadarView({
  radar,
  refreshing,
  refreshProgress,
  onRefresh,
  onSaveJql,
  toast,
}: {
  radar: ProductRadarRecord;
  refreshing: boolean;
  refreshProgress: ProductRadarRefreshProgress | null;
  onRefresh: (force?: boolean) => void;
  onSaveJql: (jql: string) => Promise<void>;
  toast: ReturnType<typeof useToast>;
}) {
  const snapshot = radar.snapshot;
  const [jqlDraft, setJqlDraft] = useState(radar.jql);
  const [savingJql, setSavingJql] = useState(false);
  const [layoutOrder, setLayoutOrder] = useState<ProductRadarLayoutBlockKey[]>(DEFAULT_PRODUCT_RADAR_LAYOUT_ORDER);
  const [layoutDragging, setLayoutDragging] = useState(false);

  const { period, setPeriod } = useProductRadarPeriod(snapshot?.analytics);
  const insightsAnalytics = useMemo(
    () => resolveProductRadarInsightsAnalytics(snapshot?.analytics),
    [snapshot?.analytics],
  );
  const insightsTeamBlocking = useMemo(
    () => productRadarTeamBlocking(insightsAnalytics),
    [insightsAnalytics],
  );

  const health = healthMeta(snapshot?.health_status);
  const issuesByKey = useMemo(() => {
    const map: Record<string, NonNullable<ProductRadarSnapshot["issues"]>[number]> = {};
    for (const issue of snapshot?.issues ?? []) {
      if (issue.key) map[issue.key] = issue;
    }
    return map;
  }, [snapshot?.issues]);

  const visibleBlockKeys = useMemo(
    (): ProductRadarLayoutBlockKey[] => ["analytics", "insights", "jql"],
    [],
  );

  const visibleLayoutOrder = useMemo(
    () => mergeProductRadarLayoutOrder(layoutOrder, visibleBlockKeys),
    [layoutOrder, visibleBlockKeys],
  );

  useEffect(() => {
    setLayoutOrder(mergeProductRadarLayoutOrder(readProductRadarLayoutOrder(radar.id)));
  }, [radar.id]);

  const layoutSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLayoutDragEnd = useCallback(
    (event: DragEndEvent) => {
      setLayoutDragging(false);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const nextOrder = reorderProductRadarLayoutOrder(
        layoutOrder,
        visibleBlockKeys,
        String(active.id),
        String(over.id),
      );
      setLayoutOrder(nextOrder);
      writeProductRadarLayoutOrder(radar.id, nextOrder);
    },
    [layoutOrder, radar.id, visibleBlockKeys],
  );

  const handleSaveJql = async () => {
    setSavingJql(true);
    try {
      await onSaveJql(jqlDraft.trim());
      toast.success("JQL сохранён");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить JQL");
    } finally {
      setSavingJql(false);
    }
  };

  function renderLayoutBlock(key: ProductRadarLayoutBlockKey) {
    switch (key) {
      case "analytics":
        return (
          <ProductRadarLayoutBlock
            title="Продуктовая аналитика"
            subtitle="Релизный контур, закрытия и нагрузка с drill-down по связям."
          >
            <ProductRadarAnalyticsPanel
              analytics={snapshot?.analytics}
              issuesByKey={issuesByKey}
              period={period}
              onPeriodChange={setPeriod}
            />
          </ProductRadarLayoutBlock>
        );
      case "insights":
        return (
          <ProductRadarLayoutBlock
            title="Блокировки и инсайты"
            subtitle="Актуальные триггеры по портфелю — цепочка эпик → задача → связи."
          >
            <ProductRadarInsightsFeed
              insights={insightsAnalytics?.insights ?? []}
              teamBlocking={insightsTeamBlocking}
              issuesByKey={issuesByKey}
            />
          </ProductRadarLayoutBlock>
        );
      case "jql":
        return (
          <ProductRadarLayoutBlock
            title="JQL"
            subtitle="Фильтр портфеля. По умолчанию — активные задачи BTBMGLBL."
            collapsible
            defaultCollapsed
          >
            <div className="space-y-3">
              <TextField label="JQL" value={jqlDraft} onChange={(event) => setJqlDraft(event.target.value)} />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleSaveJql} disabled={savingJql || jqlDraft.trim() === radar.jql}>
                  {savingJql ? "Сохраняем…" : "Сохранить JQL"}
                </Button>
              </div>
            </div>
          </ProductRadarLayoutBlock>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <BackLink to=".." label="К списку радаров" className="scope-no-print" />
      <Surface className={cmsMobileSectionShell}>
        <div className={cn(cmsSectionHeaderPad, "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between")}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-ink">{radar.name}</h1>
              <Badge tone={health.tone}>{health.label}</Badge>
            </div>
            <p className="text-sm text-ink2">
              Продуктовые метрики: релизный контур, узкие места и нагрузка.
            </p>
            {snapshot?.refreshed_at ? (
              <p className="text-xs text-ink3">
                Обновлено {new Date(snapshot.refreshed_at).toLocaleString("ru-RU")} · {snapshot.active_count ?? 0} активных из{" "}
                {snapshot.issue_count ?? 0}
              </p>
            ) : (
              <p className="text-xs text-amber">Snapshot пуст — нажмите «Обновить из Jira».</p>
            )}
            {snapshot?.warnings?.map((warning) => (
              <p key={warning.code} className="text-xs text-amber">
                {warning.message}
              </p>
            ))}
            <ProductRadarRefreshProgressBar progress={refreshProgress} enriching={refreshing} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onRefresh(false)} disabled={refreshing}>
              {refreshing ? "Обновляем…" : "Обновить из Jira"}
            </Button>
            <Button variant="ghost" onClick={() => onRefresh(true)} disabled={refreshing}>
              Force refresh
            </Button>
          </div>
        </div>
      </Surface>

      <DndContext
        sensors={layoutSensors}
        collisionDetection={closestCenter}
        onDragStart={() => setLayoutDragging(true)}
        onDragEnd={handleLayoutDragEnd}
        onDragCancel={() => setLayoutDragging(false)}
      >
        {layoutDragging ? (
          <div className="scope-no-print pointer-events-none fixed inset-0 z-20 bg-bg/10 backdrop-blur-[2px]" />
        ) : null}
        <SortableContext items={visibleLayoutOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {visibleLayoutOrder.map((key) => (
              <SortableProductRadarBlock key={key} id={key} canDrag={visibleLayoutOrder.length > 1}>
                {renderLayoutBlock(key)}
              </SortableProductRadarBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function ProductRadarListPage({ principal, canManage }: { principal: CmsPrincipal; canManage: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<ProductRadarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cmsProductRadarApi.list();
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить радары.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function deleteRadar(record: ProductRadarRecord) {
    setDeletingId(record.id);
    try {
      await cmsProductRadarApi.delete(record.id);
      setItems((current) => current.filter((item) => item.id !== record.id));
      toast.success("Радар удалён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить радар.");
    } finally {
      setDeletingId(null);
    }
  }

  const latest = useMemo(
    () =>
      items.reduce<ProductRadarRecord | null>((current, item) => {
        if (!current) return item;
        return new Date(item.updated_at ?? 0).getTime() > new Date(current.updated_at ?? 0).getTime() ? item : current;
      }, null),
    [items],
  );

  return (
    <CmsTeamListPage
      principal={principal}
      hideTeamFilter
      className="space-y-5"
      title="Радар"
      description="Продуктовая нагрузка и сигналы по Jira-портфелю: кто загружен, где узкие места, что закрывается."
      mobileDescription="Список радаров портфеля. Откройте существующий или создайте новый с собственным JQL."
      mobileAction={
        canManage ? (
          <Button intent="create" size="sm" onClick={() => navigate("new")}>
            Новый
          </Button>
        ) : undefined
      }
      headerActions={
        canManage ? (
          <Button intent="create" size="sm" onClick={() => navigate("new")}>
            Новый радар
          </Button>
        ) : undefined
      }
      mobileStats={[
        { label: "Радары", value: loading ? "..." : items.length },
        {
          label: "Последний",
          value: latest?.name ?? "нет",
          hint: latest ? formatProductRadarUpdatedAt(latest.updated_at) : undefined,
        },
      ]}
      teamFilter=""
      onTeamFilterChange={() => undefined}
      onRefresh={() => void reload()}
      refreshLoading={loading}
      error={error}
      helpCallout={{
        title: "Кратко",
        children: (
          <p>
            Каждый радар — отдельный JQL-портфель. После создания нажмите «Обновить из Jira», чтобы загрузить задачи,
            метрики закрытий и автоматические сигналы.
          </p>
        ),
      }}
    >
      <ProductRadarListView
        items={items}
        loading={loading}
        canManage={canManage}
        deletingId={deletingId}
        onOpen={(id) => navigate(String(id))}
        onDelete={(record) => void deleteRadar(record)}
        onCreate={canManage ? () => navigate("new") : undefined}
      />
    </CmsTeamListPage>
  );
}

function ProductRadarCreatePage({ canManage }: { canManage: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(defaultProductRadarCreateForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <InlineError text="Недостаточно прав для создания радара." />;
  }

  async function handleCreate() {
    const validated = validateProductRadarCreate(form);
    if ("error" in validated) {
      setError(validated.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await cmsProductRadarApi.create(validated);
      toast.success("Радар создан");
      navigate(`/cms/radar/${response.radar.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать радар.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <BackLink to=".." label="К списку радаров" />
      <SectionHeader title="Новый радар" description="Задайте название и JQL — портфель задач для аналитики и сигналов." />
      {error ? <InlineError text={error} /> : null}
      <div className="space-y-4 rounded-lg border border-line bg-surface p-4 shadow-card">
        <TextField
          label="Название"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Например, Продукт BTBMGLBL"
        />
        <TextareaField
          label="JQL"
          value={form.jql}
          onChange={(event) => setForm((current) => ({ ...current, jql: event.target.value }))}
          rows={5}
        />
        <div className="flex flex-wrap gap-2">
          <Button intent="create" onClick={() => void handleCreate()} loading={saving} disabled={saving}>
            Создать
          </Button>
          <Button intent="neutral" onClick={() => navigate("..")} disabled={saving}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductRadarDetailPage() {
  const { radarId: radarIdParam } = useParams();
  const radarId = Number(radarIdParam);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<ProductRadarRefreshProgress | null>(null);
  const [error, setError] = useState("");
  const [radar, setRadar] = useState<ProductRadarRecord | null>(null);
  const autoRefreshAttempted = useRef(false);

  const loadRadar = useCallback(async (id: number) => {
    const response = await cmsProductRadarApi.get(id);
    setRadar(response.radar);
  }, []);

  const runRefresh = useCallback(
    async (record: ProductRadarRecord, force = false, options?: { silent?: boolean }) => {
      setRefreshing(true);
      setError("");
      try {
        const response = await cmsProductRadarApi.refreshAll(record.id, {
          force,
          onProgress: (progress, updatedRadar) => {
            setRefreshProgress(progress);
            setRadar(updatedRadar);
          },
        });
        setRadar(response.radar);
        setRefreshProgress(response.refresh_progress);
        if (!options?.silent) {
          toast.success(
            response.refresh_progress.status === "complete"
              ? "Данные обновлены из Jira"
              : "Загружен список задач — обогащение не завершено",
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось обновить из Jira";
        setError(message);
        if (!options?.silent) {
          toast.error(message);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (Number.isNaN(radarId)) {
      setError("Некорректный ID radar");
      setLoading(false);
      return;
    }

    autoRefreshAttempted.current = false;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadRadar(radarId);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка загрузки radar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadRadar, radarId]);

  useEffect(() => {
    if (loading || !radar || refreshing || autoRefreshAttempted.current) return;
    if (!needsProductRadarSnapshotRefresh(radar.snapshot)) return;
    autoRefreshAttempted.current = true;
    void runRefresh(radar, false, { silent: true });
  }, [loading, radar, refreshing, runRefresh]);

  const handleRefresh = async (force = false) => {
    if (!radar) return;
    await runRefresh(radar, force);
  };

  const handleSaveJql = async (jql: string) => {
    if (!jql.trim()) {
      throw new Error("Укажите JQL");
    }
    if (!radar) return;
    const response = await cmsProductRadarApi.update(radar.id, { jql });
    setRadar(response.radar);
  };

  if (loading) {
    return <Centered text="Загружаем Product Radar" />;
  }

  if (error && !radar) {
    return <InlineError text={error} />;
  }

  if (!radar) {
    return (
      <EmptyState
        title="Радар не найден"
        description="Возможно, он был удалён или ссылка устарела."
        action={<BackLink to=".." label="К списку радаров" />}
      />
    );
  }

  return (
    <ProductRadarView
      radar={radar}
      refreshing={refreshing}
      refreshProgress={refreshProgress}
      onRefresh={handleRefresh}
      onSaveJql={handleSaveJql}
      toast={toast}
    />
  );
}

export default function ProductRadarShell({
  principal,
  canManage,
}: {
  principal: CmsPrincipal;
  canManage: boolean;
}) {
  return (
    <Routes>
      <Route index element={<ProductRadarListPage principal={principal} canManage={canManage} />} />
      <Route path="new" element={<ProductRadarCreatePage canManage={canManage} />} />
      <Route path=":radarId" element={<ProductRadarDetailPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
