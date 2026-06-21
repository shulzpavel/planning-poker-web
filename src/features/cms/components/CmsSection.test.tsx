/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CmsSection } from "./CmsSection";
import { cmsMobileSectionShell, cmsSectionBody } from "./cmsMobileLayout";

describe("CmsSection", () => {
  it("renders collapsible section with mobile-flat shell classes", () => {
    render(
      <CmsSection title="Отчёт" subtitle="Сводка по релизу">
        <p>Body content</p>
      </CmsSection>,
    );

    const details = screen.getByText("Отчёт").closest("details");
    expect(details?.className).toContain("scope-collapsible-card");
    expect(details?.className).toContain("-mx-3");

    const body = screen.getByText("Body content").parentElement;
    expect(body?.className).toContain(cmsSectionBody.split(" ")[0]);
  });
});
