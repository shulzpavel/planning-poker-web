import type { ReactNode } from "react";
import type { CmsPrincipal } from "../api/cmsTypes";
import type { UseCmsListResult } from "../hooks/useCmsList";
import { useCmsTeams } from "../hooks/useCmsTeams";
import { TeamFilter } from "./TeamFilter";
import {
  HelpCallout,
  InlineError,
  LoadMoreFooter,
  MobileFilterBar,
  MobilePageHero,
  SectionHeader,
  Toolbar,
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
  /** Desktop toolbar controls shown before the team filter. */
  toolbar?: ReactNode;
  /** Optional duplicate toolbar row on mobile (below team filter). */
  mobileToolbar?: ReactNode;
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
  children: ReactNode;
  className?: string;
}

/**
 * Shared CMS list page shell: mobile hero, desktop header, superuser team
 * filter (mobile bar + desktop toolbar), optional help callout and paging footer.
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
  mobileToolbar,
  error,
  banner,
  listFooter,
  children,
  className = "space-y-4",
}: CmsTeamListPageProps) {
  const { teams } = useCmsTeams(principal);
  const showTeamFilter = principal.is_superuser;

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

      {showTeamFilter ? (
        <>
          <div className="lg:hidden">
            <MobileFilterBar>
              <TeamFilter teams={teams} value={teamFilter} onChange={onTeamFilterChange} />
            </MobileFilterBar>
          </div>
          {mobileToolbar ? <div className="space-y-2 lg:hidden">{mobileToolbar}</div> : null}
          <div className="hidden lg:block">
            <Toolbar>
              {toolbar}
              <TeamFilter teams={teams} value={teamFilter} onChange={onTeamFilterChange} />
            </Toolbar>
          </div>
        </>
      ) : toolbar ? (
        <>
          <div className="lg:hidden">{mobileToolbar ?? toolbar}</div>
          <div className="hidden lg:block">
            <Toolbar>{toolbar}</Toolbar>
          </div>
        </>
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
