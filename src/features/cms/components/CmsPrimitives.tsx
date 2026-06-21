import type { ReactNode } from "react";
import { Alert, Badge, Button, EmptyState, ListSkeleton, Skeleton as DsSkeleton, Spinner, cn } from "../../../design-system";

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex w-full max-w-4xl flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink sm:text-lg">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-snug text-ink3">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function HelpCallout({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="w-full max-w-3xl rounded-lg border border-line bg-line2/30 p-3 text-sm text-ink2 sm:p-4">
      {title ? <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink3">{title}</p> : null}
      <div className="space-y-1">{children}</div>
    </aside>
  );
}

export function MobilePageHero({
  title,
  description,
  action,
  meta,
  stats,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  stats?: Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "info" | "success" | "warning" | "danger" }>;
  children?: ReactNode;
}) {
  return (
    <section className="-mx-3 border-y border-line bg-surface/85 px-3 py-4 shadow-sm backdrop-blur sm:-mx-4 sm:px-4 lg:hidden">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {meta ? <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink3">{meta}</div> : null}
            <h2 className="text-xl font-bold leading-tight text-ink">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-relaxed text-ink2">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {stats && stats.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {stats.map((item, index) => (
              <MobileMetricTile key={index} {...item} />
            ))}
          </div>
        ) : null}
        {children ? <div>{children}</div> : null}
      </div>
    </section>
  );
}

export function MobileMetricTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClass = {
    neutral: "bg-line2/45 text-ink",
    info: "bg-blue/10 text-blue",
    success: "bg-green/10 text-green",
    warning: "bg-amber/10 text-amber",
    danger: "bg-red/10 text-red",
  }[tone];
  return (
    <div className={cn("min-w-0 rounded-lg px-3 py-3", toneClass, className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <div className="mt-1 min-w-0 text-lg font-bold leading-tight tabular-nums">{value}</div>
      {hint ? <p className="mt-1 text-xs leading-snug opacity-75">{hint}</p> : null}
    </div>
  );
}

export function MobileFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
      <div className="flex min-w-full gap-2 [&>*]:min-w-0 [&>*]:flex-1 lg:min-w-0 lg:flex-wrap lg:[&>*]:flex-none">{children}</div>
    </div>
  );
}

/**
 * Footer for list views with progressive loading. Renders one of three
 * states:
 *  - reachedCap: soft-cap hint with optional search-focus shortcut.
 *  - hasMore: "Показать ещё" button + counter.
 *  - exhausted: muted "Это всё" caption.
 *
 * Accepts both `loading` (first-load) and `loadingMore` (in-flight next
 * page) so the button can disable itself appropriately and the caption can
 * surface progress without blocking the entire list.
 */
export function LoadMoreFooter({
  loading,
  loadingMore = false,
  hasMore,
  reachedCap = false,
  loadedCount,
  total,
  onMore,
  onFocusSearch,
  itemNoun = "записей",
  variant = "table",
}: {
  loading: boolean;
  loadingMore?: boolean;
  hasMore: boolean;
  reachedCap?: boolean;
  loadedCount: number;
  total?: number | null;
  onMore: () => void;
  onFocusSearch?: () => void;
  itemNoun?: string;
  variant?: "table" | "compact";
}) {
  const wrapperClass =
    variant === "compact"
      ? "border-t border-line py-2 px-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      : "border-t border-line px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";

  if (reachedCap) {
    return (
      <div className={wrapperClass}>
        <p className="text-xs text-ink2">
          Показано {loadedCount} {itemNoun}. Уточните поиск или фильтры, чтобы найти нужное.
        </p>
        {onFocusSearch ? (
          <Button variant="ghost" size="sm" onClick={onFocusSearch}>К поиску</Button>
        ) : null}
      </div>
    );
  }

  const counter = total != null ? `${loadedCount} из ${total}` : `${loadedCount}`;
  return (
    <div className={wrapperClass}>
      <p className="inline-flex items-center gap-2 text-xs text-ink3">
        {loading || loadingMore ? <Spinner size="sm" /> : null}
        {loading
          ? "Загрузка"
          : loadingMore
          ? `Загружаем следующую страницу · ${counter}`
          : hasMore
          ? `Показано ${counter}`
          : `Это всё · ${counter}`}
      </p>
      <Button
        className="scope-presentation-keep"
        variant="ghost"
        size="sm"
        onClick={onMore}
        disabled={loading || loadingMore || !hasMore}
        loading={loadingMore}
      >
        Показать ещё
      </Button>
    </div>
  );
}

export function DataTable({
  columns,
  children,
  mobileCards,
  mobileUntil = "lg",
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
  itemNoun,
  showSkeleton = true,
  showFooter = true,
}: {
  columns: string[];
  children: ReactNode;
  mobileCards?: ReactNode;
  mobileUntil?: "md" | "lg";
  empty?: ReactNode;
  loading: boolean;
  loadingMore?: boolean;
  error: string | null;
  hasMore: boolean;
  reachedCap?: boolean;
  loadedCount: number;
  total?: number | null;
  onMore: () => void;
  onFocusSearch?: () => void;
  itemNoun?: string;
  /**
   * When `true` (default) the table renders a list skeleton during the
   * initial load (loading && loadedCount === 0) instead of the regular
   * empty body. Pages that prefer their own placeholder can opt out.
   */
  showSkeleton?: boolean;
  showFooter?: boolean;
}) {
  const showInitialSkeleton = showSkeleton && loading && loadedCount === 0;
  const mobileListClass = mobileUntil === "lg" ? "lg:hidden" : "md:hidden";
  const desktopTableClass =
    mobileUntil === "lg"
      ? "hidden w-full overflow-hidden rounded-lg border border-line bg-surface shadow-card lg:block"
      : "hidden w-full overflow-hidden rounded-lg border border-line bg-surface shadow-card md:block";
  const renderFooter = () => (
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

  if (mobileCards) {
    return (
      <>
        <div className={mobileListClass}>
          {error ? <div className="mb-3"><InlineError text={error} /></div> : null}
          {showInitialSkeleton ? (
            <div className="space-y-3">
              <ListSkeleton rows={6} />
            </div>
          ) : empty ? (
            <div>{empty}</div>
          ) : (
            <div className="space-y-3">
              {mobileCards}
            </div>
          )}
          {showFooter ? renderFooter() : null}
        </div>

        <div className={desktopTableClass}>
          {error ? <div className="p-3"><InlineError text={error} /></div> : null}
          {showInitialSkeleton ? (
            <div className="p-3">
              <ListSkeleton rows={6} />
            </div>
          ) : null}
          {!showInitialSkeleton && empty ? <div className="p-3">{empty}</div> : null}
          {!showInitialSkeleton ? (
            <table className="w-full table-auto text-sm">
              <thead className="bg-line2 text-xs uppercase text-ink3">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-3 py-2 text-left font-bold align-bottom">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{children}</tbody>
            </table>
          ) : null}
          {showFooter ? renderFooter() : null}
        </div>
      </>
    );
  }

  // Desktop tables flex to the container and break long cells (`break-words`
  // on <td> in callers); we keep `overflow-x-auto` only at the wrapper as a
  // safety valve for genuinely wide tables — but our column setup is sized
  // to fit comfortably inside the 7xl content area at md+ without scrolling.
  return (
    <div className="w-full rounded-lg border border-line bg-surface overflow-hidden shadow-card">
      {error ? <div className="p-3"><InlineError text={error} /></div> : null}
      {showInitialSkeleton ? (
        <div className="p-3">
          <ListSkeleton rows={6} />
        </div>
      ) : null}
      {!showInitialSkeleton && empty ? <div className="p-3">{empty}</div> : null}
      {!showInitialSkeleton ? (
        <div className="block">
          <table className="w-full table-auto text-sm">
            <thead className="bg-line2 text-xs uppercase text-ink3">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-3 py-2 text-left font-bold align-bottom">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      ) : null}
      {showFooter ? renderFooter() : null}
    </div>
  );
}

export function CompactList({
  children,
  loading,
  loadingMore = false,
  error,
  hasMore,
  reachedCap = false,
  loadedCount,
  total,
  onMore,
  onFocusSearch,
  itemNoun,
}: {
  children: ReactNode;
  loading: boolean;
  loadingMore?: boolean;
  error: string | null;
  hasMore: boolean;
  reachedCap?: boolean;
  loadedCount: number;
  total?: number | null;
  onMore: () => void;
  onFocusSearch?: () => void;
  itemNoun?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 shadow-card">
      {error ? <InlineError text={error} /> : null}
      {loading && loadedCount === 0 ? (
        <div className="py-3"><ListSkeleton rows={3} dense /></div>
      ) : (
        children
      )}
      <LoadMoreFooter
        variant="compact"
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
    </div>
  );
}

export function MobileRecordCard({
  title,
  meta,
  children,
  action,
  status,
  footer,
}: {
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  status?: ReactNode;
  /** Optional row of full-width controls — typically Buttons. Rendered below
   *  the stat grid with a top border so it visually separates from data. */
  footer?: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-card border border-line border-l-4 border-l-blue/35 bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 text-base font-bold leading-snug text-ink break-words">{title}</div>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {meta ? <div className="mt-1 text-xs leading-relaxed text-ink3">{meta}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-line2/25 p-3 text-xs text-ink3 min-[380px]:grid-cols-2">
          {children}
        </div>
      ) : null}
      {footer ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3 min-[420px]:flex-row min-[420px]:flex-wrap [&>*]:w-full min-[420px]:[&>*]:w-auto">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

export function MobileRecordField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-ink4">{label}</p>
      <div className="mt-0.5 whitespace-normal break-words text-ink2">{value}</div>
    </div>
  );
}

export function MobileFeatureCard({
  title,
  eyebrow,
  subtitle,
  status,
  accent = "blue",
  metrics,
  primaryAction,
  secondaryAction,
  onActivate,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  accent?: "blue" | "green" | "amber" | "red" | "neutral";
  metrics?: Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode }>;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Opens the record when the title area is clicked (mobile list cards). */
  onActivate?: () => void;
  children?: ReactNode;
}) {
  const accentClass = {
    blue: "border-l-blue/70",
    green: "border-l-green/70",
    amber: "border-l-amber/70",
    red: "border-l-red/70",
    neutral: "border-l-line",
  }[accent];
  const titleNode = onActivate ? (
    <button
      type="button"
      className="min-w-0 break-words text-left text-lg font-bold leading-snug text-ink hover:text-blue focus-visible:outline-none focus-visible:underline"
      onClick={onActivate}
    >
      {title}
    </button>
  ) : (
    <h3 className="min-w-0 break-words text-lg font-bold leading-snug text-ink">{title}</h3>
  );
  return (
    <article className={cn("overflow-hidden rounded-xl border border-line border-l-4 bg-surface p-4 shadow-card", accentClass)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink3">{eyebrow}</div> : null}
          {titleNode}
          {subtitle ? <div className="mt-1 text-sm leading-relaxed text-ink3">{subtitle}</div> : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      {metrics && metrics.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {metrics.map((metric, index) => (
            <div key={index} className="min-w-0 rounded-lg bg-line2/35 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink4">{metric.label}</p>
              <div className="mt-1 min-w-0 break-words text-base font-bold leading-tight text-ink2 tabular-nums">{metric.value}</div>
              {metric.hint ? <p className="mt-1 text-xs leading-snug text-ink3">{metric.hint}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      {children ? <div className="mt-4 text-sm leading-relaxed text-ink2">{children}</div> : null}
      {primaryAction || secondaryAction ? (
        <div className="mt-4 flex items-stretch gap-2 border-t border-line pt-3">
          {primaryAction ? <div className="min-w-0 flex-1 [&>*]:w-full [&>*]:pointer-events-auto">{primaryAction}</div> : null}
          {secondaryAction ? <div className="shrink-0 [&>*]:h-full [&>*]:pointer-events-auto">{secondaryAction}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-4xl flex-col gap-2 md:flex-row md:items-center">{children}</div>;
}

export function Status({ active, done, label }: { active: boolean; done?: boolean; label?: string }) {
  const text = label ?? (done ? "завершена" : active ? "идёт" : "неактивна");
  const tone = active && !done ? "success" : done ? "info" : "neutral";
  return <Badge tone={tone}>{text}</Badge>;
}

export function InlineError({ text }: { text: string }) {
  return <Alert tone="danger">{text}</Alert>;
}

export function Skeleton({ height }: { height: string }) {
  return <DsSkeleton className={height} />;
}

export function Centered({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen-mobile items-center justify-center app-gradient-bg py-safe">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink3">
        <Spinner size="sm" />
        <span>{text}</span>
      </div>
    </main>
  );
}

export { EmptyState };
