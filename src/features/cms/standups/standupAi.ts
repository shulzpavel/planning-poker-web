import type { StandupAnalyzeResult, StandupAnalyzeStartResponse } from "../api/cmsClient";

export function isStandupAnalyzeResult(
  response: StandupAnalyzeStartResponse,
): response is StandupAnalyzeResult {
  return "ai_summary" in response;
}
