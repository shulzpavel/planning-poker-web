import { describe, expect, it } from "vitest";
import {
  cmsFilterBarShell,
  cmsHelpCalloutShell,
  cmsMobileBleed,
  cmsMobileSectionShell,
  cmsMobileSurface,
  cmsPageHeaderShell,
  cmsSectionBody,
  cmsSectionHeaderPad,
} from "./cmsMobileLayout";

describe("cmsMobileLayout", () => {
  it("exports mobile bleed breakout classes", () => {
    expect(cmsMobileBleed).toContain("-mx-3");
    expect(cmsMobileBleed).toContain("lg:mx-0");
  });

  it("keeps section shell flat on mobile and card-like from lg", () => {
    expect(cmsMobileSectionShell).toContain("border-y");
    expect(cmsMobileSectionShell).toContain("shadow-none");
    expect(cmsMobileSectionShell).toContain("lg:rounded-lg");
    expect(cmsMobileSectionShell).toContain("lg:shadow-card");
  });

  it("uses compact section body padding on mobile", () => {
    expect(cmsSectionBody).toContain("p-3");
    expect(cmsSectionBody).toContain("lg:p-7");
  });

  it("removes max-width caps on narrow filter bar and page header", () => {
    expect(cmsFilterBarShell).toContain("max-w-none");
    expect(cmsFilterBarShell).toContain("md:max-w-4xl");
    expect(cmsPageHeaderShell).toContain("max-w-none");
    expect(cmsPageHeaderShell).toContain("md:max-w-4xl");
  });

  it("exports surface and callout shells with bleed", () => {
    expect(cmsMobileSurface).toContain(cmsMobileBleed);
    expect(cmsHelpCalloutShell).toContain(cmsMobileBleed);
  });

  it("exports consistent header padding token", () => {
    expect(cmsSectionHeaderPad).toContain("px-3");
    expect(cmsSectionHeaderPad).toContain("lg:px-5");
  });
});
