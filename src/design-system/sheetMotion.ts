import { motionTokens } from "./motion";

/** Bottom sheet uses the Tailwind `md` breakpoint — mobile sheet below, dialog above. */
export const SHEET_MOBILE_MEDIA = "(max-width: 767px)";

export const sheetEasing = {
  out: `cubic-bezier(${motionTokens.ease.join(", ")})`,
  emphasized: `cubic-bezier(${motionTokens.emphasized.join(", ")})`,
} as const;

export function sheetDurationMs(seconds: number): number {
  return Math.round(seconds * 1000);
}

export function isSheetMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(SHEET_MOBILE_MEDIA).matches;
}

export function prefersReducedSheetMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Rubber-band when dragging upward past the resting position. */
export function sheetDragOffset(deltaY: number, overscrollCap = 28): number {
  if (deltaY >= 0) return deltaY;
  return -Math.min(overscrollCap, Math.sqrt(Math.abs(deltaY)) * 4);
}

export function sheetCloseThreshold(height: number): number {
  return Math.min(height * 0.28, Math.max(height * 0.18, 72));
}

export function sheetFlingVelocityThreshold(): number {
  return 0.65;
}

export function sheetMoveActivationThreshold(): number {
  return 4;
}

export function shouldCloseSheet(offset: number, velocity: number, height: number): boolean {
  return (
    offset > sheetCloseThreshold(height)
    || (offset > height * 0.08 && velocity > sheetFlingVelocityThreshold())
  );
}

export function sheetEnterDurationMs(): number {
  return sheetDurationMs(motionTokens.slow + 0.06);
}

export function sheetSnapBackDurationMs(): number {
  return sheetDurationMs(motionTokens.slow + 0.2);
}

export function sheetCloseDurationMs(velocityPxPerMs: number): number {
  const base = sheetDurationMs(motionTokens.slow);
  const boost = Math.min(70, velocityPxPerMs * 80);
  return Math.max(sheetDurationMs(motionTokens.base), Math.min(sheetDurationMs(motionTokens.slow + 0.04), base - boost));
}

export function sheetBackdropOpacity(dragOffset: number, sheetHeight: number, peak = 0.6): number {
  if (sheetHeight <= 0) return peak;
  return Math.max(0, peak * (1 - dragOffset / sheetHeight));
}

export type SheetTransformTarget = number | "closed" | "open";

export function sheetTransformValue(target: SheetTransformTarget): string {
  if (target === "closed") return "translate3d(0, 100%, 0)";
  if (target === "open" || target === 0) return "translate3d(0, 0, 0)";
  return `translate3d(0, ${target}px, 0)`;
}
