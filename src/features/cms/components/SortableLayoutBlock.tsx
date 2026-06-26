import { createContext, useContext, type ReactNode } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../../design-system";

type SortableLayoutBlockContextValue = {
  canDrag: boolean;
  isDragging: boolean;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  groupName: string;
};

const SortableLayoutBlockContext = createContext<SortableLayoutBlockContextValue | null>(null);

export function SortableLayoutBlockDragHandle({
  label = "Переместить блок",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const ctx = useContext(SortableLayoutBlockContext);
  if (!ctx?.canDrag) return null;

  return (
    <button
      type="button"
      className={cn(
        "scope-no-print inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full text-ink4",
        "touch-manipulation transition-[background-color,color,opacity] hover:bg-line2/60 hover:text-ink2 hover:opacity-100 active:cursor-grabbing",
        "opacity-0 focus-visible:opacity-100 lg:opacity-0",
        `group-hover/${ctx.groupName}:opacity-60 group-focus-within/${ctx.groupName}:opacity-100`,
        ctx.isDragging ? "opacity-100" : "",
        className,
      )}
      aria-label={label}
      {...ctx.attributes}
      {...(ctx.listeners ?? {})}
    >
      <SortableDragHandleIcon />
    </button>
  );
}

export function SortableDragHandleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn("h-4 w-4", className)} aria-hidden="true">
      <path d="M7 5.5h6M7 10h6M7 14.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SortableLayoutBlock({
  id,
  canDrag,
  groupName = "layout-sortable",
  children,
}: {
  id: string;
  canDrag: boolean;
  groupName?: string;
  children: ReactNode;
}) {
  const sortable = useSortable({ id, disabled: !canDrag });
  const style = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <SortableLayoutBlockContext.Provider
      value={{
        canDrag,
        isDragging: sortable.isDragging,
        attributes: sortable.attributes,
        listeners: sortable.listeners,
        groupName,
      }}
    >
      <div
        ref={sortable.setNodeRef}
        style={style}
        className={cn(`group/${groupName} w-full min-w-0`, sortable.isDragging ? "relative z-30" : "")}
      >
        {children}
      </div>
    </SortableLayoutBlockContext.Provider>
  );
}
