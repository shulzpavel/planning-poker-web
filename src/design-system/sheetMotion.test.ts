import { describe, expect, it } from "vitest";
import {
  sheetBackdropOpacity,
  sheetCloseDurationMs,
  sheetDragOffset,
  sheetTransformValue,
  shouldCloseSheet,
} from "./sheetMotion";

describe("sheetMotion", () => {
  it("applies rubber-band resistance when dragging upward", () => {
    expect(sheetDragOffset(40)).toBe(40);
    expect(sheetDragOffset(-16)).toBeLessThan(0);
    expect(sheetDragOffset(-400)).toBe(-28);
  });

  it("uses percentage transform for fully closed sheets", () => {
    expect(sheetTransformValue("closed")).toBe("translate3d(0, 100%, 0)");
    expect(sheetTransformValue("open")).toBe("translate3d(0, 0, 0)");
    expect(sheetTransformValue(24)).toBe("translate3d(0, 24px, 0)");
  });

  it("closes on distance or fling thresholds relative to sheet height", () => {
    expect(shouldCloseSheet(200, 0.1, 480)).toBe(true);
    expect(shouldCloseSheet(20, 0.1, 480)).toBe(false);
    expect(shouldCloseSheet(50, 0.9, 480)).toBe(true);
  });

  it("dims backdrop proportionally while dragging", () => {
    expect(sheetBackdropOpacity(0, 400)).toBeCloseTo(0.6);
    expect(sheetBackdropOpacity(200, 400)).toBeCloseTo(0.3);
    expect(sheetBackdropOpacity(400, 400)).toBeCloseTo(0);
  });

  it("shortens close animation for faster flings", () => {
    expect(sheetCloseDurationMs(0)).toBeGreaterThan(sheetCloseDurationMs(2));
  });
});
