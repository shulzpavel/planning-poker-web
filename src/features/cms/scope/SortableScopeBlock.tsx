import type { ReactNode } from "react";
import { SortableLayoutBlock } from "../components/SortableLayoutBlock";
import type { ScopeLayoutBlockKey } from "./scopeLayoutOrder";

export function SortableScopeBlock({
  id,
  canDrag,
  children,
}: {
  id: ScopeLayoutBlockKey;
  canDrag: boolean;
  children: ReactNode;
}) {
  return (
    <SortableLayoutBlock id={id} canDrag={canDrag} groupName="scope-sortable">
      {children}
    </SortableLayoutBlock>
  );
}
