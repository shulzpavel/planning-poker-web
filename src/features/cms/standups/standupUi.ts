import { cn } from "../../../design-system/utils";
import { filterFieldProps, filterResetButtonClass } from "../components/cmsFilterLayout";

/** Compact CMS fields — no reserved hint/error row under the control. */
export const standupCompactField = filterFieldProps;

/**
 * Fixed toolbar control height (h-11 / sm:h-10).
 * Design-system fields default to min-height + py-2.5, which grows unevenly
 * when pickers add a chevron — use these classes to lock row height.
 */
export const standupControlHeightClass = "h-11 min-h-0 max-h-11 sm:h-10 sm:max-h-10";

export const standupFieldInputClass = cn(standupControlHeightClass, "py-2 leading-none");

/** Auto-height task field — min one control row, grows with content. */
export const standupAdaptiveInputClass = cn(
  "min-h-11 w-full resize-none overflow-hidden rounded-lg border border-line bg-surface px-3 py-2.5",
  "text-sm text-ink shadow-none outline-none sm:min-h-10",
  "transition-[border-color,box-shadow] duration-150",
  "placeholder:text-ink4 focus:border-blue focus:ring-2 focus:ring-blue/20",
  "leading-snug break-words",
);

export const standupFieldTriggerClass = cn(standupControlHeightClass, "py-0");

export const standupFieldChevronClass = "h-6 w-6";

/**
 * Standup toolbar buttons — lock height over design-system `Button size="sm"`
 * (sm uses min-h-11 / sm:min-h-9, which drifts from h-11 / sm:h-10 fields).
 */
export const standupRowActionButtonClass = cn(
  filterResetButtonClass,
  standupControlHeightClass,
  "!min-h-0 shrink-0 px-3.5 text-sm sm:px-3",
);

/** Section header actions («Добавить») — same height as row controls. */
export const standupHeaderActionButtonClass = standupRowActionButtonClass;

export const standupCommentInputClass = cn(
  standupControlHeightClass,
  "w-full flex-1 resize-none overflow-y-auto rounded-lg border border-line bg-surface px-3 py-2",
  "text-sm text-ink shadow-none outline-none",
  "transition-[border-color,box-shadow] duration-150",
  "placeholder:text-ink4 focus:border-blue focus:ring-2 focus:ring-blue/20",
  "leading-snug",
);

/** Vertical rhythm between task cards in a track. */
export const standupTaskListClass = "space-y-4";

export function standupTaskCardClass(variant: "default" | "blocker" = "default") {
  return cn(
    "rounded-xl border border-line border-l-4 bg-surface p-3 shadow-card sm:p-4",
    variant === "blocker" ? "border-l-red/50" : "border-l-blue/40",
  );
}

export const standupTaskIndexBadgeClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/10 text-sm font-bold tabular-nums text-blue";

/** Groups Jira / срок / статус — one visual block instead of three labeled rows. */
export const standupTaskMetaPanelClass =
  "rounded-lg border border-line/70 bg-line2/25 px-3 py-2.5 sm:px-3.5 sm:py-3";

export const standupTaskMetaGridClass =
  "grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3";

export const standupTaskCardFooterClass = "border-t border-line/80 pt-3";

export const standupTaskGridClass =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.85fr)_9.5rem_8.5rem_auto] lg:items-start";

export const standupRosterGridClass =
  "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_7rem_auto] sm:items-start";
