import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MobileFeatureCard, MobilePageHero } from "./CmsPrimitives";

describe("CMS mobile primitives", () => {
  it("renders MobilePageHero stats on mobile-only shell", () => {
    const markup = renderToStaticMarkup(
      <MobilePageHero
        title="Отчёты месяца"
        description="Capacity и intake по командам."
        stats={[
          { label: "Отчёты", value: 3 },
          { label: "Stop intake", value: 1, tone: "danger" },
        ]}
      />,
    );

    expect(markup).toContain("Отчёты месяца");
    expect(markup).toContain("Stop intake");
    expect(markup).toContain("lg:hidden");
  });

  it("renders MobileFeatureCard title as a button when onActivate is provided", () => {
    const markup = renderToStaticMarkup(
      <MobileFeatureCard
        title="Rip · Март"
        onActivate={() => undefined}
        primaryAction={<button type="button">Открыть</button>}
      />,
    );

    expect(markup).toContain("Rip · Март");
    expect(markup).toContain("<button");
    expect(markup).toContain("Открыть");
  });
});
