import { cn } from "../../../design-system/utils";

/** Shared width slots for CMS list filters — use via {@link filterFieldWidth}. */
export const FILTER_WIDTH = {
  search: "w-full md:max-w-sm",
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

/** Toolbar refresh/reset buttons — match TextField / DropdownField height. */
export const filterActionButtonClass = "whitespace-nowrap min-h-11 sm:min-h-10 self-stretch";
