/** @vitest-environment jsdom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BottomSheet } from "./BottomSheet";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
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
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: window.ResizeObserver,
  });
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  vi.restoreAllMocks();
});

describe("BottomSheet", () => {
  it("locks the page scroll and restores the original position on close", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 320 });
    Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 980 });

    const { rerender } = render(
      <BottomSheet open title="Меню" onClose={() => undefined}>
        <button type="button">Пункт меню</button>
      </BottomSheet>,
    );

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-320px");
    expect(document.body.style.paddingRight).toBe("20px");

    rerender(
      <BottomSheet open={false} title="Меню" onClose={() => undefined}>
        <button type="button">Пункт меню</button>
      </BottomSheet>,
    );

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 320);
  });
});
