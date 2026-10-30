import { ApiError } from "../../../shared/api/http";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  SubnavBar,
  Surface,
} from "../../../design-system";
import { Skeleton } from "../components/CmsPrimitives";
import { cmsMobileSectionShell } from "../components/cmsMobileLayout";
import { IntakeAnalysisProvider } from "./IntakeAnalysisProvider";
import type { AnalysisLoader } from "./IntakeAnalysisProvider";
import { IssueDrawer } from "./IntakePanels";
import {
  CurrentRequests,
  MonthlyCharts,
  RequestList,
} from "./IntakeReportSections";
import type { RequestSelection } from "./IntakeReportSections";
import { IntakeSpeedSummary } from "./IntakeSpeedSummary";
import { IntakeSpeedTrend } from "./IntakeSpeedTrend";
import { fetchIntakeSnapshot } from "./intakeTypes";
import type { IntakeIssue, IntakeSnapshot } from "./intakeTypes";
import "./intakeDashboard.css";

type Loader = (days: number, signal: AbortSignal) => Promise<IntakeSnapshot>;
function useSnapshot(days: number, load: Loader, retry: number) {
  const [snapshot, setSnapshot] = useState<IntakeSnapshot | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setSnapshot(null);
    setError(false);
    const refresh = async () => {
      try {
        const value = await load(days, controller.signal);
        if (controller.signal.aborted) return;
        setSnapshot(value);
        setError(false);
        timer = setTimeout(refresh, value.freshness?.refreshing ? 2000 : 60000);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(true);
          if (
            error instanceof ApiError &&
            [401, 403, 404].includes(error.status)
          ) {
            setSnapshot(null);
            return;
          }
          timer = setTimeout(refresh, 30000);
        }
      }
    };
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [days, load, retry]);
  return { snapshot, error };
}
function StageNavigation({ name }: { name: string }) {
  return (
    <SubnavBar
      aria-label="Стадии процесса"
      className="rounded-lg border border-line"
    >
      <span
        aria-current="page"
        className="border-b-2 border-blue px-3 py-2 text-sm font-semibold text-blue"
      >
        {name}
      </span>
    </SubnavBar>
  );
}
function DashboardHeader({
  days,
  snapshot,
  onDays,
}: {
  days: number;
  snapshot: IntakeSnapshot | null;
  onDays: (days: number) => void;
}) {
  return (
    <Surface className={cmsMobileSectionShell}>
      <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="max-w-3xl space-y-3">
            <Badge tone="info">
              {snapshot?.source.stage_name || "Разбор инициатив"}
            </Badge>
            <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">
              Как мы разбираем продуктовые инициативы
            </h1>
            <p className="intake-subtitle max-w-2xl text-base leading-7 text-ink3">
              Результаты за <strong>{days} дней</strong>: что поступило в
              работу, какие решения приняли и где требуется внимание.
            </p>
          </div>
          <div className="flex shrink-0 gap-2" aria-label="Период">
            {[7, 30, 90].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={days === n ? "primary" : "secondary"}
                aria-pressed={days === n}
                onClick={() => onDays(n)}
              >
                {n} дней
              </Button>
            ))}
          </div>
        </div>
        <p className="max-w-3xl border-t border-line pt-5 text-sm leading-7 text-ink2">
          <strong>
            Инициатива — это запрос на изменение или развитие продукта.
          </strong>{" "}
          На первом этапе уточняем потребность и решаем, что прорабатывать
          дальше, что отложить, а от чего отказаться. Если ждём уточнений,
          запрос остаётся <strong>без решения</strong>.
        </p>
        <p className="text-xs text-ink3">
          {snapshot
            ? `Данные из Jira на ${new Date(snapshot.generated_at).toLocaleString("ru-RU", { timeZone: snapshot.source.timezone })}. Обновляются автоматически.`
            : "Загружаем данные из Jira…"}
        </p>
      </div>
    </Surface>
  );
}
function DashboardContent({
  snapshot,
  onSelect,
  onSelection,
}: {
  snapshot: IntakeSnapshot;
  onSelect: (row: IntakeIssue) => void;
  onSelection: (selection: RequestSelection) => void;
}) {
  const onGroup = (title: string, keys: string[]) =>
    onSelection({
      title,
      rows: snapshot.report.requests.filter((row) => keys.includes(row.key)),
    });
  return (
    <>
      <div className="space-y-2 pt-2">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          Результаты за {snapshot.days} дней
        </h2>
        <p className="intake-subtitle max-w-3xl text-sm leading-relaxed text-ink3">
          Сначала — <strong>сроки разбора и изменение скорости</strong>. Ниже —
          состав потока инициатив и отдельный блок текущей очереди.
        </p>
      </div>
      <IntakeSpeedSummary snapshot={snapshot} />
      <IntakeSpeedTrend snapshot={snapshot} onGroup={onGroup} />
      <div className="space-y-2 pt-3">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          Поток инициатив и результаты разбора
        </h2>
        <p className="intake-subtitle max-w-3xl text-sm leading-7 text-ink3">
          Ниже — количество и источники запросов за период. Результат новых
          инициатив показан <strong>на дату снимка</strong>; это состояние
          когорты, а не средний показатель.
        </p>
      </div>
      <MonthlyCharts snapshot={snapshot} onGroup={onGroup} />
      <CurrentRequests
        snapshot={snapshot}
        onSelect={onSelect}
        onSelection={onSelection}
      />
      <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-xs text-ink3">
        <span>
          Источник: {snapshot.source.label} · {snapshot.coverage.complete} /{" "}
          {snapshot.coverage.total} инициатив с полной историей
        </span>
        <span>Календарное время · {snapshot.source.timezone}</span>
      </footer>
    </>
  );
}
export default function IntakeDashboard({
  loadSnapshot = fetchIntakeSnapshot,
  loadAnalysis,
}: {
  loadSnapshot?: Loader;
  loadAnalysis?: AnalysisLoader;
}) {
  const [params, setParams] = useSearchParams();
  const days = [7, 30, 90].includes(Number(params.get("days")))
    ? Number(params.get("days"))
    : 30;
  const [retry, setRetry] = useState(0),
    [selected, setSelected] = useState<IntakeIssue | null>(null);
  const [selection, setSelection] = useState<RequestSelection | null>(null);
  const { snapshot, error } = useSnapshot(days, loadSnapshot, retry);
  const close = useCallback(() => setSelected(null), []),
    closeList = useCallback(() => setSelection(null), []);
  const select = (row: IntakeIssue) => {
    setSelection(null);
    setSelected(row);
  };
  return (
    <section className="intake-dashboard">
      <div className="space-y-6 sm:space-y-7">
        <DashboardHeader
          days={days}
          snapshot={snapshot}
          onDays={(n) => {
            setSelected(null);
            setSelection(null);
            setParams({ days: String(n) });
          }}
        />
        <StageNavigation
          name={snapshot?.source.stage_name || "Разбор инициатив"}
        />
        {snapshot && snapshot.coverage.complete < snapshot.coverage.total && (
          <Alert tone="warning">
            История загружена частично: {snapshot.coverage.complete} из{" "}
            {snapshot.coverage.total}. Исторические графики предварительные.
          </Alert>
        )}
        {error && snapshot && (
          <Alert tone="warning">
            Нет связи с сервером. Показана последняя успешная версия данных с
            указанной датой.
          </Alert>
        )}
        {snapshot?.freshness.stale && (
          <Alert tone="warning">
            {snapshot.freshness.refreshing
              ? "Обновляем данные Jira. Пока показана последняя успешная версия."
              : "Не удалось обновить Jira. Показана последняя успешная версия с указанной датой."}
          </Alert>
        )}
        {error && !snapshot ? (
          <Alert tone="danger" title="Не удалось загрузить данные дэшборда">
            <p className="mb-3">
              Jira временно недоступна. Обновление повторится автоматически;
              можно попробовать ещё раз сейчас.
            </p>
            <Button
              intent="refresh"
              size="sm"
              onClick={() => setRetry((n) => n + 1)}
            >
              Повторить
            </Button>
          </Alert>
        ) : snapshot ? (
          <IntakeAnalysisProvider
            key={`${snapshot.days}:${snapshot.generated_at}`}
            snapshot={snapshot}
            load={loadAnalysis}
          >
            <DashboardContent
              snapshot={snapshot}
              onSelect={select}
              onSelection={setSelection}
            />
          </IntakeAnalysisProvider>
        ) : (
          <div role="status" aria-label="Загружаем аналитику Jira">
            <Skeleton height="h-64" />
          </div>
        )}
      </div>
      <RequestList
        selection={selection}
        onClose={closeList}
        onSelect={select}
      />
      <IssueDrawer
        row={selected}
        onClose={close}
        timezone={snapshot?.source.timezone}
      />
    </section>
  );
}
