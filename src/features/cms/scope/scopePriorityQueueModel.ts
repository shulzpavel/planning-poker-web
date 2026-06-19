import { arrayMove } from "@dnd-kit/sortable";
import type { ScopeBoardIssue, ScopePriorityQueue } from "../api/cmsClient";
import { jiraPriorityRank } from "./scopeBoardHelpers";

export type QueueWarehouseType = "story" | "incident" | "bug" | "task";

export const WAREHOUSE_TYPE_ORDER: QueueWarehouseType[] = ["story", "incident", "bug", "task"];

export const WAREHOUSE_TYPE_LABELS: Record<QueueWarehouseType, string> = {
  story: "Истории",
  incident: "Инциденты",
  bug: "Баги",
  task: "Задачи",
};

export const RANKED_DROP_ZONE_ID = "__ranked_zone__";
export const WAREHOUSE_DROP_ZONE_ID = "__warehouse_zone__";

export interface WarehouseNewCounts {
  story: number;
  incident: number;
  bug: number;
  task: number;
}

export interface SplitPriorityQueue {
  rankedOrder: string[];
  rankedIssues: ScopeBoardIssue[];
  warehouseIssues: ScopeBoardIssue[];
  warehouseNewKeys: Set<string>;
  warehouseNewCounts: WarehouseNewCounts;
}

export function queueWarehouseType(issue: ScopeBoardIssue): QueueWarehouseType {
  const key = (issue.key || "").trim().toUpperCase();
  if (key.startsWith("INC-")) return "incident";
  const type = (issue.issue_type || "").trim().toLowerCase();
  if (type === "story" || type === "user story" || type === "история") return "story";
  if (type === "incident" || type === "инцидент") return "incident";
  if (type === "bug" || type === "баг" || type === "defect" || type === "ошибка") return "bug";
  return "task";
}

export function emptyWarehouseNewCounts(): WarehouseNewCounts {
  return { story: 0, incident: 0, bug: 0, task: 0 };
}

export function totalWarehouseNewCounts(counts: WarehouseNewCounts): number {
  return counts.story + counts.incident + counts.bug + counts.task;
}

function normalizeRankedOrder(queue: ScopePriorityQueue): string[] {
  const ranked = queue.ranked_order ?? [];
  if (ranked.length > 0) return ranked;
  return queue.order ?? [];
}

export function splitPriorityQueue(queue: ScopePriorityQueue): SplitPriorityQueue {
  const issuesByKey = new Map((queue.issues ?? []).map((issue) => [issue.key, issue]));
  const rankedOrder = normalizeRankedOrder(queue).filter((key) => issuesByKey.has(key));
  const rankedSet = new Set(rankedOrder);
  const rankedIssues = rankedOrder
    .map((key) => issuesByKey.get(key))
    .filter((issue): issue is ScopeBoardIssue => Boolean(issue));

  const warehouseIssues = (queue.issues ?? [])
    .filter((issue) => !rankedSet.has(issue.key))
    .sort((left, right) => {
      const typeDelta =
        WAREHOUSE_TYPE_ORDER.indexOf(queueWarehouseType(left)) -
        WAREHOUSE_TYPE_ORDER.indexOf(queueWarehouseType(right));
      if (typeDelta !== 0) return typeDelta;
      const priorityDelta = jiraPriorityRank(left.priority) - jiraPriorityRank(right.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return left.key.localeCompare(right.key);
    });

  const warehouseNewKeys = new Set((queue.warehouse_new_keys ?? []).map((key) => key.toUpperCase()));
  const rawCounts = queue.warehouse_new_counts ?? {};
  const warehouseNewCounts: WarehouseNewCounts = {
    story: rawCounts.story ?? 0,
    incident: rawCounts.incident ?? 0,
    bug: rawCounts.bug ?? 0,
    task: rawCounts.task ?? 0,
  };

  return {
    rankedOrder,
    rankedIssues,
    warehouseIssues,
    warehouseNewKeys,
    warehouseNewCounts,
  };
}

export interface WarehouseGroup {
  type: QueueWarehouseType;
  label: string;
  issues: ScopeBoardIssue[];
  newCount: number;
}

export function groupWarehouseIssues(
  issues: ScopeBoardIssue[],
  _newKeys: Set<string>,
  newCounts: WarehouseNewCounts
): WarehouseGroup[] {
  return WAREHOUSE_TYPE_ORDER.map((type) => {
    const grouped = issues.filter((issue) => queueWarehouseType(issue) === type);
    return {
      type,
      label: WAREHOUSE_TYPE_LABELS[type],
      issues: grouped,
      newCount: newCounts[type] ?? 0,
    };
  }).filter((group) => group.issues.length > 0);
}

export function computeNextRankedOrder(
  rankedOrder: string[],
  activeKey: string,
  overId: string | null
): string[] | null {
  if (!overId || activeKey === overId) return null;

  if (overId === WAREHOUSE_DROP_ZONE_ID) {
    return rankedOrder.filter((key) => key !== activeKey);
  }

  const activeIndex = rankedOrder.indexOf(activeKey);
  const overIndex = rankedOrder.indexOf(overId);

  if (activeIndex >= 0 && overIndex >= 0) {
    return arrayMove(rankedOrder, activeIndex, overIndex);
  }

  if (activeIndex < 0) {
    if (overId === RANKED_DROP_ZONE_ID) return [...rankedOrder, activeKey];
    if (overIndex >= 0) {
      const next = [...rankedOrder];
      next.splice(overIndex, 0, activeKey);
      return next;
    }
    return [...rankedOrder, activeKey];
  }

  if (overId === RANKED_DROP_ZONE_ID) {
    const next = rankedOrder.filter((key) => key !== activeKey);
    return [...next, activeKey];
  }

  return null;
}

export function isIssueNewOnWarehouse(issueKey: string, newKeys: Set<string>): boolean {
  return newKeys.has(issueKey.toUpperCase());
}
