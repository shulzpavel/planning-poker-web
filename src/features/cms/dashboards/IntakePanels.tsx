import type { ReactNode } from "react";
import { Badge, BottomSheet, Button, Surface } from "../../../design-system";
import { cmsMobileSectionShell } from "../components/cmsMobileLayout";
import type { IntakeIssue } from "./intakeTypes";
import { dayValue } from "./intakeTypes";

export function ChartPanel({
  title,
  subtitle,
  children,
  explanation,
  hint,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  explanation?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Surface
      as="section"
      className={`${cmsMobileSectionShell} intake-chart-panel`}
    >
      <div className="space-y-2 px-4 pt-5 sm:px-6 sm:pt-6">
        <h2 className="text-lg font-semibold leading-snug text-ink sm:text-xl">
          {title}
        </h2>
        <p className="intake-subtitle max-w-prose text-sm leading-relaxed text-ink3">
          {subtitle}
        </p>
      </div>
      <div className="intake-chart-body px-4 py-6 sm:px-6 sm:py-7">
        {children}
      </div>
      <div className="intake-chart-footer">
        {explanation ? (
          <div className="intake-explanation border-t border-line bg-line2/30 px-4 py-4 text-sm leading-7 text-ink2 sm:px-6 sm:py-5">
            {explanation}
          </div>
        ) : null}
        {hint}
      </div>
    </Surface>
  );
}
export function IssueDrawer({
  row,
  onClose,
  timezone = "UTC",
}: {
  row: IntakeIssue | null;
  onClose: () => void;
  timezone?: string;
}) {
  return (
    <BottomSheet
      open={row !== null}
      onClose={onClose}
      title={row?.summary}
      description="Статус запроса и время ожидания решения"
      footer={
        <Button intent="cancel" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      {row && (
        <div className="space-y-5 text-sm">
          {row.url && /^https?:\/\//.test(row.url) ? (
            <a
              className="font-semibold text-blue hover:underline"
              href={row.url}
              target="_blank"
              rel="noreferrer"
            >
              {row.key} ↗
            </a>
          ) : (
            <span className="font-semibold">{row.key}</span>
          )}
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-3">
            <dt className="text-ink3">Текущий статус</dt>
            <dd className="text-ink">
              <Badge>{row.status}</Badge>
            </dd>
            <dt className="text-ink3">Ответственный</dt>
            <dd className="text-ink">{row.assignee || "Не назначен"}</dd>
            <dt className="text-ink3">
              {row.left_at ? "Срок до первого решения" : "Ожидает решения"}
            </dt>
            <dd className="text-ink">{dayValue(row.age_days)}</dd>
            {row.outcome && (
              <>
                <dt className="text-ink3">Результат разбора</dt>
                <dd className="text-ink">{row.outcome}</dd>
              </>
            )}
            {row.entered_at && (
              <>
                <dt className="text-ink3">Поступил на разбор</dt>
                <dd className="text-ink">
                  {new Date(row.entered_at).toLocaleString("ru-RU", {
                    timeZone: timezone,
                  })}
                </dd>
              </>
            )}
          </dl>
          <p className="text-xs leading-relaxed text-ink3">
            Календарное время по истории переходов Jira. Ответственный указан на
            момент снимка.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
