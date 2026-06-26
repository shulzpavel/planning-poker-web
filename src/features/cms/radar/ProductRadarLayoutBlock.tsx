import { useState, type ReactNode } from "react";
import { Button, Surface, cn } from "../../../design-system";
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
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="text-sm text-ink3">{subtitle}</p> : null}
        </div>
        <div className={cmsSectionBody}>{children}</div>
      </Surface>
    );
  }

  return (
    <Surface className={cmsMobileSectionShell}>
      <div className={cn(cmsSectionHeaderPad, "flex items-start justify-between gap-3")}>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
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
