import { describe, expect, it } from "vitest";
import { DEFAULT_SCOPE_LAYOUT_ORDER } from "./scopeLayoutOrder";
import {
  SCOPE_PRESENTATION_BLOCK_KEYS,
  SCOPE_PRESENTATION_SECTION_CLASS,
  filterScopePresentationOrder,
  isScopePresentationBlockKey,
  scopePresentationGridClass,
} from "./scopePresentationMode";

describe("scopePresentationMode", () => {
  it("filters presentation blocks while preserving order", () => {
    const filtered = filterScopePresentationOrder(DEFAULT_SCOPE_LAYOUT_ORDER);
    expect(filtered).toEqual([...SCOPE_PRESENTATION_BLOCK_KEYS]);
    expect(filtered).not.toContain("settings");
    expect(filtered).not.toContain("snapshotSections");
  });

  it("recognizes presentation block keys", () => {
    expect(isScopePresentationBlockKey("report")).toBe(true);
    expect(isScopePresentationBlockKey("settings")).toBe(false);
  });

  it("assigns grid span classes", () => {
    expect(scopePresentationGridClass("report")).toBe("scope-presentation-tile--full");
    expect(scopePresentationGridClass("capacity")).toBe("scope-presentation-tile--hero scope-presentation-tile--full");
    expect(scopePresentationGridClass("roleWorkload")).toBe("scope-presentation-tile--pair");
  });

  it("defines presentation section marker class", () => {
    expect(SCOPE_PRESENTATION_SECTION_CLASS).toBe("scope-presentation-section");
  });
});
