import { Badge, BottomSheet, Button, Surface } from "../../../design-system";
import { LoadMoreFooter, MobileMetricTile } from "../components/CmsPrimitives";
import { useListDisplayWindow } from "../scope/scopeListPaging";
import { IntakeAiHint } from "./IntakeAiHint";
import { ChartPanel } from "./IntakePanels";
import { QueueChart } from "./IntakeCharts";
import { ReportBars, ReportDonut, WeeklyChart } from "./IntakeReportCharts";
import type { IntakeBucket, IntakeIssue, IntakeSnapshot } from "./intakeTypes";

export interface RequestSelection {
  title: string;
  rows: IntakeIssue[];
}
type SelectGroup = (title: string, keys: string[]) => void;
export function friendlyDuration(days: number | null) {
  if (days === null) return "—";
  if (days < 1 / 24) return "Меньше часа";
  if (days < 1)
    return `${(days * 24).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ч.`;
  return `${days.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} дн.`;
}
export function MonthlyCharts({
  snapshot,
  onGroup,
}: {
  snapshot: IntakeSnapshot;
  onGroup: SelectGroup;
}) {
  const r = snapshot.report,
    waiting = r.outcomes.find((x) => x.id === "waiting")?.count || 0;
  const finished = r.resolution_bands
    .filter((x) => x.id !== "old")
    .reduce((n, x) => n + x.count, 0);
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          hint={
            <IntakeAiHint
              snapshot={snapshot}
              kind="outcomes"
              onGroup={onGroup}
            />
          }
          title="Результат разбора новых запросов"
          subtitle={`Что произошло с запросами, которые впервые пришли за эти ${snapshot.days} дней. Показано их состояние на дату обновления.`}
          explanation={
            <>
              Поступило <strong>{r.received}</strong>. Из них{" "}
              <strong>{waiting} ещё без решения</strong>. Выберите результат
              рядом с диаграммой, чтобы открыть список запросов.
            </>
          }
        >
          <ReportDonut
            title="Что стало с новыми запросами"
            groups={r.outcomes}
            center="новых запросов"
            onSelect={(g) => onGroup(g.label, g.keys)}
          />
        </ChartPanel>
        <ChartPanel
          hint={
            <IntakeAiHint
              snapshot={snapshot}
              kind="duration"
              onGroup={onGroup}
            />
          }
          title="Сколько занимает первое решение"
          subtitle="Время от поступления запроса до решения: передать дальше, отложить или отклонить. Учитываем решения, принятые за выбранный период."
          explanation={
            r.decided ? (
              <>
                <strong>
                  {finished} из {r.decided}
                </strong>{" "}
                запросов получили решение <strong>за неделю или быстрее</strong>
                . Запросы, которые ещё ждут, сюда не входят.
              </>
            ) : (
              "За этот период ещё нет первых решений. Когда они появятся, здесь будет виден срок разбора."
            )
          }
        >
          <ReportBars
            groups={r.resolution_bands}
            onSelect={(g) => onGroup(g.label, g.keys)}
          />
        </ChartPanel>
      </div>
      <ChartPanel
        hint={
          <IntakeAiHint snapshot={snapshot} kind="sources" onGroup={onGroup} />
        }
        title="Откуда приходят инициативы"
        subtitle={`Кто инициировал новые запросы за выбранные ${snapshot.days} дней. Для каждого источника — количество и доля от всех поступивших инициатив.`}
        explanation={
          <>
            Всего новых инициатив: <strong>{r.received}</strong>. Источник берём
            из поля <strong>«Источник инициативы»</strong> в Jira на дату
            обновления. Если поле не заполнено, показываем{" "}
            <strong>«Не указан»</strong>.
          </>
        }
      >
        <ReportBars
          label="Новые инициативы по источнику"
          emptyText="За этот период новые инициативы не поступали."
          groups={r.sources}
          onSelect={(g) => onGroup(`Источник инициативы: ${g.label}`, g.keys)}
        />
      </ChartPanel>
      <ChartPanel
        hint={
          <IntakeAiHint snapshot={snapshot} kind="flow" onGroup={onGroup} />
        }
        title="Новые запросы и принятые решения"
        subtitle="Сравнение по неделям: сколько запросов поступило впервые и по скольким мы приняли первое решение."
        explanation={
          <>
            За <strong>{snapshot.days} дней</strong>: новых запросов —{" "}
            <strong>{r.received}</strong>, первых решений —{" "}
            <strong>{r.decided}</strong>. Решения могут относиться и к более
            старым запросам. Повторный разбор считаем отдельно.
          </>
        }
      >
        <WeeklyChart report={r} onSelect={onGroup} />
      </ChartPanel>
      <ChartPanel
        hint={
          <IntakeAiHint snapshot={snapshot} kind="queue" onGroup={onGroup} />
        }
        title="Как меняется очередь запросов"
        subtitle="Сколько запросов оставалось без решения в конце каждого дня. Линия растёт — ожидающих становится больше; снижается — очередь сокращается."
        explanation={
          <>
            В начале периода ожидали <strong>{r.queue_start}</strong>, на дату
            обновления — <strong>{r.queue_end}</strong>.{" "}
            <strong>
              {r.queue_end > r.queue_start
                ? `Очередь выросла на ${r.queue_end - r.queue_start}.`
                : r.queue_end < r.queue_start
                  ? `Очередь сократилась на ${r.queue_start - r.queue_end}.`
                  : "Размер очереди не изменился."}
            </strong>{" "}
            Учитываем и запросы, вернувшиеся на разбор.
          </>
        }
      >
        <QueueChart snapshot={snapshot} />
      </ChartPanel>
    </>
  );
}
export function CurrentRequests({
  snapshot,
  onSelect,
  onSelection,
}: {
  snapshot: IntakeSnapshot;
  onSelect: (row: IntakeIssue) => void;
  onSelection: (value: RequestSelection) => void;
}) {
  const r = snapshot.report,
    open = snapshot.aging;
  const onGroup: SelectGroup = (title, keys) =>
    onSelection({ title, rows: open.filter((row) => keys.includes(row.key)) });
  const pick = (group: IntakeBucket) =>
    onSelection({
      title: group.label,
      rows: open.filter((row) => group.keys.includes(row.key)),
    });
  return (
    <section
      className="space-y-6 border-t border-line pt-8 sm:pt-10"
      aria-label="Текущие запросы"
    >
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          Запросы, которые ждут решения
        </h2>
        <p className="intake-subtitle max-w-3xl text-sm leading-7 text-ink3">
          Вся открытая очередь <strong>на дату обновления</strong>, включая
          старые запросы. Выбор периода выше{" "}
          <strong>не меняет этот блок</strong>.
        </p>
      </div>
      <Surface className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-4">
        {[
          { label: "Ожидают решения", value: r.queue_end },
          { label: "Нужны уточнения", value: r.needs_information },
          { label: "Ждут больше 7 дней", value: r.older_week },
          { label: "Нет ответственного", value: r.unassigned },
        ].map((item) => (
          <MobileMetricTile
            key={item.label}
            {...item}
            className="intake-metric-tile"
            tone={
              item.label === "Ждут больше 7 дней" && r.older_week > 0
                ? "warning"
                : "neutral"
            }
          />
        ))}
      </Surface>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          hint={
            <IntakeAiHint snapshot={snapshot} kind="aging" onGroup={onGroup} />
          }
          title="Как долго ждут открытые запросы"
          subtitle="Срок ожидания для всей очереди. Больше недели — повод обратить внимание; согласованный норматив пока не задан."
          explanation={
            <>
              Уже <strong>больше недели</strong> ждут{" "}
              <strong>
                {r.older_week} из {r.queue_end}
              </strong>{" "}
              запросов. Время, пока мы ждём уточнений, тоже входит в этот срок.
            </>
          }
        >
          <ReportDonut
            title="Срок ожидания открытых запросов"
            groups={r.current_age}
            center="ждут решения"
            onSelect={pick}
          />
        </ChartPanel>
        <ChartPanel
          hint={
            <IntakeAiHint snapshot={snapshot} kind="oldest" onGroup={onGroup} />
          }
          title="Дольше всего без решения"
          subtitle="Сначала — запросы с самым долгим ожиданием. Выберите запрос, чтобы увидеть его статус, ответственного и дату поступления."
          explanation={
            <>
              Ожидают уточнений: <strong>{r.needs_information}</strong>. Без
              назначенного ответственного: <strong>{r.unassigned}</strong>.
            </>
          }
        >
          <div className="divide-y divide-line">
            {open.slice(0, 5).map((row) => (
              <button
                key={row.key}
                onClick={() => onSelect(row)}
                aria-label={`${row.key}: ${row.summary}`}
                className="flex w-full items-start justify-between gap-4 rounded-md py-4 text-left hover:bg-line2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              >
                <span className="min-w-0">
                  <span className="text-xs font-semibold text-blue">
                    {row.key}
                  </span>
                  <span className="mt-2 block text-sm font-medium leading-relaxed text-ink">
                    {row.summary}
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-ink3">
                    {row.assignee || "Ответственный не назначен"}
                  </span>
                </span>
                <Badge
                  tone={
                    row.age_days !== null && row.age_days > 7
                      ? "warning"
                      : "neutral"
                  }
                >
                  {friendlyDuration(row.age_days)}
                </Badge>
              </button>
            ))}
          </div>
          {open.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() =>
                onSelection({ title: "Все ожидающие запросы", rows: open })
              }
            >
              Показать все {open.length}
            </Button>
          )}
          {!open.length && (
            <p className="py-8 text-center text-sm text-ink3">
              Сейчас нет запросов, ожидающих решения.
            </p>
          )}
        </ChartPanel>
      </div>
    </section>
  );
}
export function RequestList({
  selection,
  onClose,
  onSelect,
}: {
  selection: RequestSelection | null;
  onClose: () => void;
  onSelect: (row: IntakeIssue) => void;
}) {
  const { visibleItems, hasMore, loadMore, loadedCount, total } =
    useListDisplayWindow(selection?.rows || []);
  return (
    <BottomSheet
      open={selection !== null}
      onClose={onClose}
      title={selection?.title}
      description="Нажмите на запрос, чтобы проверить детали."
      footer={
        <Button intent="cancel" onClick={onClose}>
          Закрыть список
        </Button>
      }
    >
      <div className="divide-y divide-line">
        {visibleItems.map((row) => (
          <button
            key={row.key}
            onClick={() => onSelect(row)}
            className="block w-full rounded-md p-3 text-left hover:bg-line2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          >
            <span className="text-xs font-semibold text-blue">{row.key}</span>
            <span className="mt-1 block text-sm text-ink">{row.summary}</span>
            <span className="mt-1 block text-xs text-ink3">{row.status}</span>
          </button>
        ))}
      </div>
      <LoadMoreFooter
        loading={false}
        hasMore={hasMore}
        loadedCount={loadedCount}
        total={total}
        onMore={loadMore}
        itemNoun="запросов"
        variant="compact"
      />
    </BottomSheet>
  );
}
