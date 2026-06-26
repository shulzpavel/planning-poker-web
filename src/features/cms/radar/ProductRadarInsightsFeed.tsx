import { useEffect, useMemo, useState } from "react";
import { Badge, Button, cn } from "../../../design-system";
import type { ProductRadarInsight, ProductRadarIssue, ProductRadarTeamBlockingRow } from "../api/cmsClient";
import { JiraIssueLink } from "../scope/scopeFlowPaceAlerts";
import { flowAlertSeverityLabel, flowAlertSeverityTone } from "../scope/scopeFlowPaceHelpers";
import { useListDisplayWindow } from "../scope/scopeListPaging";
import {
  buildBlockingFeed,
  buildIssueContextTree,
  splitBlockingFeed,
  type BlockingFeedRow,
  type IssueContextNode,
} from "./productRadarContext";

const FEED_PAGE_SIZE = 10;

function kindBadge(node: IssueContextNode) {
  switch (node.kind) {
    case "epic":
      return <Badge tone="info">эпик</Badge>;
    case "story":
      return <Badge tone="info">история</Badge>;
    case "blocker":
      return <Badge tone="danger">блокер</Badge>;
    case "link":
      return <Badge tone="neutral">{node.relationLabel || node.relation || "связь"}</Badge>;
    case "subtask":
      return <Badge tone="neutral">дочерняя</Badge>;
    default:
      return <Badge tone="neutral">задача</Badge>;
  }
}

function ContextNodeRow({
  node,
  depth,
  issuesByKey,
  embedded = false,
}: {
  node: IssueContextNode;
  depth: number;
  issuesByKey: Record<string, ProductRadarIssue>;
  embedded?: boolean;
}) {
  const issue = issuesByKey[node.key];
  const url = node.url ?? issue?.url ?? null;

  return (
    <li className="space-y-3">
      <div
        className={cn(
          "rounded-lg border px-4 py-4",
          embedded && depth === 0
            ? "border-accent/25 bg-surface/90"
            : embedded
              ? "border-line/50 bg-surface/70"
              : depth === 0
                ? "rounded-xl border-line/60 bg-surface/80 border-accent/30 bg-accent/5"
                : "rounded-xl border border-line/60 bg-surface/80",
        )}
        style={{ marginLeft: depth * 12 }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {kindBadge(node)}
          <JiraIssueLink issueKey={node.key} url={url} />
          {node.team ? <span className="text-xs text-ink3">{node.team}</span> : null}
          {node.status ? <span className="ml-auto text-xs text-ink2">{node.status}</span> : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink2">{node.summary}</p>
      </div>
      {node.children.length ? (
        <ul className="space-y-3 border-l border-line/50 pl-4">
          {node.children.map((child) => (
            <ContextNodeRow
              key={`${node.key}-${child.key}-${child.kind}`}
              node={child}
              depth={depth + 1}
              issuesByKey={issuesByKey}
              embedded={embedded}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function IssueContextTree({
  rootKey,
  insight,
  issuesByKey,
  embedded = false,
}: {
  rootKey: string;
  insight?: ProductRadarInsight;
  issuesByKey: Record<string, ProductRadarIssue>;
  embedded?: boolean;
}) {
  const tree = useMemo(() => buildIssueContextTree(rootKey, issuesByKey, insight), [insight, issuesByKey, rootKey]);

  if (!tree.length) {
    return (
      <div className={cn("px-1 py-2", embedded ? "" : "rounded-xl border border-line/60 bg-bg/20 px-5 py-5")}>
        <p className="text-sm text-ink3">Контекст задачи недоступен в snapshot.</p>
      </div>
    );
  }

  return (
    <div className={cn(embedded ? "space-y-4" : "rounded-xl border border-line/70 bg-bg/20 px-5 py-6")}>
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          embedded ? "text-accent/80" : "mb-5 text-ink3",
        )}
      >
        Эпик → связанная задача → история → дочерние
      </p>
      <ul className="space-y-4">
        {tree.map((node) => (
          <ContextNodeRow key={node.key} node={node} depth={0} issuesByKey={issuesByKey} embedded={embedded} />
        ))}
      </ul>
    </div>
  );
}

function FeedRowItem({
  row,
  expanded,
  onToggle,
  issuesByKey,
}: {
  row: BlockingFeedRow;
  expanded: boolean;
  onToggle: () => void;
  issuesByKey: Record<string, ProductRadarIssue>;
}) {
  const isBlocking = row.category === "blocking";

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border transition-all",
        expanded
          ? "border-accent/45 bg-accent/[0.07] shadow-sm ring-2 ring-accent/20"
          : "border-line/70 bg-surface hover:border-line hover:bg-bg/25",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "w-full px-5 py-5 text-left transition-colors",
          expanded ? "bg-transparent" : "hover:bg-bg/20",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={flowAlertSeverityTone(row.severity)}>{flowAlertSeverityLabel(row.severity)}</Badge>
          {isBlocking ? (
            <>
              <span className="text-sm font-semibold text-ink">{row.blockingTeam}</span>
              <span className="text-ink3">→</span>
              <span className="text-sm font-semibold text-ink">{row.blockedTeam}</span>
            </>
          ) : (
            <>
              {row.blockedTeam !== "—" ? <span className="text-sm font-semibold text-ink">{row.blockedTeam}</span> : null}
              {row.insight?.kind ? (
                <Badge tone="neutral">{row.insight.kind.replace(/_/g, " ")}</Badge>
              ) : null}
            </>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <JiraIssueLink issueKey={row.blockedKey} url={row.issueUrl ?? null} />
          {row.blockerKey ? (
            <>
              <span className="text-xs text-ink3">блокирует</span>
              <JiraIssueLink issueKey={row.blockerKey} url={issuesByKey[row.blockerKey]?.url ?? null} />
              {row.blockerStatus ? <span className="text-xs text-amber">{row.blockerStatus}</span> : null}
            </>
          ) : null}
        </div>
        <p className="mt-4 text-sm font-medium leading-snug text-ink">{row.title}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink3">{row.detail}</p>
      </button>

      {expanded ? (
        <div className="px-5 pb-6 pt-1">
          <IssueContextTree rootKey={row.blockedKey} insight={row.insight} issuesByKey={issuesByKey} embedded />
        </div>
      ) : null}
    </li>
  );
}

function FeedSection({
  title,
  hint,
  accentClass,
  rows,
  selectedId,
  onSelect,
  issuesByKey,
  emptyText,
}: {
  title: string;
  hint: string;
  accentClass: string;
  rows: BlockingFeedRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  issuesByKey: Record<string, ProductRadarIssue>;
  emptyText: string;
}) {
  const [open, setOpen] = useState(rows.length > 0);

  useEffect(() => {
    if (rows.length > 0) {
      setOpen(true);
    }
  }, [rows.length]);
  const { visibleItems, hasMore, loadMore, loadedCount, total } = useListDisplayWindow(rows, FEED_PAGE_SIZE);

  return (
    <section className="w-full">
      <div className={cn("mb-0 h-1 w-full rounded-full", accentClass)} aria-hidden="true" />

      <div className="flex w-full flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-lg font-semibold text-ink">{title}</h4>
            <Badge tone="neutral">{total}</Badge>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-ink3">{hint}</p>
          {open && total > 0 ? (
            <p className="text-xs tabular-nums text-ink3">
              показано {loadedCount} из {total}
            </p>
          ) : null}
        </div>
        <Button type="button" size="sm" variant={open ? "secondary" : "primary"} onClick={() => setOpen((value) => !value)}>
          {open ? "Свернуть раздел" : total > 0 ? `Показать ${Math.min(FEED_PAGE_SIZE, total)}` : "Пусто"}
        </Button>
      </div>

      {open ? (
        <div className="mt-8 w-full space-y-5">
          {!rows.length ? (
            <p className="py-4 text-sm text-ink3">{emptyText}</p>
          ) : (
            <>
              <ul className="w-full space-y-5">
                {visibleItems.map((row) => {
                  const expanded = selectedId === row.id;
                  return (
                    <FeedRowItem
                      key={row.id}
                      row={row}
                      expanded={expanded}
                      onToggle={() => onSelect(expanded ? null : row.id)}
                      issuesByKey={issuesByKey}
                    />
                  );
                })}
              </ul>
              {hasMore ? (
                <div className="flex justify-center pt-2">
                  <Button type="button" size="sm" variant="secondary" onClick={loadMore}>
                    Ещё {Math.min(FEED_PAGE_SIZE, total - loadedCount)}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function ProductRadarInsightsFeed({
  insights,
  teamBlocking,
  prebuiltBlockings,
  issuesByKey,
}: {
  insights: ProductRadarInsight[];
  teamBlocking?: { teams?: ProductRadarTeamBlockingRow[]; total_blocks?: number };
  prebuiltBlockings?: BlockingFeedRow[];
  issuesByKey: Record<string, ProductRadarIssue>;
}) {
  const feed = useMemo(() => buildBlockingFeed(insights, teamBlocking, issuesByKey), [insights, issuesByKey, teamBlocking]);
  const { blockings: derivedBlockings, insights: insightRows } = useMemo(() => splitBlockingFeed(feed), [feed]);
  const blockings = prebuiltBlockings?.length ? prebuiltBlockings : derivedBlockings;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!blockings.length && !insightRows.length) {
    return <p className="text-sm text-ink3">Блокировок и критичных инсайтов не найдено.</p>;
  }

  return (
    <div className="w-full space-y-12">
      <p className="text-sm leading-relaxed text-ink3">
        {blockings.length} блокировок · {insightRows.length} инсайтов. Разделы свёрнуты — раскройте нужный, клик по
        строке откроет цепочку эпик → задача → связи.
      </p>

      <FeedSection
        title="Межкомандные блокировки"
        hint="Команда блокирует команду: явный blocker в Jira или cross-team block."
        accentClass="bg-red/70"
        rows={blockings}
        selectedId={selectedId}
        onSelect={setSelectedId}
        issuesByKey={issuesByKey}
        emptyText="Межкомандных блокировок нет."
      />

      <div className="border-t border-line/60" aria-hidden="true" />

      <FeedSection
        title="Продуктовые инсайты"
        hint="Узкие места, релизный хвост, застревания в dev/test — без прямой блокировки другой командой."
        accentClass="bg-accent/70"
        rows={insightRows}
        selectedId={selectedId}
        onSelect={setSelectedId}
        issuesByKey={issuesByKey}
        emptyText="Дополнительных инсайтов нет."
      />
    </div>
  );
}
