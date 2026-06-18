import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { cn } from "../../../design-system";
import { SCOPE_PRESENTATION_DESKTOP_QUERY, applyPresentationDetailsState } from "./scopePresentationMode";

const PRESENTATION_CLOSE_MS = 320;

export function presentationCloseDelayMs(): number {
  return PRESENTATION_CLOSE_MS;
}

export function ScopePresentationLayer({
  open,
  closing,
  title,
  subtitle,
  contentRef,
  onClose,
  children,
}: {
  open: boolean;
  closing: boolean;
  title: string;
  subtitle?: ReactNode;
  contentRef?: RefObject<HTMLDivElement>;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia(SCOPE_PRESENTATION_DESKTOP_QUERY);
    const onChange = () => {
      if (!media.matches) {
        onClose();
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [onClose, open]);

  const detailsStateAppliedRef = useRef(false);

  useLayoutEffect(() => {
    if (!open) {
      detailsStateAppliedRef.current = false;
      return;
    }
    if (closing || !contentRef?.current || detailsStateAppliedRef.current) return;
    applyPresentationDetailsState(contentRef.current);
    detailsStateAppliedRef.current = true;
  }, [children, closing, contentRef, open]);

  if (!open && !closing) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "scope-presentation-layer fixed inset-0 z-[220] flex flex-col bg-canvas",
        closing ? "scope-presentation-layer--closing" : "scope-presentation-layer--open",
      )}
      role="presentation"
      aria-hidden={closing}
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="scope-presentation-exit-sticky sticky top-0 z-[230] flex items-center justify-end gap-2 px-3 py-2 sm:px-4 lg:px-6">
          <ScopePresentationExitButton onClick={onClose} />
        </div>

        <div
          ref={contentRef}
          className="scope-report-print-root scope-presentation-stage mx-auto w-full max-w-none px-4 py-5 sm:px-6 lg:px-8 lg:py-7 xl:px-10"
        >
          <div className="scope-presentation-intro mb-5 min-w-0 lg:mb-7">
            <p className="text-lg font-bold text-ink lg:text-xl">{title}</p>
            {subtitle ? <div className="mt-1 text-sm text-ink3">{subtitle}</div> : null}
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ScopePresentationExitIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ScopeChromeIconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink4",
        "touch-manipulation transition-[background-color,color,opacity] hover:bg-line2/60 hover:text-ink2",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ScopePresentationExitButton({ onClick }: { onClick: () => void }) {
  return (
    <ScopeChromeIconButton
      className="bg-canvas/80 backdrop-blur-sm hover:bg-line2/80"
      label="Выйти из режима презентации"
      onClick={onClick}
    >
      <ScopePresentationExitIcon />
    </ScopeChromeIconButton>
  );
}

export function ScopePresentationTile({
  blockKey,
  index,
  className,
  children,
}: {
  blockKey: string;
  index: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-scope-block={blockKey}
      className={cn(
        "scope-presentation-tile",
        blockKey === "capacity" ? "scope-presentation-tile--capacity" : null,
        className,
      )}
      style={
        {
          "--presentation-delay": `${index * 80}ms`,
          "--presentation-stretch-delay": `${index * 45}ms`,
        } as CSSProperties
      }
    >
      <div className="scope-presentation-tile-inner">{children}</div>
    </div>
  );
}

export function ScopePresentationEnterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 16.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7.5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.25 9.25 10 7.5l1.75 1.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScopePresentationEnterButton({
  disabled,
  onClick,
  className,
}: {
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <ScopeChromeIconButton
      className={cn("hidden opacity-80 hover:opacity-100 lg:inline-flex", className)}
      label="Режим презентации"
      disabled={disabled}
      onClick={onClick}
    >
      <ScopePresentationEnterIcon />
    </ScopeChromeIconButton>
  );
}
