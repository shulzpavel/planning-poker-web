import { Surface } from "../../../design-system";
import { MobileMetricTile } from "../components/CmsPrimitives";
import { friendlyDuration } from "./IntakeReportSections";
import { buildSpeedReport } from "./intakeSpeed";
import type { IntakeSnapshot } from "./intakeTypes";

const number = (value: number) =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
function change(
  current: number | null,
  previous: number | null,
  duration = false,
) {
  if (current === null || previous === null)
    return "Нет завершённых разборов для сравнения";
  if (previous === 0)
    return current === 0
      ? "Без изменений к предыдущему периоду"
      : "В предыдущем периоде — 0";
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 0.5) return "Почти без изменений";
  return duration
    ? `Срок ${delta < 0 ? "сократился" : "вырос"} на ${number(Math.abs(delta))}%`
    : `${delta > 0 ? "+" : "−"}${number(Math.abs(delta))}% к предыдущему периоду`;
}
export function IntakeSpeedSummary({ snapshot }: { snapshot: IntakeSnapshot }) {
  const {
    current: c,
    previous: p,
    previousStart,
    start,
  } = buildSpeedReport(snapshot);
  const shareChange =
    c.withinDay === null || p.withinDay === null
      ? "Нет данных для сравнения"
      : `${c.withinDay > p.withinDay ? "+" : ""}${number(c.withinDay - p.withinDay)} п. п. к предыдущему периоду`;
  const values = [
    {
      label: "Обычный срок разбора",
      value: friendlyDuration(c.median),
      hint: "Медиана: половина запросов — за это время или быстрее",
      delta: change(c.median, p.median, true),
      before: `Было ${friendlyDuration(p.median)}`,
    },
    {
      label: "Средний срок разбора",
      value: friendlyDuration(c.mean),
      hint: "Учитывает влияние долгих разборов",
      delta: change(c.mean, p.mean, true),
      before: `Было ${friendlyDuration(p.mean)}`,
    },
    {
      label: "Первое решение за сутки",
      value: c.withinDay === null ? "—" : `${number(c.withinDay)}%`,
      hint: "Доля среди завершённых первых разборов",
      delta: shareChange,
      before:
        p.withinDay === null
          ? "Ранее нет завершений"
          : `Было ${number(p.withinDay)}%`,
    },
    {
      label: "Новых запросов в сутки",
      value: number(c.arrivalsPerDay),
      hint: "Средний входящий поток за выбранный период",
      delta: change(c.arrivalsPerDay, p.arrivalsPerDay),
      before: `Было ${number(p.arrivalsPerDay)}`,
    },
  ];
  const date = (value: number) =>
    new Date(value).toLocaleDateString("ru-RU", {
      timeZone: snapshot.source.timezone,
    });
  return (
    <div className="space-y-3">
      <Surface
        as="section"
        aria-label="Скорость и динамика за период"
        className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-4"
      >
        {values.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 flex-col rounded-lg bg-line2/30"
          >
            <MobileMetricTile
              label={item.label}
              value={item.value}
              hint={item.hint}
              className="intake-metric-tile flex-1"
            />
            <div className="space-y-1 border-t border-line px-4 py-3 text-xs leading-5">
              <p className="font-semibold text-ink">{item.delta}</p>
              <p className="text-ink3">{item.before}</p>
            </div>
          </div>
        ))}
      </Surface>
      <p className="text-xs leading-6 text-ink3">
        Сравнение с предыдущим отрезком той же длительности:{" "}
        {date(previousStart)} — {date(start - 1)}. Сроки рассчитаны по{" "}
        <strong>{c.count} завершённым первым разборам</strong>; открытые запросы
        в них не входят. Новых запросов за период —{" "}
        <strong>{snapshot.report.received}</strong>, повторный разбор —{" "}
        <strong>{snapshot.report.returned}</strong>.
      </p>
    </div>
  );
}
