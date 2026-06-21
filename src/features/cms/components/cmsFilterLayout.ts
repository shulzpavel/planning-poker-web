import { cn } from "../../../design-system/utils";

/** Shared width slots for CMS list filters — use via {@link filterFieldWidth}. */
export const FILTER_WIDTH = {
  search: "w-full md:max-w-sm",
  medium: "w-full md:max-w-[240px]",
  status: "w-full md:max-w-[200px]",
  role: "w-full md:max-w-[220px]",
  team: "w-full md:max-w-[220px]",
  id: "w-full md:max-w-[160px]",
  date: "w-full md:max-w-[200px]",
  bucket: "w-full md:max-w-[200px]",
} as const;

export type FilterWidthSlot = keyof typeof FILTER_WIDTH;

export function filterFieldWidth(slot: FilterWidthSlot, className?: string) {
  return cn(FILTER_WIDTH[slot], "min-w-0 shrink-0", className);
}

const filterActionButtonBase = "whitespace-nowrap min-h-11 sm:min-h-10 self-stretch min-w-[7.25rem]";

/** Reset / refresh in FilterBar — fixed min-width so the action rail never jumps. */
export const filterResetButtonClass = filterActionButtonBase;
export const filterRefreshButtonClass = filterActionButtonBase;

/** @deprecated use filterResetButtonClass */
export const filterActionButtonClass = filterActionButtonBase;

export const FILTER_RESET_LABEL = "Сбросить";

/** Fixed-width action rail for reset + refresh (prevents layout shift). */
export const filterActionsRailClass =
  "ml-auto flex w-full shrink-0 basis-full items-stretch justify-end gap-2 sm:w-auto sm:basis-auto";
