import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FilterBar, FilterResetButton } from "./FilterBar";
import { filterRefreshButtonClass, filterResetButtonClass } from "./cmsFilterLayout";

describe("FilterBar", () => {
  it("renders inline layout with fixed-width action buttons", () => {
    const markup = renderToStaticMarkup(
      <FilterBar onRefresh={() => undefined} onReset={() => undefined}>
        <input aria-label="search" />
      </FilterBar>,
    );

    expect(markup).toContain("max-w-4xl");
    expect(markup).toContain("Обновить");
    expect(markup).toContain("Сбросить");
    expect(markup).toContain(filterResetButtonClass.split(" ")[0]);
    expect(markup).toContain(filterRefreshButtonClass.split(" ")[0]);
  });

  it("keeps reset visible but disabled when resetDisabled is true", () => {
    const markup = renderToStaticMarkup(
      <FilterBar onReset={() => undefined} resetDisabled>
        <input aria-label="search" />
      </FilterBar>,
    );

    expect(markup).toContain("Сбросить");
    expect(markup).toContain("disabled");
  });

  it("exports FilterResetButton with the same sizing as FilterBar reset", () => {
    const markup = renderToStaticMarkup(<FilterResetButton onClick={() => undefined} />);
    expect(markup).toContain("Сбросить");
    expect(markup).toContain(filterResetButtonClass.split(" ")[0]);
  });
});
