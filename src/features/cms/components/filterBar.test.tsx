import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextField } from "../../../design-system";
import { FilterBar, FilterResetButton } from "./FilterBar";
import { filterRefreshButtonClass, filterResetButtonClass } from "./cmsFilterLayout";

describe("FilterBar", () => {
  it("renders a grouped toolbar with actions beside fields", () => {
    const markup = renderToStaticMarkup(
      <FilterBar onRefresh={() => undefined} onReset={() => undefined}>
        <TextField aria-label="search" placeholder="Search" />
      </FilterBar>,
    );

    expect(markup).toContain("data-filter-bar");
    expect(markup).toContain("Обновить");
    expect(markup).toContain("Сбросить");
    expect(markup).toContain(filterResetButtonClass.split(" ")[0]);
    expect(markup).toContain(filterRefreshButtonClass.split(" ")[0]);
  });

  it("injects reserveMessageSpace=false into filter fields", () => {
    const markup = renderToStaticMarkup(
      <FilterBar onRefresh={() => undefined}>
        <TextField aria-label="search" placeholder="Search" reserveMessageSpace />
      </FilterBar>,
    );

    expect(markup).not.toContain("min-h-[1rem]");
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
    expect(markup).toContain("sm:h-10");
  });
});
