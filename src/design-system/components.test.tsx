import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, DELETE_CONFIRM_DEFAULTS, requiresDeleteConfirm, resolveButtonVariant, type ButtonIntent } from "./components";

const intentExpectations: Array<[ButtonIntent, string]> = [
  ["open", "primary"],
  ["create", "primary"],
  ["add", "primary"],
  ["save", "primary"],
  ["apply", "primary"],
  ["primary", "primary"],
  ["success", "success"],
  ["back", "secondary"],
  ["cancel", "secondary"],
  ["neutral", "secondary"],
  ["refresh", "secondary"],
  ["reset", "secondary"],
  ["edit", "secondary"],
  ["more", "secondary"],
  ["danger", "danger"],
  ["delete", "danger"],
  ["finish", "danger"],
];

describe("Button intents", () => {
  it.each(intentExpectations)("maps %s to %s variant", (intent, variant) => {
    expect(resolveButtonVariant(intent)).toBe(variant);
  });

  it("falls back to secondary when intent is omitted", () => {
    expect(resolveButtonVariant(undefined)).toBe("secondary");
    expect(resolveButtonVariant(undefined, "ghost")).toBe("ghost");
  });

  it("allows explicit variant to override intent on Button", () => {
    const markup = renderToStaticMarkup(<Button variant="ghost" intent="delete">Utility</Button>);
    expect(markup).toContain("border-transparent");
  });

  it("renders primary styling for open/create actions", () => {
    const openMarkup = renderToStaticMarkup(<Button intent="open">Открыть</Button>);
    expect(openMarkup).toContain("bg-blue");
    expect(openMarkup).toContain("Открыть");
  });

  it("renders danger styling for delete actions", () => {
    const deleteMarkup = renderToStaticMarkup(<Button intent="delete">Удалить</Button>);
    expect(deleteMarkup).toContain("text-red");
  });

  it("requires delete confirmation by default for delete intent", () => {
    expect(requiresDeleteConfirm("delete")).toBe(true);
    expect(requiresDeleteConfirm("delete", true)).toBe(false);
    expect(requiresDeleteConfirm("cancel")).toBe(false);
  });

  it("uses Russian defaults for built-in delete confirmation copy", () => {
    expect(DELETE_CONFIRM_DEFAULTS.title).toBe("Точно удалить?");
    expect(DELETE_CONFIRM_DEFAULTS.confirmLabel).toBe("Удалить");
  });
});
