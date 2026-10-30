import type { IntakeSnapshot } from "./intakeTypes";

export interface SpeedStats {
  count: number;
  median: number | null;
  mean: number | null;
  withinDay: number | null;
  arrivalsPerDay: number;
}
export interface SpeedWeek {
  start: string;
  end: string;
  median: number | null;
  mean: number | null;
  keys: string[];
  partial: boolean;
}
export interface SpeedReport {
  start: number;
  end: number;
  previousStart: number;
  current: SpeedStats;
  previous: SpeedStats;
  weekly: SpeedWeek[];
}
/** Aggregates are calculated by voting-service, not duplicated in the browser. */
export function buildSpeedReport(snapshot: IntakeSnapshot): SpeedReport {
  return snapshot.speed;
}
