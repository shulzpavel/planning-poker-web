import type { ReactNode } from "react";
import { Badge, BottomSheet, Button, Surface } from "../../../design-system";
import { MobileMetricTile } from "../components/CmsPrimitives";
import { cmsMobileSectionShell } from "../components/cmsMobileLayout";
import type { IntakeIssue, IntakeSnapshot } from "./intakeTypes";
import { dayValue } from "./intakeTypes";

export function Insight({ snapshot, kind }: { snapshot:IntakeSnapshot; kind:keyof IntakeSnapshot["insights"] }) {
  const ai = snapshot.ai?.insights[kind];
  return <div className="border-t border-line bg-line2/30 px-3 py-3 sm:px-4 lg:px-5">
    <p className="mb-1 text-xs font-semibold text-ink3">{ai ? "Пояснение ИИ" : "Что видно по данным"}</p>
    <p className="text-sm leading-relaxed text-ink2">{ai || snapshot.insights[kind]}</p></div>;
}
export function ChartPanel({ title, subtitle, children, snapshot, kind, explanation, hint }: { title:string; subtitle:string; children:ReactNode; snapshot?:IntakeSnapshot; kind?:keyof IntakeSnapshot["insights"]; explanation?:ReactNode; hint?:ReactNode }) {
  return <Surface as="section" className={`${cmsMobileSectionShell} intake-chart-panel`}>
    <div className="space-y-2 px-4 pt-5 sm:px-6 sm:pt-6"><h2 className="text-lg font-semibold leading-snug text-ink sm:text-xl">{title}</h2><p className="intake-subtitle max-w-prose text-sm leading-relaxed text-ink3">{subtitle}</p></div>
    <div className="intake-chart-body px-4 py-6 sm:px-6 sm:py-7">{children}</div><div className="intake-chart-footer">{explanation ? <div className="intake-explanation border-t border-line bg-line2/30 px-4 py-4 text-sm leading-7 text-ink2 sm:px-6 sm:py-5">{explanation}</div> : snapshot && kind ? <Insight snapshot={snapshot} kind={kind}/> : null}{hint}</div></Surface>;
}
export function IntakeMetrics({ snapshot }: { snapshot:IntakeSnapshot }) {
  const m = snapshot.metrics;
  const values = [
    {value:m.arrivals,label:"Входов за период",hint:"Включая повторные обращения"},
    {value:m.pending,label:"Сейчас ждут решения",hint:"Новые + нужна информация"},
    {value:dayValue(m.p85_days),label:"P85 первого решения",hint:`По ${m.decisions} завершённым прохождениям`},
    {value:m.within_sle_pct===null ? "—" : `${m.within_sle_pct.toLocaleString("ru-RU")}%`,label:"В пределах ориентира",
      hint:m.sle_days===null ? `Нужно 20 завершений, есть ${m.baseline_n}` : `Исторический P85: ${dayValue(m.sle_days)}`},
  ];
  return <Surface as="section" aria-label="Основные показатели" className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4 lg:grid-cols-4">
    {values.map(item=><MobileMetricTile key={item.label} {...item}/>)}</Surface>;
}
export function IssueDrawer({ row, onClose }: { row:IntakeIssue|null; onClose:()=>void }) {
  return <BottomSheet open={row!==null} onClose={onClose} title={row?.summary} description="Статус запроса и время ожидания решения"
    footer={<Button intent="cancel" onClick={onClose}>Закрыть</Button>}>
    {row && <div className="space-y-5 text-sm"><a className="font-semibold text-blue hover:underline" href={`https://media-global.atlassian.net/browse/${row.key}`} target="_blank" rel="noreferrer">{row.key} ↗</a>
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-3">
        <dt className="text-ink3">Текущий статус</dt><dd className="text-ink"><Badge>{row.status}</Badge></dd>
        <dt className="text-ink3">Ответственный</dt><dd className="text-ink">{row.assignee||"Не назначен"}</dd>
        <dt className="text-ink3">{row.left_at ? "Срок до первого решения" : "Ожидает решения"}</dt><dd className="text-ink">{dayValue(row.age_days)}</dd>
        {row.outcome && <><dt className="text-ink3">Результат разбора</dt><dd className="text-ink">{row.outcome}</dd></>}
        {row.entered_at && <><dt className="text-ink3">Поступил на разбор</dt><dd className="text-ink">{new Date(row.entered_at).toLocaleString("ru-RU",{timeZone:"Europe/Belgrade"})}</dd></>}
      </dl><p className="text-xs leading-relaxed text-ink3">Календарное время по истории переходов Jira. Ответственный указан на момент снимка.</p>
    </div>}
  </BottomSheet>;
}
