import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../../design-system";
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
  const sortable = useSortable({ id, disabled: !canDrag });
  const style = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "group/radar-sortable flex items-start gap-0 lg:gap-2",
        sortable.isDragging ? "relative z-30" : "",
      )}
    >
      {canDrag ? (
        <button
          type="button"
          className={cn(
            "scope-no-print mt-3 hidden h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full text-ink4 opacity-0 lg:inline-flex",
            "touch-manipulation transition-[background-color,color,opacity] hover:bg-line2/60 hover:text-ink2 hover:opacity-100 active:cursor-grabbing",
            "focus-visible:opacity-100 group-hover/radar-sortable:opacity-60 group-focus-within/radar-sortable:opacity-100",
            sortable.isDragging ? "opacity-100" : "",
          )}
          aria-label="Переместить блок"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M7 5.5h6M7 10h6M7 14.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
