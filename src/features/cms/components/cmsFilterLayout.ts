import { cn } from "../../../design-system/utils";

/** Shared width slots for CMS list filters — use via {@link filterFieldWidth}. */
export const FILTER_WIDTH = {
  search: "w-full sm:w-auto sm:min-w-[12rem] sm:max-w-xs",
  medium: "w-full sm:w-auto sm:min-w-[10rem] sm:max-w-[240px]",
  status: "w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[200px]",
  role: "w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[220px]",
  team: "w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[220px]",
  id: "w-full sm:w-auto sm:min-w-[7rem] sm:max-w-[160px]",
  date: "w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[200px]",
  bucket: "w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[200px]",
} as const;

export type FilterWidthSlot = keyof typeof FILTER_WIDTH;

export function filterFieldWidth(slot: FilterWidthSlot, className?: string) {
  return cn(FILTER_WIDTH[slot], "min-w-0 shrink-0", className);
}

/** Match TextField / DropdownField control height — never stretch with field wrappers. */
export const filterResetButtonClass =
  "h-11 min-h-0 w-auto min-w-[6.5rem] shrink-0 whitespace-nowrap px-3.5 sm:h-10 sm:min-h-0 sm:px-3";

export const filterRefreshButtonClass = filterResetButtonClass;

/** @deprecated use filterResetButtonClass */
export const filterActionButtonClass = filterResetButtonClass;

export const FILTER_RESET_LABEL = "Сбросить";

/** Compact toolbar fields — no reserved hint/error row under the control. */
export const filterFieldProps = {
  reserveMessageSpace: false as const,
};
