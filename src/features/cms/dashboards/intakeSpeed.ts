import type { IntakeSnapshot } from "./intakeTypes";

const DAY = 86400000;
export interface SpeedStats { count: number; median: number | null; mean: number | null; withinDay: number | null; arrivalsPerDay: number }
export interface SpeedWeek { start: string; end: string; median: number | null; mean: number | null; keys: string[]; partial: boolean }
export interface SpeedReport { start: number; end: number; previousStart: number; current: SpeedStats; previous: SpeedStats; weekly: SpeedWeek[] }
const dateFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" });
function summarize(values: number[], arrivals: number, days: number): SpeedStats {
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return { count: values.length, median: values.length ? (sorted[mid] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2 : null,
    mean: values.length ? values.reduce((sum, x) => sum + x, 0) / values.length : null,
    withinDay: values.length ? values.filter(x => x <= 1).length / values.length * 100 : null,
    arrivalsPerDay: days > 0 ? arrivals / days : 0 };
}
export function buildSpeedReport(snapshot: IntakeSnapshot): SpeedReport {
  const start = Date.parse(snapshot.window_start), end = Date.parse(snapshot.generated_at);
  const span = end - start, previousStart = start - span;
  const rows = snapshot.report.requests.map(row => {
    const entered = Date.parse(row.entered_at || ""), left = Date.parse(row.left_at || "");
    return { key: row.key, entered, left, duration: (left - entered) / DAY };
  });
  const completed = rows.filter(x => Number.isFinite(x.duration) && x.duration >= 0);
  const current = completed.filter(x => x.left >= start && x.left < end);
  const previous = completed.filter(x => x.left >= previousStart && x.left < start);
  const weekly = snapshot.report.weekly.map(w => {
    const cohort = current.filter(x => { const date = dateFormatter.format(new Date(x.left)); return date >= w.start && date <= w.end; });
    const stats = summarize(cohort.map(x => x.duration), 0, 1);
    return { start: w.start, end: w.end, median: stats.median, mean: stats.mean, keys: cohort.map(x => x.key),
      partial: Math.round((Date.parse(w.end) - Date.parse(w.start)) / DAY) !== 6 };
  });
  return { start, end, previousStart, current: summarize(current.map(x => x.duration), snapshot.report.received, span / DAY),
    previous: summarize(previous.map(x => x.duration), rows.filter(x => x.entered >= previousStart && x.entered < start).length, span / DAY), weekly };
}
