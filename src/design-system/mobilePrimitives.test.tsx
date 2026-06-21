import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SheetActionButton, SheetFooterActions } from "./BottomSheet";
import { resolveButtonVariant } from "./components";
import { MobileBottomDock } from "./MobileBottomDock";
import { StickyActionFooter } from "./StickyActionFooter";
import { SubnavBar } from "./SubnavBar";

describe("mobile layout primitives", () => {
  it("renders MobileBottomDock as a labelled toolbar", () => {
    const markup = renderToStaticMarkup(
      <MobileBottomDock aria-label="Действия">
        <button type="button">Сохранить</button>
      </MobileBottomDock>,
    );

    expect(markup).toContain('role="toolbar"');
    expect(markup).toContain('aria-label="Действия"');
    expect(markup).toContain("Сохранить");
  });

  it("renders SubnavBar as a labelled navigation region", () => {
    const markup = renderToStaticMarkup(
      <SubnavBar aria-label="Разделы">
        <a href="#overview">Обзор</a>
      </SubnavBar>,
    );

    expect(markup).toContain('aria-label="Разделы"');
    expect(markup).toContain("Обзор");
  });

  it("renders StickyActionFooter children", () => {
    const markup = renderToStaticMarkup(
      <StickyActionFooter>
        <button type="button">Отмена</button>
        <button type="submit">Сохранить</button>
      </StickyActionFooter>,
    );

    expect(markup).toContain("Отмена");
    expect(markup).toContain("Сохранить");
  });

  it("renders sheet footer actions with semantic button intents", () => {
    const markup = renderToStaticMarkup(
      <SheetFooterActions>
        <SheetActionButton intent="back">Назад</SheetActionButton>
        <SheetActionButton intent="delete">Удалить</SheetActionButton>
      </SheetFooterActions>,
    );

    expect(markup).toContain("Назад");
    expect(markup).toContain("Удалить");
    expect(markup).toContain("text-red");
  });

  it("maps shared button intents to consistent visual variants", () => {
    expect(resolveButtonVariant("add")).toBe("primary");
    expect(resolveButtonVariant("create")).toBe("primary");
    expect(resolveButtonVariant("save")).toBe("primary");
    expect(resolveButtonVariant("delete")).toBe("danger");
    expect(resolveButtonVariant("finish")).toBe("danger");
    expect(resolveButtonVariant("cancel")).toBe("secondary");
    expect(resolveButtonVariant("reset")).toBe("secondary");
    expect(resolveButtonVariant("refresh")).toBe("secondary");
    expect(resolveButtonVariant("edit")).toBe("secondary");
    expect(resolveButtonVariant("more")).toBe("secondary");
  });
});
