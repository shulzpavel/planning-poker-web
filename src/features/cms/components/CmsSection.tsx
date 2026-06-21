import type { ReactNode } from "react";
import { cn } from "../../../design-system/utils";
import {
  cmsMobileSectionShell,
  cmsSectionBody,
  cmsSectionHeaderPad,
} from "./cmsMobileLayout";

type CmsSectionProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  presentation?: boolean;
  noPrint?: boolean;
};

/**
 * Flat mobile collapsible section — edge-to-edge inside CmsShell, card from lg.
 * Prefer over ad-hoc `<details className="scope-collapsible-card …">`.
 */
export function CmsSection({
  title,
  subtitle,
  trailing,
  children,
  className,
  bodyClassName,
  defaultOpen,
  open,
  onToggle,
  presentation = false,
  noPrint = false,
}: CmsSectionProps) {
  return (
    <details
      className={cn(
        "scope-collapsible-card group",
        cmsMobileSectionShell,
        presentation && "scope-presentation-section",
        noPrint && "scope-no-print",
        className,
      )}
      defaultOpen={defaultOpen}
      open={open}
      onToggle={
        onToggle
          ? (event) => {
              onToggle(event.currentTarget.open);
            }
          : undefined
      }
    >
      <summary
        className={cn(
          "scope-section-header flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none",
          cmsSectionHeaderPad,
        )}
      >
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink">{title}</div>
          {subtitle ? (
            <p className="scope-section-header-subtitle mt-1 text-sm">{subtitle}</p>
          ) : null}
        </div>
        {trailing ?? (
          <span className="scope-print-hide inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-ink">
            <span className="group-open:hidden">Показать</span>
            <span className="hidden group-open:inline">Скрыть</span>
            <span className="scope-section-header-icon inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform group-open:rotate-180">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
              </svg>
            </span>
          </span>
        )}
      </summary>
      <div className={cn(cmsSectionBody, bodyClassName)}>{children}</div>
    </details>
  );
}
