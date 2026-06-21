import type { ReactNode } from "react";
import { Button } from "../../../design-system";
import { cn } from "../../../design-system/utils";
import { filterActionButtonClass } from "./cmsFilterLayout";

const XL_COL: Record<number, string> = {
  1: "xl:col-span-1",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
  4: "xl:col-span-4",
  6: "xl:col-span-6",
  12: "xl:col-span-12",
};

const MD_COL: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
};

export type FilterBarProps = {
  children: ReactNode;
  /** Single row (default) or 12-column grid for dense filters (audit journal). */
  layout?: "inline" | "grid";
  onRefresh?: () => void;
  onReset?: () => void;
  resetLabel?: string;
  refreshDisabled?: boolean;
  refreshLoading?: boolean;
  className?: string;
};

function FilterBarActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-stretch gap-2", className)}>
      {children}
    </div>
  );
}

function FilterBarActionsSlot({
  onRefresh,
  onReset,
  resetLabel = "Сбросить",
  refreshDisabled,
  refreshLoading,
  className,
}: Pick<
  FilterBarProps,
  "onRefresh" | "onReset" | "resetLabel" | "refreshDisabled" | "refreshLoading" | "className"
>) {
  if (!onRefresh && !onReset) return null;

  return (
    <FilterBarActions className={className}>
      {onReset ? (
        <Button intent="reset" size="sm" className={filterActionButtonClass} onClick={onReset}>
          {resetLabel}
        </Button>
      ) : null}
      {onRefresh ? (
        <Button
          intent="refresh"
          size="sm"
          className={filterActionButtonClass}
          onClick={onRefresh}
          disabled={refreshDisabled}
          loading={refreshLoading}
        >
          Обновить
        </Button>
      ) : null}
    </FilterBarActions>
  );
}

export function FilterBar({
  children,
  layout = "inline",
  onRefresh,
  onReset,
  resetLabel,
  refreshDisabled,
  refreshLoading,
  className,
}: FilterBarProps) {
  if (layout === "grid") {
    return (
      <div
        className={cn(
          "grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12",
          className,
        )}
      >
        {children}
        <FilterBarActionsSlot
          onRefresh={onRefresh}
          onReset={onReset}
          resetLabel={resetLabel}
          refreshDisabled={refreshDisabled}
          refreshLoading={refreshLoading}
          className="col-span-full justify-stretch sm:justify-end xl:col-span-12"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex w-full max-w-4xl flex-col gap-2 lg:flex-row lg:items-stretch", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        {children}
      </div>
      <FilterBarActionsSlot
        onRefresh={onRefresh}
        onReset={onReset}
        resetLabel={resetLabel}
        refreshDisabled={refreshDisabled}
        refreshLoading={refreshLoading}
        className="lg:ml-auto"
      />
    </div>
  );
}

FilterBar.Cell = function FilterBarCell({
  children,
  xl,
  md,
  className,
}: {
  children: ReactNode;
  xl?: 1 | 2 | 3 | 4 | 6 | 12;
  md?: 1 | 2;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0",
        md ? MD_COL[md] : undefined,
        xl ? XL_COL[xl] : undefined,
        className,
      )}
    >
      {children}
    </div>
  );
};
