import { useState, type ReactNode } from "react";
import { Button, Surface, cn } from "../../../design-system";
import { SortableLayoutBlockDragHandle } from "../components/SortableLayoutBlock";
import { cmsMobileSectionShell, cmsSectionBody, cmsSectionHeaderPad } from "../components/cmsMobileLayout";

export function ProductRadarLayoutBlock({
  title,
  subtitle,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  if (!collapsible) {
    return (
      <Surface className={cmsMobileSectionShell}>
        <div className={cmsSectionHeaderPad}>
          <div className="flex items-start gap-2">
            <SortableLayoutBlockDragHandle />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
              {subtitle ? <p className="text-sm text-ink3">{subtitle}</p> : null}
            </div>
          </div>
        </div>
        <div className={cmsSectionBody}>{children}</div>
      </Surface>
    );
  }

  return (
    <Surface className={cmsMobileSectionShell}>
      <div className={cn(cmsSectionHeaderPad, "flex items-start justify-between gap-3")}>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start gap-2">
            <SortableLayoutBlockDragHandle />
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
          </div>
          {subtitle && expanded ? <p className="text-sm text-ink3">{subtitle}</p> : null}
        </div>
        <Button type="button" size="sm" variant={expanded ? "primary" : "secondary"} onClick={() => setExpanded((open) => !open)}>
          {expanded ? "Свернуть" : "Показать"}
        </Button>
      </div>
      {expanded ? <div className={cmsSectionBody}>{children}</div> : null}
    </Surface>
  );
}
