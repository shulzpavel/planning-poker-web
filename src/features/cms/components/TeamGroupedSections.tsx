import type { ReactNode } from "react";
import type { TeamScopedRow } from "./teamGrouping";
import { groupItemsByTeam, shouldGroupListByTeam, sortByUpdatedDesc } from "./teamGrouping";
import { TeamGroupHeading } from "./TeamGroupHeading";
import { DataTable, InlineError, LoadMoreFooter } from "./CmsPrimitives";
import { ListSkeleton } from "../../../design-system";

interface GroupedDataTableListProps<T extends TeamScopedRow> {
  items: T[];
  teamFilter: string;
  columns: string[];
  itemNoun: string;
  empty: ReactNode;
  loading: boolean;
  loadingMore?: boolean;
  error: string | null;
  hasMore: boolean;
  reachedCap?: boolean;
  loadedCount: number;
  total?: number | null;
  onMore: () => void;
  onFocusSearch?: () => void;
  renderRow: (item: T, grouped: boolean) => ReactNode;
  renderMobileCard: (item: T, grouped: boolean) => ReactNode;
}

export function GroupedDataTableList<T extends TeamScopedRow>({
  items,
  teamFilter,
  columns,
  itemNoun,
  empty,
  loading,
  loadingMore = false,
  error,
  hasMore,
  reachedCap = false,
  loadedCount,
  total,
  onMore,
  onFocusSearch,
  renderRow,
  renderMobileCard,
}: GroupedDataTableListProps<T>) {
  const grouped = shouldGroupListByTeam(teamFilter, items);
  const sortedItems = sortByUpdatedDesc(items);

  if (!grouped) {
    return (
      <DataTable
        columns={columns}
        itemNoun={itemNoun}
        empty={empty}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        reachedCap={reachedCap}
        loadedCount={loadedCount}
        total={total}
        onMore={onMore}
        onFocusSearch={onFocusSearch}
        mobileCards={sortedItems.map((item) => renderMobileCard(item, false))}
      >
        {sortedItems.map((item) => renderRow(item, false))}
      </DataTable>
    );
  }

  const groups = groupItemsByTeam(items).map((group) => ({
    ...group,
    items: sortByUpdatedDesc(group.items),
  }));

  const footer = (
    <LoadMoreFooter
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      reachedCap={reachedCap}
      loadedCount={loadedCount}
      total={total}
      onMore={onMore}
      onFocusSearch={onFocusSearch}
      itemNoun={itemNoun}
    />
  );

  const showInitialSkeleton = loading && loadedCount === 0;
  const showEmpty = Boolean(empty) && loadedCount === 0 && !showInitialSkeleton;

  return (
    <>
      <div className="-mx-3 space-y-4 sm:-mx-4 lg:mx-0 lg:hidden">
        {error ? <div className="px-3 sm:px-4"><InlineError text={error} /></div> : null}
        {showInitialSkeleton ? (
          <div className="px-3 sm:px-4"><ListSkeleton rows={6} /></div>
        ) : showEmpty ? (
          <div className="px-3 sm:px-4">{empty}</div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="px-3 sm:px-4">
                <TeamGroupHeading label={group.label} count={group.items.length} />
              </div>
              <div className="space-y-2">
                {group.items.map((item) => renderMobileCard(item, true))}
              </div>
            </section>
          ))
        )}
        {footer}
      </div>

      <div className="hidden space-y-8 lg:block">
        {error ? <InlineError text={error} /> : null}
        {showInitialSkeleton ? (
          <ListSkeleton rows={6} />
        ) : showEmpty ? (
          empty
        ) : (
          groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <TeamGroupHeading label={group.label} count={group.items.length} />
              <DataTable
                columns={columns}
                itemNoun={itemNoun}
                empty={null}
                loading={false}
                error={null}
                hasMore={false}
                loadedCount={group.items.length}
                total={group.items.length}
                onMore={() => undefined}
                showFooter={false}
              >
                {group.items.map((item) => renderRow(item, true))}
              </DataTable>
            </section>
          ))
        )}
        {footer}
      </div>
    </>
  );
}

interface TeamGroupedSectionsProps<T extends TeamScopedRow> {
  items: T[];
  teamFilter: string;
  className?: string;
  renderSection: (sectionItems: T[], grouped: boolean) => ReactNode;
}

export function TeamGroupedSections<T extends TeamScopedRow>({
  items,
  teamFilter,
  className = "space-y-8",
  renderSection,
}: TeamGroupedSectionsProps<T>) {
  const grouped = shouldGroupListByTeam(teamFilter, items);

  if (!grouped) {
    return <div className="-mx-3 sm:-mx-4 lg:mx-0">{renderSection(sortByUpdatedDesc(items), false)}</div>;
  }

  const groups = groupItemsByTeam(items).map((group) => ({
    ...group,
    items: sortByUpdatedDesc(group.items),
  }));

  return (
    <div className={className}>
      {groups.map((group) => (
        <section key={group.key} className="-mx-3 space-y-2 sm:-mx-4 lg:mx-0 lg:space-y-3">
          <div className="px-3 sm:px-4 lg:px-0">
            <TeamGroupHeading label={group.label} count={group.items.length} />
          </div>
          {renderSection(group.items, true)}
        </section>
      ))}
    </div>
  );
}

/** Desktop table shell shared by planner/scope list views. */
export function ListTableSurface({ children }: { children: ReactNode }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-line bg-surface shadow-card lg:block">
      {children}
    </div>
  );
}
