/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableLayoutBlock, SortableLayoutBlockDragHandle } from "./SortableLayoutBlock";

vi.mock("@dnd-kit/sortable", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/sortable")>();
  return {
    ...actual,
    useSortable: () => ({
      attributes: { "data-testid": "sortable-attrs" },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

function renderSortableBlock(canDrag: boolean) {
  return render(
    <DndContext onDragEnd={() => undefined}>
      <SortableContext items={["block-a"]} strategy={verticalListSortingStrategy}>
        <SortableLayoutBlock id="block-a" canDrag={canDrag} groupName="test-sortable">
          <div className="flex items-start gap-2">
            <SortableLayoutBlockDragHandle />
            <h2>Заголовок блока</h2>
          </div>
        </SortableLayoutBlock>
      </SortableContext>
    </DndContext>,
  );
}

describe("SortableLayoutBlock", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders drag handle next to existing title when dragging is enabled", () => {
    renderSortableBlock(true);
    expect(screen.getByRole("button", { name: "Переместить блок" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Заголовок блока" })).toBeTruthy();
  });

  it("hides drag handle when dragging is disabled", () => {
    renderSortableBlock(false);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
