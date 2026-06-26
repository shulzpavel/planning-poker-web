import type { ReactNode } from "react";
import type { CmsPrincipal } from "../api/cmsTypes";
import type { UseCmsListResult } from "../hooks/useCmsList";
import { useCmsTeams } from "../hooks/useCmsTeams";
import { TeamFilter } from "./TeamFilter";
import {
  FilterBar,
  HelpCallout,
  InlineError,
  LoadMoreFooter,
  MobilePageHero,
  SectionHeader,
} from "./CmsPrimitives";

type HeroStat = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
};

export interface CmsTeamListPageProps {
  principal: CmsPrincipal;
  title: string;
  description: string;
  mobileDescription?: string;
  mobileAction?: ReactNode;
  headerActions?: ReactNode;
  mobileStats?: HeroStat[];
  helpCallout?: { title?: ReactNode; children: ReactNode };
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
  /** Filter controls (search, status, …) — team filter is appended for superusers. */
  toolbar?: ReactNode;
  onRefresh?: () => void;
  onReset?: () => void;
  resetDisabled?: boolean;
  resetLabel?: string;
  refreshLoading?: boolean;
  error?: string | null;
  banner?: ReactNode;
  /** When set, renders a standalone LoadMoreFooter below children. */
  listFooter?: Pick<
    UseCmsListResult<unknown>,
    "loading" | "loadingMore" | "hasMore" | "reachedCap" | "items" | "total" | "loadMore"
  > & {
    itemNoun: string;
    onFocusSearch?: () => void;
  };
  /** When true, superusers do not see the team filter (e.g. portfolio radars). */
  hideTeamFilter?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Shared CMS list page shell: mobile hero, desktop header, unified filter bar
 * (page filters + superuser team filter), optional help callout and paging footer.
 */
export function CmsTeamListPage({
  principal,
  title,
  description,
  mobileDescription,
  mobileAction,
  headerActions,
  mobileStats,
  helpCallout,
  teamFilter,
  onTeamFilterChange,
  toolbar,
  onRefresh,
  onReset,
  resetDisabled,
  resetLabel,
  refreshLoading,
  error,
  banner,
  listFooter,
  hideTeamFilter = false,
  children,
  className = "space-y-4",
}: CmsTeamListPageProps) {
  const { teams } = useCmsTeams(principal);
  const showTeamFilter = principal.is_superuser && !hideTeamFilter;
  const showFilterBar = Boolean(toolbar || showTeamFilter);

  return (
    <section className={className}>
      <MobilePageHero
        title={title}
        description={mobileDescription ?? description}
        action={mobileAction}
        stats={mobileStats}
      />

      <div className="hidden lg:block">
        <SectionHeader title={title} description={description} actions={headerActions} />
      </div>

      {helpCallout ? (
        <div className="hidden lg:block">
          <HelpCallout title={helpCallout.title}>{helpCallout.children}</HelpCallout>
        </div>
      ) : null}

      {banner}
      {error ? <InlineError text={error} /> : null}

      {showFilterBar ? (
        <FilterBar
          onRefresh={onRefresh}
          onReset={onReset}
          resetDisabled={resetDisabled}
          resetLabel={resetLabel}
          refreshLoading={refreshLoading}
        >
          {toolbar}
          {showTeamFilter ? (
            <TeamFilter teams={teams} value={teamFilter} onChange={onTeamFilterChange} />
          ) : null}
        </FilterBar>
      ) : null}

      {children}

      {listFooter ? (
        <LoadMoreFooter
          loading={listFooter.loading}
          loadingMore={listFooter.loadingMore}
          hasMore={listFooter.hasMore}
          reachedCap={listFooter.reachedCap}
          loadedCount={listFooter.items.length}
          total={listFooter.total}
          onMore={listFooter.loadMore}
          onFocusSearch={listFooter.onFocusSearch}
          itemNoun={listFooter.itemNoun}
        />
      ) : null}
    </section>
  );
}
