import { type ReactNode, useLayoutEffect, useRef } from "react";
import { cn } from "./utils";

type MobileBottomDockProps = {
  children: ReactNode;
  "aria-label": string;
  className?: string;
  contentClassName?: string;
};

let mobileDockOwner = 0;

/**
 * Shared mobile bottom toolbar. It stays in normal page flow as a sticky footer,
 * so content scrolls as one document while primary actions remain thumb-ready.
 */
export function MobileBottomDock({
  children,
  "aria-label": ariaLabel,
  className,
  contentClassName,
}: MobileBottomDockProps) {
  const dockRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const dock = dockRef.current;
    if (!dock) return;

    const dockNode = dock;
    const owner = ++mobileDockOwner;
    const root = document.documentElement;

    function updateDockHeight() {
      if (owner !== mobileDockOwner) return;
      root.style.setProperty("--mobile-dock-height", `${Math.ceil(dockNode.getBoundingClientRect().height)}px`);
    }

    updateDockHeight();
    window.addEventListener("resize", updateDockHeight);

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateDockHeight) : null;
    resizeObserver?.observe(dockNode);

    return () => {
      window.removeEventListener("resize", updateDockHeight);
      resizeObserver?.disconnect();
      if (owner === mobileDockOwner) {
        root.style.removeProperty("--mobile-dock-height");
      }
    };
  }, []);

  return (
    <div
      ref={dockRef}
      className={cn(
        "sticky bottom-0 z-30 border-t border-line bg-surface/95 px-3 pb-safe-4 pt-2 backdrop-blur",
        "max-md:shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden motion-safe:animate-fade-up",
        className,
      )}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <div className={cn("mx-auto flex items-stretch gap-2", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
