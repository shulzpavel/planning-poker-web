import type { ReactNode } from "react";
import { SortableLayoutBlock } from "../components/SortableLayoutBlock";
import type { ProductRadarLayoutBlockKey } from "./productRadarLayoutOrder";

export function SortableProductRadarBlock({
  id,
  canDrag,
  children,
}: {
  id: ProductRadarLayoutBlockKey;
  canDrag: boolean;
  children: ReactNode;
}) {
  return (
    <SortableLayoutBlock id={id} canDrag={canDrag} groupName="radar-sortable">
      {children}
    </SortableLayoutBlock>
  );
}
