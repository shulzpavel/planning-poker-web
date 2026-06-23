import { AiIntelligenceSurface, Badge } from "../../../design-system";
import type { StandupAiSummary } from "../api/cmsClient";

const SEVERITY_TONE = {
  low: "neutral",
  medium: "warning",
  high: "danger",
} as const;

const SEVERITY_LABEL = {
  low: "низкий",
  medium: "средний",
  high: "высокий",
} as const;

interface StandupAiSummaryViewProps {
  summary: StandupAiSummary;
  loading?: boolean;
  progress?: string | null;
}

export function StandupAiSummaryView({ summary, loading = false, progress }: StandupAiSummaryViewProps) {
  const changed = summary.changed ?? [];
  const unchanged = summary.unchanged ?? [];
  const watch = summary.watch ?? [];

  return (
    <AiIntelligenceSurface className="space-y-5 p-5 sm:p-6" sparkleLabel="AI-дайджест дейлика">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-base font-bold text-ink">AI-анализ дейлика</h3>
          <p className="max-w-3xl text-sm text-ink2">
            Сигналы изменений, застоя и приоритетов для тимлида — не просто пересказ задач.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? <Badge tone="info">генерируется</Badge> : <Badge tone="success">готов</Badge>}
          {summary.telegram_sent_at ? <Badge tone="neutral">отправлен в Telegram</Badge> : null}
        </div>
      </header>

      {loading && progress ? (
        <p className="text-sm text-ink3" role="status" aria-live="polite">
          {progress}
        </p>
      ) : null}

      <section className="rounded-xl border border-line bg-surface px-4 py-4 sm:px-5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink3">Главный вывод</h4>
        <p className="mt-2 text-base leading-relaxed text-ink">{summary.summary}</p>
      </section>

      {changed.length > 0 || unchanged.length > 0 || watch.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-3">
          <SignalCard title="Изменилось" tone="info" items={changed} emptyHint="Явных изменений с прошлого дейлика нет." />
          <SignalCard title="Без изменений" tone="neutral" items={unchanged} emptyHint="Застой не зафиксирован." />
          <SignalCard title="На что смотреть" tone="warning" items={watch} emptyHint="Критичных сигналов нет." />
        </section>
      ) : null}

      {summary.done.length > 0 ? (
        <Block title="Сделано">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink2">
            {summary.done.map((item) => (
              <li key={item} className="break-words [overflow-wrap:anywhere]">
                {item}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {summary.in_progress.length > 0 ? (
        <Block title="В работе">
          <ul className="space-y-2 text-sm text-ink2">
            {summary.in_progress.map((row) => (
              <li
                key={`${row.person}-${row.tasks.join("|")}`}
                className="rounded-lg border border-line bg-surface px-3 py-2"
              >
                <span className="font-medium text-ink">{row.person}</span>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {row.tasks.map((task) => (
                    <li key={task} className="break-words [overflow-wrap:anywhere]">
                      {task}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {summary.blockers.length > 0 ? (
        <Block title="Блокеры">
          <ul className="space-y-2 text-sm">
            {summary.blockers.map((blocker) => (
              <li
                key={`${blocker.person}-${blocker.text}`}
                className="rounded-lg border border-line bg-surface px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{blocker.person}</span>
                  <Badge tone={SEVERITY_TONE[blocker.severity]}>{SEVERITY_LABEL[blocker.severity]}</Badge>
                </div>
                <p className="mt-1 break-words text-ink2 [overflow-wrap:anywhere]">{blocker.text}</p>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {summary.risks.length > 0 ? (
        <Block title="Риски">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink2">
            {summary.risks.map((item) => (
              <li key={item} className="break-words [overflow-wrap:anywhere]">
                {item}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {summary.focus.length > 0 ? (
        <Block title="Фокус на сегодня">
          <ul className="space-y-2">
            {summary.focus.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink2 break-words [overflow-wrap:anywhere]"
              >
                {item}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </AiIntelligenceSurface>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink3">{title}</h4>
      {children}
    </section>
  );
}

function SignalCard({
  title,
  tone,
  items,
  emptyHint,
}: {
  title: string;
  tone: "info" | "neutral" | "warning";
  items: string[];
  emptyHint: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-ink2">
          {items.map((item) => (
            <li key={item} className="break-words rounded-lg border border-line bg-line2/20 px-3 py-2 [overflow-wrap:anywhere]">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink3">{emptyHint}</p>
      )}
    </div>
  );
}
