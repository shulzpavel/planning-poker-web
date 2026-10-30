import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { hintLabels } from "./intakeAnalysisTypes";
import { cmsFetch } from "../api/cmsClient";
import { pollIntakeResponse } from "./intakeTransport";
import type { IntakeAnalysis } from "./intakeAnalysisTypes";
import type { IntakeSnapshot } from "./intakeTypes";

export type AnalysisLoader = (
  snapshot: IntakeSnapshot,
  signal: AbortSignal,
) => Promise<IntakeAnalysis>;
export const fetchIntakeAnalysis: AnalysisLoader = async (snapshot, signal) => {
  return pollIntakeResponse(
    () =>
      cmsFetch<IntakeAnalysis | { status: "pending" }>(
        `/dashboards/intake/analysis?days=${snapshot.days}`,
        { method: "POST", signal, cache: "no-store" },
      ),
    signal,
  );
};
const AnalysisContext = createContext<{
  analysis: IntakeAnalysis | null;
  error: boolean;
  retry: () => void;
}>({ analysis: null, error: false, retry: () => undefined });
export const useIntakeAnalysis = () => useContext(AnalysisContext);

export function IntakeAnalysisProvider({
  snapshot,
  load = fetchIntakeAnalysis,
  children,
}: {
  snapshot: IntakeSnapshot;
  load?: AnalysisLoader;
  children: ReactNode;
}) {
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(null);
  const [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setAnalysis(null);
    setError(false);
    load(snapshot, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        if (
          value.snapshot_at !== snapshot.generated_at ||
          value.days !== snapshot.days
        )
          throw new Error("Stale analysis");
        if (
          !value.charts ||
          !Object.keys(hintLabels).every((kind) => {
            const row = value.charts[kind as keyof typeof hintLabels];
            return (
              row &&
              typeof row.headline === "string" &&
              typeof row.explanation === "string" &&
              Array.isArray(row.keys) &&
              Array.isArray(row.evidence)
            );
          })
        )
          throw new Error("Invalid analysis");
        setAnalysis(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [snapshot.days, snapshot.generated_at, load, attempt]);
  return (
    <AnalysisContext.Provider
      value={{ analysis, error, retry: () => setAttempt((n) => n + 1) }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}
