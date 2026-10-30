// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../design-system";
import DiscoveryDashboard from "./DiscoveryDashboard";

afterEach(cleanup);
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
});

const snapshot = {
  days: 30, generated_at: "2026-10-29T15:00:00+01:00", owners: [{ name: "Elena Stepanova", stage_count: 2, backlog_sa_count: 1, status_counts: { "Исследование": 1, "Описание от PO": 1 }, ages_days: [36.3, 8], old_count: 1, load_signal: "attention" }],
  attention: [{ key: "DH-179", summary: "Push", assignee: "Elena Stepanova", status: "Исследование", age_days: 36.3, signal: "old_current_status" }],
  status_stats: [{ status: "Исследование", current: 1, visits: 2, median_days: 6, p85_days: 20, under_hour: 0 }],
  transitions: { rows: [{ from: "Исследование", to: "Описание от PO", count: 1, return: false }], return_count: 0, transition_count: 1, return_rate: 0 },
  stage_sla: { completed_count: 1, average_workdays: 4, p85_workdays: 4, trend: "flat", recent_p85: 4, previous_p85: 4 },
  metrics: { stage_count: 2, backlog_sa_count: 1, attention_count: 1, owner_count: 1, return_count: 0 }, coverage: { complete: 1, total: 1 },
};

describe("DiscoveryDashboard", () => {
  it("shows per-owner statuses, age buckets and attention initiatives", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot }));
    render(<MemoryRouter><ThemeProvider defaultMode="dark"><DiscoveryDashboard /></ThemeProvider></MemoryRouter>);
    await screen.findAllByText("Elena Stepanova");
    expect(screen.getByText("Задачи по исполнителям и статусам")).toBeTruthy();
    expect(screen.getAllByText("Исследование").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Elena Stepanova").length).toBeGreaterThan(0);
    expect(screen.getByText("DH-179")).toBeTruthy();
  });
});
