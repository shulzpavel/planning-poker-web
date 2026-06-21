import { useCallback, useEffect, useId, useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, type ButtonIntent } from "./components";
import { findPreferredFocusTarget, useMobileKeyboardInset } from "./mobileKeyboard";
import { ScrollArea } from "./ScrollArea";
import { cn } from "./utils";
import { useBottomSheetDrag } from "./useBottomSheetDrag";

/**
 * Responsive modal primitive: bottom sheet on mobile, centered dialog on desktop.
 *
 * Renders a card pinned to the bottom of the mobile viewport with a grab
 * handle, safe-area-aware padding, focus trap, ESC-to-close, click
 * outside to close and body scroll lock. On `md+` it becomes a centered
 * dialog because desktop users expect modal focus, not a bottom dock.
 *
 * Use for non-confirmation overflow menus (settings, info panels,
 * action lists). For destructive confirms keep using `ConfirmDialog`.
 */
export function BottomSheet({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
  initialFocus = "first",
}: {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  initialFocus?: "first" | "container";
}) {
  const titleId = useId();
  const descriptionId = useId();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const keyboardInset = useMobileKeyboardInset(open);

  const { animateClose, dragHandleProps, handleGrabberClick, sheetMotionStyle } = useBottomSheetDrag({
    open,
    sheetRef,
    backdropRef,
    onClose,
  });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const focusFirst = () => {
      if (initialFocus === "container") {
        sheetRef.current?.focus();
        return;
      }
      const preferred = findPreferredFocusTarget(sheetRef.current);
      preferred?.focus();
      if (preferred) return;
      const focusables = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      (focusables[0] ?? sheetRef.current)?.focus();
    };
    const frame = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        animateClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusables.length === 0) {
        event.preventDefault();
        sheetRef.current?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus();
    };
  }, [animateClose, initialFocus, open]);

  const handleBackdrop = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (event.target === event.currentTarget) animateClose();
  }, [animateClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm motion-safe:animate-fade-up md:items-center md:p-6"
      style={{ "--keyboard-bottom-inset": `${keyboardInset}px` } as CSSProperties}
      role="presentation"
      onMouseDown={handleBackdrop}
      onTouchEnd={handleBackdrop}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        style={sheetMotionStyle}
        className={cn(
          "relative flex w-full flex-col outline-none md:max-w-md",
          "rounded-t-sheet border border-line border-b-0 bg-surface shadow-card md:rounded-sheet md:border-b",
          "motion-safe:md:animate-scale-in",
          "max-h-[calc(100dvh-var(--safe-top)-var(--keyboard-bottom-inset)-0.75rem)] overflow-hidden md:max-h-[min(760px,calc(100dvh-3rem))]",
          className,
        )}
      >
        <div
          className={cn("shrink-0 md:cursor-auto md:touch-auto md:select-auto", dragHandleProps.className)}
          onPointerDown={dragHandleProps.onPointerDown}
        >
          <div className="flex shrink-0 justify-center px-5 pb-1 pt-2 md:hidden">
            <button
              type="button"
              aria-label="Закрыть меню"
              title="Потяните вниз, чтобы закрыть"
              className="group flex h-10 w-full max-w-[9rem] items-center justify-center rounded-full text-ink4 transition-colors hover:bg-line2/70 active:bg-line2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/35"
              onClick={handleGrabberClick}
            >
              <span className="flex flex-col items-center gap-1" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-current transition-colors group-hover:text-ink3" />
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 opacity-80">
                  <path d="M5.5 7.5 10 12l4.5-4.5" />
                </svg>
              </span>
            </button>
          </div>

          {(title || description) ? (
            <div className="px-5 pb-2 pt-2 md:pb-3 md:pt-3">
              {title ? <h2 id={titleId} className="text-base font-bold text-ink">{title}</h2> : null}
              {description ? <p id={descriptionId} className="mt-1 text-base text-ink3 sm:text-sm">{description}</p> : null}
            </div>
          ) : null}
        </div>

        <ScrollArea
          className="min-h-0 flex-1"
          viewportClassName="px-2 pb-2 pt-1"
          hint={null}
        >
          {children}
        </ScrollArea>

        {footer ? (
          <div className="shrink-0 border-t border-line bg-surface px-5 pb-safe-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:pb-5">
            {footer}
          </div>
        ) : (
          <div className="shrink-0 pb-safe-4 md:pb-5" />
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Row item for use inside `<BottomSheet>`. Renders as a 44px-tall
 * touch target with optional leading icon and trailing meta.
 */
export function SheetItem({
  icon,
  label,
  description,
  trailing,
  onClick,
  disabled,
  tone = "default",
  type = "button",
}: {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full min-h-[3.25rem] items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base sm:min-h-12 sm:py-2 sm:text-sm",
        "transition-colors duration-150 hover:bg-line2 focus-visible:bg-line2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30",
        "active:scale-[0.99] motion-reduce:active:scale-100",
        "disabled:pointer-events-none disabled:opacity-50",
        tone === "danger" ? "text-red" : tone === "primary" ? "text-blue" : "text-ink",
      )}
    >
      {icon ? (
        <span className={cn("shrink-0", tone === "danger" ? "text-red" : tone === "primary" ? "text-blue" : "text-ink3")}>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block whitespace-normal break-words font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block whitespace-normal break-words text-sm font-normal text-ink3 sm:text-xs">{description}</span> : null}
      </span>
      {trailing ? <span className="shrink-0 text-ink3">{trailing}</span> : null}
    </button>
  );
}

export function SheetFooterActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}

export function SheetActionButton({
  intent,
  className,
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  intent: ButtonIntent;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  return (
    <Button
      intent={intent}
      size={size}
      className={cn("w-full sm:w-auto", className)}
      {...props}
    />
  );
}
