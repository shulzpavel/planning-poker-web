import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "./utils";

const BOTTOM_THRESHOLD = 96;
const SHOW_DELAY_MS = 450;

function getViewportMetrics(): { scrollTop: number; height: number } {
  if (typeof window === "undefined") return { scrollTop: 0, height: 0 };
  const viewport = window.visualViewport;
  if (viewport) {
    return {
      scrollTop: viewport.pageTop,
      height: viewport.height,
    };
  }
  return {
    scrollTop: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
    height: window.innerHeight,
  };
}

function canScrollFurther(): boolean {
  if (typeof window === "undefined") return false;
  const { documentElement, body } = document;
  const scrollHeight = Math.max(documentElement.scrollHeight, body.scrollHeight);
  const viewport = getViewportMetrics();
  return scrollHeight - (viewport.scrollTop + viewport.height) > BOTTOM_THRESHOLD;
}

function syncVisualViewportOffset() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const viewport = window.visualViewport;
  const bottomOffset = viewport
    ? Math.max(0, window.innerHeight - (viewport.offsetTop + viewport.height))
    : 0;
  document.documentElement.style.setProperty("--visual-viewport-bottom", `${Math.ceil(bottomOffset)}px`);
}

function pageScrollLocked(): boolean {
  if (typeof window === "undefined") return false;
  const { body, documentElement } = document;
  const bodyOverflow = window.getComputedStyle(body).overflowY;
  const htmlOverflow = window.getComputedStyle(documentElement).overflowY;
  return bodyOverflow === "hidden" || htmlOverflow === "hidden";
}

/**
 * Global scroll affordance shown only when the current page has more content
 * below the fold. Since visible scrollbars are intentionally hidden across
 * browsers, this tiny hint gives users a clear "there is more below" cue
 * without adding layout or stealing clicks.
 */
function isViewportLockedShell(pathname: string): boolean {
  return (
    pathname === "/"
    || /\/cockpit$/.test(pathname)
    || /\/report$/.test(pathname)
    || pathname === "/manage"
    || pathname.startsWith("/manage/")
  );
}

export function ScrollHint() {
  const location = useLocation();
  const viewportLocked = isViewportLockedShell(location.pathname);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    syncVisualViewportOffset();
    if (viewportLocked) {
      setVisible(false);
      return;
    }
    function clearTimer() {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function update({ immediate = false }: { immediate?: boolean } = {}) {
      clearTimer();
      const nextVisible = canScrollFurther() && !pageScrollLocked();
      if (!nextVisible || immediate) {
        setVisible(nextVisible);
        return;
      }
      timerRef.current = window.setTimeout(() => setVisible(canScrollFurther() && !pageScrollLocked()), SHOW_DELAY_MS);
    }

    update({ immediate: true });

    const onScroll = () => {
      syncVisualViewportOffset();
      update({ immediate: true });
    };
    const onResize = () => {
      syncVisualViewportOffset();
      update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    const mutationObserver = new MutationObserver(() => update());
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"],
    });

    return () => {
      clearTimer();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [location.pathname, location.search, viewportLocked]);

  if (viewportLocked) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "scroll-hint-global pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 md:z-40",
        "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line/70 bg-canvas text-[11px] font-semibold text-ink3 shadow-[0_1px_4px_rgba(0,0,0,0.08)] sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1 md:bg-surface md:px-3 md:py-1.5 md:text-xs md:text-ink2">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue/10 text-[11px] leading-none text-blue/75">
          ↓
        </span>
        <span className="hidden sm:inline md:hidden">Ещё ниже</span>
        <span className="hidden md:inline">Прокрутите ниже</span>
      </div>
    </div>
  );
}
