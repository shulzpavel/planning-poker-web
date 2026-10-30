import { ChartPanel } from "./IntakePanels";
import { friendlyDuration } from "./IntakeReportSections";
import { buildSpeedReport } from "./intakeSpeed";
import type { SpeedWeek } from "./intakeSpeed";
import type { IntakeSnapshot } from "./intakeTypes";

const W = 900, H = 240, L = 58, R = 22, T = 28, B = 44;
const short = (date: string) => `${date.slice(8)}.${date.slice(5, 7)}`;
export function IntakeSpeedTrend({ snapshot, onGroup }: { snapshot: IntakeSnapshot; onGroup: (title: string, keys: string[]) => void }) {
  const { weekly } = buildSpeedReport(snapshot);
  const max = Math.max(1 / 24, ...weekly.flatMap(w => [w.median ?? 0, w.mean ?? 0]));
  const unit = max >= 2 ? 1 : 1 / 24;
  const x = (i: number) => L + i / Math.max(1, weekly.length - 1) * (W - L - R);
  const y = (value: number) => H - B - value / max * (H - T - B);
  const path = (key: "median" | "mean") => weekly.map((w, i) => w[key] === null ? "" : `${i === 0 || weekly[i - 1][key] === null ? "M" : "L"}${x(i)},${y(w[key]!)}`).join(" ");
  const open = (week: SpeedWeek) => onGroup(`Завершённый разбор: ${short(week.start)}–${short(week.end)}`, week.keys);
  return <ChartPanel title="Как меняется скорость разбора" subtitle="Каждая точка — запросы, получившие первое решение на этой неделе. Чем ниже линия, тем быстрее разбор."
    explanation={<>Синяя линия — <strong>обычный срок (медиана)</strong>, фиолетовая — <strong>средний срок</strong>. Если среднее заметно выше медианы, часть разборов заняла существенно больше времени. Пустые недели оставляем разрывами; крайние недели могут быть неполными. Нажмите точку, чтобы открыть запросы.</>}>
    {!weekly.some(w => w.keys.length) ? <p className="py-10 text-sm text-ink3">За период нет завершённых первых разборов. Открытые запросы показаны ниже, в текущей очереди.</p> : <figure aria-label="Срок первого решения по неделям" className="intake-figure">
      <div className="overflow-x-auto pb-2"><svg className="min-w-[620px]" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Медиана и средний срок разбора по неделям">
        {[0, .25, .5, .75, 1].map(f => <g key={f}><line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="rgb(var(--c-line))"/><text x={L - 10} y={y(max * f) + 4} textAnchor="end">{(max * f / unit).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}</text></g>)}
        <text x={L} y={14}>{unit === 1 ? "Календарные дни" : "Календарные часы"}</text>
        {(["mean", "median"] as const).map(key => <path key={key} d={path(key)} fill="none" stroke={`rgb(var(--c-${key === "median" ? "blue" : "purple"}))`} strokeWidth={2.5}/>)}
        {weekly.map((week, i) => <g key={week.start}>
          {(["mean", "median"] as const).map(key => week[key] !== null && <g key={key} role="button" tabIndex={0} className="intake-point" aria-label={`${short(week.start)}–${short(week.end)}: ${key === "median" ? "медиана" : "среднее"} ${friendlyDuration(week[key])}, запросов ${week.keys.length}`} onClick={() => open(week)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(week); } }}>
            <circle cx={x(i)} cy={y(week[key]!)} r={10} fill="transparent"/><circle cx={x(i)} cy={y(week[key]!)} r={4} stroke={`rgb(var(--c-${key === "median" ? "blue" : "purple"}))`} strokeWidth={2} fill={week.partial ? "rgb(var(--c-surface))" : `rgb(var(--c-${key === "median" ? "blue" : "purple"}))`}/><title>{short(week.start)}–{short(week.end)}{week.partial ? " · неполная неделя" : ""}: {friendlyDuration(week[key])}, {week.keys.length} запросов</title>
          </g>)}
          <text x={x(i)} y={H - 22} textAnchor="middle">{short(week.start)}{week.partial ? "*" : ""}</text><text x={x(i)} y={H - 7} textAnchor="middle">{week.keys.length ? `n=${week.keys.length}` : "нет решений"}</text>
        </g>)}
      </svg></div><figcaption><span className="intake-dot blue"/>Обычный срок (медиана)<span className="intake-dot teal"/>Средний срок<span>* Неполная неделя · n — число разборов</span></figcaption>
    </figure>}
  </ChartPanel>;
}
