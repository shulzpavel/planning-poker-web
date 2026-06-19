import type { ScopeLayoutBlockKey } from "./scopeLayoutOrder";

/** Top-level scope sections that stay open in presentation mode. */
export const SCOPE_PRESENTATION_SECTION_CLASS = "scope-presentation-section";

export const SCOPE_PRESENTATION_DESKTOP_QUERY = "(min-width: 1024px)";

/** Blocks shown in desktop presentation mode (settings and raw JQL lists are omitted). */
export const SCOPE_PRESENTATION_BLOCK_KEYS = [
  "topItems",
  "capacity",
  "roleWorkload",
  "planInsights",
  "flowPace",
  "aiSummary",
  "report",
  "priorityQueues",
  "activity",
] as const satisfies readonly ScopeLayoutBlockKey[];

const presentationBlockSet = new Set<string>(SCOPE_PRESENTATION_BLOCK_KEYS);

export function isScopePresentationBlockKey(key: ScopeLayoutBlockKey): boolean {
  return presentationBlockSet.has(key);
}

export function filterScopePresentationOrder(order: ScopeLayoutBlockKey[]): ScopeLayoutBlockKey[] {
  return order.filter((key) => isScopePresentationBlockKey(key));
}

export function scopePresentationGridClass(key: ScopeLayoutBlockKey): string {
  switch (key) {
    case "capacity":
      return "scope-presentation-tile--hero scope-presentation-tile--full";
    case "topItems":
    case "aiSummary":
    case "report":
    case "flowPace":
    case "priorityQueues":
      return "scope-presentation-tile--full";
    default:
      return "scope-presentation-tile--pair";
  }
}

export function isScopePresentationDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(SCOPE_PRESENTATION_DESKTOP_QUERY).matches;
}

/** Collapse nested details on presentation enter; top-level sections stay open. */
export function applyPresentationDetailsState(root: HTMLElement): void {
  root.querySelectorAll("details").forEach((element) => {
    if (!(element instanceof HTMLDetailsElement)) return;
    element.open = element.classList.contains(SCOPE_PRESENTATION_SECTION_CLASS);
  });
}
