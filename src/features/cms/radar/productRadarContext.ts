import type {
  ProductRadarInsight,
  ProductRadarIssue,
  ProductRadarTeamBlockingRow,
} from "../api/cmsClient";
import { buildJiraBrowseUrl } from "../scope/scopeFlowPaceHelpers";

export type IssueContextNode = {
  key: string;
  summary: string;
  url?: string | null;
  status?: string;
  team?: string;
  relation?: string;
  relationLabel?: string;
  kind: "epic" | "story" | "issue" | "link" | "subtask" | "blocker";
  children: IssueContextNode[];
};

export type BlockingFeedRow = {
  id: string;
  category: "blocking" | "insight";
  severity: "high" | "medium" | "low";
  blockingTeam: string;
  blockedTeam: string;
  blockedKey: string;
  blockerKey?: string;
  blockerStatus?: string;
  title: string;
  detail: string;
  issueUrl?: string | null;
  insight?: ProductRadarInsight;
};

type RadarIssueExt = ProductRadarIssue & {
  linked_epic_key?: string;
  epic_key?: string;
  flow_epic_key?: string;
  parent_key?: string;
  issue_type?: string;
};

function issueTypeName(issue: RadarIssueExt): string {
  return String(issue.issue_type || "").trim().toLowerCase();
}

export function isEpicIssue(issue: ProductRadarIssue): boolean {
  return issueTypeName(issue as RadarIssueExt).includes("epic");
}

export function isStoryIssue(issue: ProductRadarIssue): boolean {
  const type = issueTypeName(issue as RadarIssueExt);
  return type.includes("story") || type.includes("истор") || type.includes("history");
}

export function isSubtaskIssue(issue: ProductRadarIssue): boolean {
  const type = issueTypeName(issue as RadarIssueExt);
  return type.includes("sub") || type.includes("подзадач");
}

export function getParentChain(
  key: string,
  issuesByKey: Record<string, ProductRadarIssue>,
): ProductRadarIssue[] {
  const chain: ProductRadarIssue[] = [];
  const seen = new Set<string>();
  let currentKey = key;
  while (currentKey && !seen.has(currentKey)) {
    seen.add(currentKey);
    const current = issuesByKey[currentKey] as RadarIssueExt | undefined;
    const parentKey = String(current?.parent_key || "").trim();
    if (!parentKey || seen.has(parentKey)) break;
    const parent = issuesByKey[parentKey];
    if (!parent) break;
    chain.push(parent);
    currentKey = parentKey;
  }
  return chain;
}

export function resolveIssueEpicKey(
  issue: ProductRadarIssue,
  issuesByKey?: Record<string, ProductRadarIssue>,
): string {
  const raw = issue as RadarIssueExt;
  for (const field of [raw.linked_epic_key, raw.epic_key, raw.flow_epic_key]) {
    const value = String(field || "").trim();
    if (value) return value;
  }
  if (issuesByKey) {
    for (const parent of getParentChain(String(issue.key || ""), issuesByKey)) {
      if (isEpicIssue(parent)) return String(parent.key || "");
      const nested = resolveIssueEpicKey(parent, issuesByKey);
      if (nested) return nested;
    }
  }
  const parentKey = String(raw.parent_key || "").trim();
  if (parentKey && issuesByKey?.[parentKey] && isEpicIssue(issuesByKey[parentKey])) {
    return parentKey;
  }
  return "";
}

export function inferJiraBrowseBase(issuesByKey: Record<string, ProductRadarIssue>): string | null {
  for (const issue of Object.values(issuesByKey)) {
    const url = String(issue.url || "").trim();
    if (!url) continue;
    const match = url.match(/^(.*\/browse)\/[^/]+$/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function resolveRadarIssueUrl(
  key: string,
  issuesByKey: Record<string, ProductRadarIssue>,
  browseBase?: string | null,
): string | null {
  const trimmedKey = String(key || "").trim();
  if (!trimmedKey) return null;
  const issue = issuesByKey[trimmedKey];
  if (issue?.url) return issue.url;
  const base = browseBase ?? inferJiraBrowseBase(issuesByKey);
  return buildJiraBrowseUrl(trimmedKey, base);
}

function issueNode(
  issue: ProductRadarIssue,
  kind: IssueContextNode["kind"],
  relation?: string,
  relationLabel?: string,
): IssueContextNode {
  return {
    key: issue.key,
    summary: issue.summary || issue.key,
    url: issue.url,
    status: issue.status,
    team: issue.drilldown?.team ?? issue.team,
    relation,
    relationLabel,
    kind,
    children: [],
  };
}

function stubNode(
  key: string,
  kind: IssueContextNode["kind"],
  summary?: string,
  url?: string | null,
): IssueContextNode {
  return {
    key,
    summary: summary || key,
    url,
    kind,
    children: [],
  };
}

function linkNodes(
  issue: ProductRadarIssue,
  issuesByKey: Record<string, ProductRadarIssue>,
  excludeKeys: Set<string>,
  browseBase: string | null,
): IssueContextNode[] {
  const links = issue.drilldown?.issue_links ?? issue.issue_links ?? [];
  const nodes: IssueContextNode[] = [];
  for (const link of links) {
    if (!link.key || excludeKeys.has(link.key)) continue;
    const linked = issuesByKey[link.key];
    const node: IssueContextNode = linked
      ? issueNode(linked, "link", link.relation, link.relation_label)
      : {
          key: link.key,
          summary: link.summary || link.key,
          url: resolveRadarIssueUrl(link.key, issuesByKey, browseBase),
          status: link.status,
          team: link.team,
          relation: link.relation,
          relationLabel: link.relation_label,
          kind: "link",
          children: [],
        };
    if (linked) {
      node.children = subtaskNodes(linked, issuesByKey, excludeKeys, browseBase);
    }
    nodes.push(node);
  }
  return nodes;
}

function subtaskNodes(
  issue: ProductRadarIssue,
  issuesByKey: Record<string, ProductRadarIssue>,
  excludeKeys: Set<string>,
  browseBase: string | null,
): IssueContextNode[] {
  const subtasks = issue.drilldown?.subtasks ?? issue.subtasks ?? [];
  return subtasks
    .filter((subtask) => subtask.key && !excludeKeys.has(subtask.key))
    .map((subtask) => ({
      key: subtask.key,
      summary: subtask.summary || subtask.key,
      url: subtask.url || resolveRadarIssueUrl(subtask.key, issuesByKey, browseBase),
      status: subtask.status,
      team: subtask.assignee,
      kind: "subtask" as const,
      children: [],
    }));
}

function blockerNode(
  insight: ProductRadarInsight | undefined,
  issuesByKey: Record<string, ProductRadarIssue>,
  excludeKeys: Set<string>,
  browseBase: string | null,
): IssueContextNode | null {
  if (!insight?.blocker_key || excludeKeys.has(insight.blocker_key)) return null;
  const blocker = issuesByKey[insight.blocker_key];
  const node = blocker
    ? issueNode(blocker, "blocker")
    : stubNode(
        insight.blocker_key,
        "blocker",
        insight.blocker_key,
        resolveRadarIssueUrl(insight.blocker_key, issuesByKey, browseBase),
      );
  if (blocker) {
    node.status = blocker.status;
    node.team = insight.blocker_team || blocker.team;
    node.children = subtaskNodes(blocker, issuesByKey, excludeKeys, browseBase).concat(
      linkNodes(blocker, issuesByKey, excludeKeys, browseBase),
    );
  } else {
    node.status = insight.blocker_status;
    node.team = insight.blocker_team;
  }
  return node;
}

function nestLineage(nodes: IssueContextNode[]): IssueContextNode[] {
  if (!nodes.length) return [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const current = nodes[index];
    const next = nodes[index + 1];
    if (!current.children.some((child) => child.key === next.key)) {
      current.children = [next, ...current.children];
    }
  }
  return [nodes[0]];
}

export function buildIssueContextTree(
  rootKey: string,
  issuesByKey: Record<string, ProductRadarIssue>,
  insight?: ProductRadarInsight,
): IssueContextNode[] {
  const root = issuesByKey[rootKey];
  if (!root) return [];

  const browseBase = inferJiraBrowseBase(issuesByKey);
  const parents = getParentChain(rootKey, issuesByKey);
  const lineageKeys = new Set<string>([rootKey]);
  for (const parent of parents) {
    if (parent.key) lineageKeys.add(parent.key);
  }

  const epicKey = resolveIssueEpicKey(root, issuesByKey);
  if (epicKey) lineageKeys.add(epicKey);

  const storyIssue =
    [...parents].reverse().find((issue) => isStoryIssue(issue)) ?? (isStoryIssue(root) ? root : null);
  const taskIssue = isSubtaskIssue(root)
    ? parents.find((issue) => !isStoryIssue(issue) && !isEpicIssue(issue)) ?? parents[0] ?? null
    : !isStoryIssue(root) && !isEpicIssue(root)
      ? root
      : null;

  const lineage: IssueContextNode[] = [];

  if (epicKey) {
    const epic = issuesByKey[epicKey];
    lineage.push(
      epic
        ? issueNode(epic, "epic")
        : stubNode(epicKey, "epic", `Эпик ${epicKey}`, resolveRadarIssueUrl(epicKey, issuesByKey, browseBase)),
    );
  }

  if (storyIssue?.key && storyIssue.key !== epicKey) {
    lineage.push(issueNode(storyIssue, "story"));
  }

  if (taskIssue?.key && taskIssue.key !== storyIssue?.key && taskIssue.key !== epicKey && taskIssue.key !== rootKey) {
    lineage.push(issueNode(taskIssue, "issue"));
  }

  const rootKind: IssueContextNode["kind"] = isSubtaskIssue(root)
    ? "subtask"
    : isStoryIssue(root)
      ? "story"
      : isEpicIssue(root)
        ? "epic"
        : "issue";

  if (!lineage.some((node) => node.key === rootKey)) {
    lineage.push(issueNode(root, rootKind));
  }

  const tree = nestLineage(lineage);
  const leaf = lineage[lineage.length - 1];
  const focalIssue = taskIssue ?? root;
  const excludeKeys = new Set(lineageKeys);

  const blocker = blockerNode(insight, issuesByKey, excludeKeys, browseBase);
  const linkedUnderStory =
    storyIssue && storyIssue.key !== rootKey
      ? linkNodes(storyIssue, issuesByKey, excludeKeys, browseBase).filter(
          (node) => !lineage.some((item) => item.key === node.key),
        )
      : [];

  const leafChildren: IssueContextNode[] = [];
  if (blocker) leafChildren.push(blocker);
  leafChildren.push(...linkedUnderStory.filter((node) => !leafChildren.some((item) => item.key === node.key)));
  leafChildren.push(
    ...linkNodes(focalIssue, issuesByKey, excludeKeys, browseBase).filter(
      (node) => !leafChildren.some((item) => item.key === node.key),
    ),
  );
  leafChildren.push(
    ...subtaskNodes(focalIssue, issuesByKey, excludeKeys, browseBase).filter(
      (node) => !leafChildren.some((item) => item.key === node.key),
    ),
  );

  if (isSubtaskIssue(root) && focalIssue.key !== rootKey) {
    const rootNode = issueNode(root, "subtask");
    const existingRoot = leafChildren.find((node) => node.key === rootKey);
    if (!existingRoot) {
      leafChildren.unshift(rootNode);
    }
  }

  leaf.children = [...leaf.children.filter((child) => !leafChildren.some((item) => item.key === child.key)), ...leafChildren];

  if (storyIssue && linkedUnderStory.length) {
    const storyNode = lineage.find((node) => node.key === storyIssue.key);
    if (storyNode && storyNode !== leaf) {
      const linkedNotNested = linkedUnderStory.filter(
        (node) => !storyNode.children.some((child) => child.key === node.key),
      );
      storyNode.children = [...linkedNotNested, ...storyNode.children];
    }
  }

  return tree;
}

export function buildBlockingFeed(
  insights: ProductRadarInsight[],
  teamBlocking: { teams?: ProductRadarTeamBlockingRow[]; total_blocks?: number } | undefined,
  issuesByKey: Record<string, ProductRadarIssue>,
): BlockingFeedRow[] {
  const rows: BlockingFeedRow[] = [];
  const seen = new Set<string>();

  for (const insight of insights) {
    if (insight.kind !== "cross_team_block" && !insight.blocker_key) continue;
    const blockedKey = insight.issue_key;
    const blockerKey = insight.blocker_key;
    const id = `insight:${insight.kind}:${blockedKey}:${blockerKey || ""}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const blocked = issuesByKey[blockedKey];
    rows.push({
      id,
      category: "blocking",
      severity: (insight.severity ?? "medium") as BlockingFeedRow["severity"],
      blockingTeam: insight.blocker_team || insight.metric_value || insight.blocker_key || "—",
      blockedTeam: insight.blocked_team || insight.parent_team || blocked?.team || "—",
      blockedKey,
      blockerKey,
      blockerStatus: insight.blocker_status,
      title: insight.title,
      detail: insight.detail,
      issueUrl: insight.issue_url ?? blocked?.url,
      insight,
    });
  }

  for (const team of teamBlocking?.teams ?? []) {
    for (const item of team.items ?? []) {
      const blockedKey = item.issue_key || "";
      const blockerKey = item.blocker_key || "";
      const id = `team:${team.key}:${blockedKey}:${blockerKey}`;
      if (!blockedKey || seen.has(id)) continue;
      seen.add(id);
      rows.push({
        id,
        category: "blocking",
        severity: "high",
        blockingTeam: team.label,
        blockedTeam: item.blocked_team || item.team || "—",
        blockedKey,
        blockerKey: blockerKey || undefined,
        blockerStatus: item.blocker_status,
        title: `${team.label} блокирует`,
        detail: item.summary || blockedKey,
        issueUrl: item.issue_url,
      });
    }
  }

  for (const insight of insights) {
    if (insight.kind === "cross_team_block") continue;
    const id = `insight:${insight.kind}:${insight.issue_key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      category: "insight",
      severity: (insight.severity ?? "low") as BlockingFeedRow["severity"],
      blockingTeam: insight.blocker_team || "—",
      blockedTeam: insight.parent_team || issuesByKey[insight.issue_key]?.team || "—",
      blockedKey: insight.issue_key,
      blockerKey: insight.blocker_key,
      blockerStatus: insight.blocker_status,
      title: insight.title,
      detail: insight.detail,
      issueUrl: insight.issue_url ?? issuesByKey[insight.issue_key]?.url,
      insight,
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return rows.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      a.blockingTeam.localeCompare(b.blockingTeam, "ru") ||
      a.blockedKey.localeCompare(b.blockedKey, "ru"),
  );
}

export function splitBlockingFeed(rows: BlockingFeedRow[]): {
  blockings: BlockingFeedRow[];
  insights: BlockingFeedRow[];
} {
  const blockings: BlockingFeedRow[] = [];
  const insights: BlockingFeedRow[] = [];
  for (const row of rows) {
    if (row.category === "blocking") blockings.push(row);
    else insights.push(row);
  }
  return { blockings, insights };
}
