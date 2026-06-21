import type { ReactNode } from "react";
import { Button } from "../../../design-system";
import { cn } from "../../../design-system/utils";
import {
  FILTER_RESET_LABEL,
  filterActionsRailClass,
  filterRefreshButtonClass,
  filterResetButtonClass,
} from "./cmsFilterLayout";

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
  className,
}: Pick<
  FilterBarProps,
  "onRefresh" | "onReset" | "resetDisabled" | "resetLabel" | "refreshDisabled" | "refreshLoading" | "className"
>) {
  if (!onRefresh && !onReset) return null;

  return (
    <div className={cn(filterActionsRailClass, className)}>
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
    </div>
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
  return (
    <div className={cn("flex w-full max-w-4xl flex-wrap items-stretch gap-2", className)}>
      {children}
      <FilterBarActionsSlot
        onRefresh={onRefresh}
        onReset={onReset}
        resetDisabled={resetDisabled}
        resetLabel={resetLabel}
        refreshDisabled={refreshDisabled}
        refreshLoading={refreshLoading}
      />
    </div>
  );
}
