import type { ReactNode } from "react";
import { Button } from "../../../design-system";
import { cn } from "../../../design-system/utils";
import {
  FILTER_RESET_LABEL,
  filterRefreshButtonClass,
  filterResetButtonClass,
} from "./cmsFilterLayout";
import { cmsFilterBarShell } from "./cmsMobileLayout";
import { compactFilterFields } from "./filterFieldUtils";

export type FilterBarProps = {
  children: ReactNode;
  onRefresh?: () => void;
  onReset?: () => void;
  /** When true, reset stays visible but inactive (avoids action rail jumping). */
  resetDisabled?: boolean;
  resetLabel?: string;
  refreshDisabled?: boolean;
  refreshLoading?: boolean;
  className?: string;
};

function FilterBarActionsSlot({
  onRefresh,
  onReset,
  resetDisabled = false,
  resetLabel = FILTER_RESET_LABEL,
  refreshDisabled,
  refreshLoading,
}: Pick<
  FilterBarProps,
  "onRefresh" | "onReset" | "resetDisabled" | "resetLabel" | "refreshDisabled" | "refreshLoading"
>) {
  if (!onRefresh && !onReset) return null;

  return (
    <>
      {onReset ? (
        <Button
          intent="reset"
          size="sm"
          className={filterResetButtonClass}
          onClick={onReset}
          disabled={resetDisabled}
        >
          {resetLabel}
        </Button>
      ) : null}
      {onRefresh ? (
        <Button
          intent="refresh"
          size="sm"
          className={filterRefreshButtonClass}
          onClick={onRefresh}
          disabled={refreshDisabled}
          loading={refreshLoading}
        >
          Обновить
        </Button>
      ) : null}
    </>
  );
}

/** Shared reset control for FilterBar and EmptyState fallback actions. */
export function FilterResetButton({
  onClick,
  disabled = false,
  label = FILTER_RESET_LABEL,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button intent="reset" size="sm" className={filterResetButtonClass} onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
}

/**
 * CMS list filters: fields on the left (wrap), actions grouped on the right.
 * Children should use `reserveMessageSpace={false}` on TextField/DropdownField
 * (FilterBar injects this automatically for direct field children).
 */
export function FilterBar({
  children,
  onRefresh,
  onReset,
  resetDisabled,
  resetLabel,
  refreshDisabled,
  refreshLoading,
  className,
}: FilterBarProps) {
  const hasActions = Boolean(onRefresh || onReset);

  return (
    <div className={cn(cmsFilterBarShell, className)} data-filter-bar="">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{compactFilterFields(children)}</div>
        {hasActions ? (
          <div className="flex shrink-0 items-center justify-end gap-2 md:justify-start">
            <FilterBarActionsSlot
              onRefresh={onRefresh}
              onReset={onReset}
              resetDisabled={resetDisabled}
              resetLabel={resetLabel}
              refreshDisabled={refreshDisabled}
              refreshLoading={refreshLoading}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
