import { describe, expect, it } from "vitest";
import { isStandupAnalyzeResult } from "./standupAi";

describe("isStandupAnalyzeResult", () => {
  it("detects immediate analyze response", () => {
    expect(
      isStandupAnalyzeResult({
        ai_summary: { summary: "ok", changed: [], unchanged: [], watch: [], done: [], in_progress: [], blockers: [], risks: [], focus: [] },
      }),
    ).toBe(true);
  });

  it("detects async job response", () => {
    expect(isStandupAnalyzeResult({ job_id: "job-1", status: "queued", phase: "queued" })).toBe(false);
  });
});
