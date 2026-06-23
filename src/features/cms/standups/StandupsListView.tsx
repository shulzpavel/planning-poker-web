import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, EmptyState } from "../../../design-system";
import type { StandupRecord } from "../api/cmsClient";
import { CmsSection } from "../components/CmsSection";
import { InlineError, LoadMoreFooter, MobileRecordCard } from "../components/CmsPrimitives";
import { ListTableSurface } from "../components/TeamGroupedSections";
import { TeamGroupHeading } from "../components/TeamGroupHeading";
import { formatStandupDate, standupListSummary } from "./standupsLogic";
import {
  countStandupListRecords,
  currentStandupMonthKey,
  groupStandupsForList,
} from "./standupListGrouping";

interface StandupsListViewProps {
  items: StandupRecord[];
  teamFilter: string;
  canManage: boolean;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  reachedCap?: boolean;
  loadedCount: number;
  total?: number | null;
  error: string | null;
  onMore: () => void;
}

export function StandupsListView({
  items,
  teamFilter,
  canManage,
  loading,
  loadingMore,
  hasMore,
  reachedCap = false,
  loadedCount,
  total,
  error,
  onMore,
}: StandupsListViewProps) {
  const navigate = useNavigate();
  const currentMonth = currentStandupMonthKey();
  const teamGroups = useMemo(() => groupStandupsForList(items, teamFilter), [items, teamFilter]);
  const visibleCount = countStandupListRecords(teamGroups);
  const showInitialSkeleton = loading && loadedCount === 0;
  const showEmpty = !showInitialSkeleton && visibleCount === 0;

  if (showInitialSkeleton) {
    return null;
  }

  if (showEmpty) {
    return (
      <EmptyState
        title="Дейликов нет"
        description={
          canManage
            ? "За выбранный период записей нет. Проверьте фильтр «С» / «По» или создайте новый дейлик."
            : "За выбранный период нет опубликованных записей. Попробуйте расширить диапазон дат."
        }
        action={
          canManage ? (
            <Button intent="create" size="sm" onClick={() => navigate("new")}>
              Создать
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {error ? <InlineError text={error} /> : null}
      {teamGroups.map((teamGroup) => (
        <section key={teamGroup.key} className="space-y-4">
          {teamGroup.label ? <TeamGroupHeading label={teamGroup.label} count={countStandupListRecords([teamGroup])} /> : null}
          <div className="space-y-3">
            {teamGroup.months.map((month) => (
              <CmsSection
                key={`${teamGroup.key}-${month.key}`}
                defaultOpen={month.key === currentMonth}
                title={month.label}
                subtitle={`${month.items.length} ${month.items.length === 1 ? "запись" : month.items.length < 5 ? "записи" : "записей"}`}
              >
                <div className="space-y-2 lg:hidden">
                  {month.items.map((item) => (
                    <MobileRecordCard
                      key={item.id}
                      title={formatStandupDate(item.meeting_date)}
                      meta={standupListSummary(item)}
                      status={
                        <Badge tone={item.status === "published" ? "success" : "warning"}>
                          {item.status === "published" ? "Опубликован" : "Черновик"}
                        </Badge>
                      }
                      action={
                        <Button intent="open" size="sm" onClick={() => navigate(String(item.id))}>
                          Открыть
                        </Button>
                      }
                    />
                  ))}
                </div>
                <ListTableSurface>
                  <table className="w-full table-auto text-sm">
                    <thead className="bg-line2 text-xs uppercase text-ink3">
                      <tr>
                        {["Дата", "Сводка", "Статус", ""].map((column) => (
                          <th key={column} className="px-3 py-2 text-left font-bold align-bottom">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {month.items.map((item) => (
                        <tr key={item.id} className="border-t border-line">
                          <td className="px-3 py-2 font-medium text-ink">{formatStandupDate(item.meeting_date)}</td>
                          <td className="px-3 py-2 text-ink2">{standupListSummary(item)}</td>
                          <td className="px-3 py-2">
                            <Badge tone={item.status === "published" ? "success" : "warning"}>
                              {item.status === "published" ? "Опубликован" : "Черновик"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button intent="open" size="sm" onClick={() => navigate(String(item.id))}>
                              Открыть
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ListTableSurface>
              </CmsSection>
            ))}
          </div>
        </section>
      ))}
      <LoadMoreFooter
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        reachedCap={reachedCap}
        loadedCount={loadedCount}
        total={total}
        onMore={onMore}
        itemNoun="дейликов"
      />
    </div>
  );
}
