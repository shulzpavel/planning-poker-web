import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FilterBar } from "./FilterBar";
import { filterActionButtonClass } from "./cmsFilterLayout";

describe("FilterBar", () => {
  it("renders inline layout with refresh action aligned to filter height", () => {
    const markup = renderToStaticMarkup(
      <FilterBar onRefresh={() => undefined}>
        <input aria-label="search" />
      </FilterBar>,
    );

    expect(markup).toContain("max-w-4xl");
    expect(markup).toContain("Обновить");
    expect(markup).toContain(filterActionButtonClass.split(" ")[0]);
  });

  it("renders grid layout for dense filters", () => {
    const markup = renderToStaticMarkup(
      <FilterBar layout="grid" onReset={() => undefined}>
        <FilterBar.Cell xl={4}>
          <span>action</span>
        </FilterBar.Cell>
      </FilterBar>,
    );

    expect(markup).toContain("xl:grid-cols-12");
    expect(markup).toContain("xl:col-span-4");
    expect(markup).toContain("Сбросить");
  });
});
