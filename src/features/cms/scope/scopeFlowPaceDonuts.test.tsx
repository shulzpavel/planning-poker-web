import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ScopeFlowPaceChart } from "../api/cmsClient";
import { FlowPaceChartDetail } from "./ScopeFlowPaceDonuts";

function makeStatusTimeChart(itemCount: number): ScopeFlowPaceChart {
  return {
    id: "phase_time",
    title: "Время в статусах",
    subtitle: "test",
    center_value: "3",
    center_label: "статусов",
    segments: [],
    detail_segments: [
      {
        key: "issues",
        label: `Задачи · ${itemCount}`,
        items: Array.from({ length: itemCount }, (_, index) => ({
          issue_key: `FLEX-${index + 1}`,
          summary: `Task ${index + 1}`,
          detail: "In Progress 3.0 дн.",
          metric_value: "3.0 дн.",
        })),
      },
    ],
  };
}

describe("FlowPaceChartDetail pagination", () => {
  it("shows load-more footer when status-time tasks exceed page size", () => {
    const html = renderToStaticMarkup(<FlowPaceChartDetail chart={makeStatusTimeChart(15)} />);
    expect(html).toContain("FLEX-1");
    expect(html).toContain("FLEX-10");
    expect(html).not.toContain("FLEX-11");
    expect(html).toContain("Показать ещё");
    expect(html).toContain("10 из 15");
  });

  it("renders all tasks when count is within page size", () => {
    const html = renderToStaticMarkup(<FlowPaceChartDetail chart={makeStatusTimeChart(5)} />);
    expect(html).toContain("FLEX-5");
    expect(html).not.toContain("Показать ещё");
  });
});
