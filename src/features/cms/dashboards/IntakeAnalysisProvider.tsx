import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { buildAnalysisFacts, validateAnalysis } from "./intakeAnalysisFacts";
import type { IntakeAnalysis } from "./intakeAnalysisFacts";
import type { IntakeSnapshot } from "./intakeTypes";

export type AnalysisLoader = (snapshot: IntakeSnapshot, signal: AbortSignal) => Promise<IntakeAnalysis>;
export const fetchIntakeAnalysis: AnalysisLoader = async (snapshot, signal) => {
  const response = await fetch(`/__prototype/intake?days=${snapshot.days}&analysis=1`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Analysis unavailable");
  return response.json() as Promise<IntakeAnalysis>;
};
const AnalysisContext = createContext<{ analysis: IntakeAnalysis | null; error: boolean; retry: () => void }>({ analysis: null, error: false, retry: () => undefined });
export const useIntakeAnalysis = () => useContext(AnalysisContext);

export function IntakeAnalysisProvider({ snapshot, load = fetchIntakeAnalysis, children }: {
  snapshot: IntakeSnapshot; load?: AnalysisLoader; children: ReactNode;
}) {
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(null);
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setAnalysis(null); setError(false);
    load(snapshot, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      if (value.snapshot_at !== snapshot.generated_at || value.days !== snapshot.days) throw new Error("Stale analysis");
      value.charts = validateAnalysis(value.charts, buildAnalysisFacts(snapshot));
      setAnalysis(value);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [snapshot, load, attempt]);
  return <AnalysisContext.Provider value={{ analysis, error, retry: () => setAttempt(n => n + 1) }}>{children}</AnalysisContext.Provider>;
}
