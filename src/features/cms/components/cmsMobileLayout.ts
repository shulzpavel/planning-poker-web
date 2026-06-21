import { cn } from "../../../design-system/utils";

/** Escapes CmsShell horizontal padding for edge-to-edge mobile blocks. */
export const cmsMobileBleed = "-mx-3 sm:-mx-4 lg:mx-0";

/** Collapsible section shell: flat border-y on mobile, card from lg. */
export const cmsMobileSectionShell = cn(
  cmsMobileBleed,
  "overflow-hidden border-y border-line bg-surface shadow-none",
  "lg:rounded-lg lg:border lg:shadow-card",
);

/** Section summary / static header row. */
export const cmsSectionHeaderPad = "px-3 py-3 sm:px-4 lg:px-5";

/** Default body padding inside collapsible sections. */
export const cmsSectionBody = "space-y-4 p-3 sm:p-4 lg:space-y-5 lg:p-7";

/** Nested Surface / form block inside CMS pages. */
export const cmsMobileSurface = cn(
  cmsMobileBleed,
  "rounded-none border-x-0 p-3 shadow-none",
  "sm:p-4 lg:mx-0 lg:rounded-lg lg:border-x lg:shadow-card",
);

/** Filter bar: full width on mobile, capped from md. */
export const cmsFilterBarShell = cn(
  "w-full max-w-none rounded-none border-y border-line/80 bg-surface/40 p-3 shadow-none",
  cmsMobileBleed,
  "sm:rounded-xl sm:border md:max-w-4xl lg:mx-0",
);

/** Page section header — no artificial width cap on narrow screens. */
export const cmsPageHeaderShell = "flex w-full max-w-none flex-col gap-3 md:max-w-4xl md:flex-row md:items-start md:justify-between";

/** Help / info callout aligned with flat mobile sections. */
export const cmsHelpCalloutShell = cn(
  cmsMobileBleed,
  "w-full max-w-none border-y border-line bg-line2/30 p-3 text-sm text-ink2",
  "sm:rounded-lg sm:border sm:p-4 md:max-w-3xl lg:mx-0",
);
