/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button, DELETE_CONFIRM_DEFAULTS } from "./components";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
});

describe("Button delete confirmation", () => {
  it("opens confirm dialog instead of calling onClick immediately", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button intent="delete" onClick={onClick}>
        Удалить
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Удалить" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(DELETE_CONFIRM_DEFAULTS.title)).toBeTruthy();
    expect(screen.getByText(DELETE_CONFIRM_DEFAULTS.description)).toBeTruthy();
  });

  it("cancel closes dialog without calling onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button intent="delete" onClick={onClick}>
        Удалить
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Удалить" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Отмена" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("confirm calls onClick once and closes dialog", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button intent="delete" onClick={onClick}>
        Удалить
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Удалить" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("respects skipDeleteConfirm", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button intent="delete" skipDeleteConfirm onClick={onClick}>
        Удалить навсегда
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Удалить навсегда" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows custom confirm copy", async () => {
    const user = userEvent.setup();
    render(
      <Button
        intent="delete"
        confirmTitle="Удалить план?"
        confirmDescription="План будет удалён без восстановления."
        onClick={() => undefined}
      >
        Удалить
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Удалить" }));

    expect(screen.getByText("Удалить план?")).toBeTruthy();
    expect(screen.getByText("План будет удалён без восстановления.")).toBeTruthy();
  });
});
