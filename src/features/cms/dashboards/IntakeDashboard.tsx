import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Surface } from "../../../design-system";
import { Skeleton } from "../components/CmsPrimitives";
import { cmsMobileSectionShell } from "../components/cmsMobileLayout";
import { IntakeAnalysisProvider } from "./IntakeAnalysisProvider";
import type { AnalysisLoader } from "./IntakeAnalysisProvider";
import { IssueDrawer } from "./IntakePanels";
import { CurrentRequests, MonthlyCharts, RequestList } from "./IntakeReportSections";
import type { RequestSelection } from "./IntakeReportSections";
import { IntakeSpeedSummary } from "./IntakeSpeedSummary";
import { IntakeSpeedTrend } from "./IntakeSpeedTrend";
import { IntakePreviewHeader } from "./IntakePreviewHeader";
import { fetchIntakeSnapshot } from "./intakeTypes";
import type { IntakeIssue, IntakeSnapshot } from "./intakeTypes";
import "./intakeDashboard.css";

type Loader=(days:number,signal:AbortSignal)=>Promise<IntakeSnapshot>;
function useSnapshot(days:number,load:Loader,retry:number) {
  const [snapshot,setSnapshot]=useState<IntakeSnapshot|null>(null),[error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();setSnapshot(null);setError(false);
    load(days,controller.signal).then(value=>{if(!controller.signal.aborted)setSnapshot(value);}).catch(()=>{if(!controller.signal.aborted)setError(true);});
    return ()=>controller.abort();
  },[days,load,retry]);
  return {snapshot,error};
}
function DashboardHeader({ days,snapshot,onDays }: { days:number;snapshot:IntakeSnapshot|null;onDays:(days:number)=>void }) {
  return <Surface className={cmsMobileSectionShell}><div className="space-y-5 px-4 py-6 sm:px-6 sm:py-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="max-w-3xl space-y-3">
      <Badge tone="info">Business Backlog</Badge><h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">Как мы разбираем продуктовые инициативы</h1>
      <p className="intake-subtitle max-w-2xl text-base leading-7 text-ink3">Результаты за <strong>{days} дней</strong>: что поступило в работу, какие решения приняли и где требуется внимание.</p>
    </div><div className="flex shrink-0 gap-2" aria-label="Период">{[7,30,90].map(n=><Button key={n} size="sm" variant={days===n?"primary":"secondary"} aria-pressed={days===n} onClick={()=>onDays(n)}>{n} дней</Button>)}</div></div>
    <p className="max-w-3xl border-t border-line pt-5 text-sm leading-7 text-ink2"><strong>Инициатива — это запрос на изменение или развитие продукта.</strong> На первом этапе уточняем потребность и решаем, что прорабатывать дальше, что отложить, а от чего отказаться. Если ждём уточнений, запрос остаётся <strong>без решения</strong>.</p>
    <p className="text-xs text-ink3">{snapshot?`Данные из Jira на ${new Date(snapshot.generated_at).toLocaleString("ru-RU",{timeZone:"Europe/Belgrade"})}. В прототипе они пока не обновляются автоматически.`:"Загружаем данные из Jira…"}</p>
  </div></Surface>;
}
function DashboardContent({ snapshot,onSelect,onSelection }: { snapshot:IntakeSnapshot;onSelect:(row:IntakeIssue)=>void;onSelection:(selection:RequestSelection)=>void }) {
  const onGroup=(title:string,keys:string[])=>onSelection({title,rows:snapshot.report.requests.filter(row=>keys.includes(row.key))});
  return <>
    <div className="space-y-2 pt-2"><h2 className="text-xl font-bold text-ink sm:text-2xl">Результаты за {snapshot.days} дней</h2><p className="intake-subtitle max-w-3xl text-sm leading-relaxed text-ink3">Сначала — <strong>сроки разбора и изменение скорости</strong>. Ниже — состав потока инициатив и отдельный блок текущей очереди.</p></div>
    <IntakeSlaCard snapshot={snapshot}/>
    <IntakeSpeedSummary snapshot={snapshot}/>
    <IntakeSpeedTrend snapshot={snapshot} onGroup={onGroup}/>
    <div className="space-y-2 pt-3"><h2 className="text-xl font-bold text-ink sm:text-2xl">Поток инициатив и результаты разбора</h2><p className="intake-subtitle max-w-3xl text-sm leading-7 text-ink3">Ниже — количество и источники запросов за период. Результат новых инициатив показан <strong>на дату снимка</strong>; это состояние когорты, а не средний показатель.</p></div>
    <MonthlyCharts snapshot={snapshot} onGroup={onGroup}/>
    <CurrentRequests snapshot={snapshot} onSelect={onSelect} onSelection={onSelection}/>
    <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-xs text-ink3"><span>Источник: DH · {snapshot.coverage.complete} / {snapshot.coverage.total} эпиков с полной историей</span><span>Календарное время · Europe/Belgrade</span></footer>
  </>;
}

function IntakeSlaCard({ snapshot }: { snapshot: IntakeSnapshot }) {
  const value = snapshot.metrics.p85_days === null ? "—" : Math.round(snapshot.metrics.p85_days);
  return <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink3">SLA первой стадии · p85</p><h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Business Backlog → решение</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink3">85% завершённых запросов проходят разбор не дольше указанного срока. Показатель рассчитан по выбранному периоду.</p><div className="mt-6 flex flex-col gap-5 rounded-xl bg-surface2 p-5 sm:flex-row sm:items-center sm:gap-8"><div className="shrink-0"><strong className="block text-5xl text-ink sm:text-6xl">{value}</strong><span className="text-sm text-ink3">дней</span></div><p className="max-w-2xl text-sm leading-6 text-ink2"><strong>85% запросов проходят первую стадию за {value} дней или быстрее.</strong></p></div></section>;
}
export default function IntakeDashboard({ loadSnapshot=fetchIntakeSnapshot, loadAnalysis }: { loadSnapshot?:Loader; loadAnalysis?:AnalysisLoader }) {
  const [params,setParams]=useSearchParams();
  const days=[7,30,90].includes(Number(params.get("days")))?Number(params.get("days")):30;
  const [retry,setRetry]=useState(0),[selected,setSelected]=useState<IntakeIssue|null>(null);
  const [selection,setSelection]=useState<RequestSelection|null>(null);
  const {snapshot,error}=useSnapshot(days,loadSnapshot,retry);
  const close=useCallback(()=>setSelected(null),[]),closeList=useCallback(()=>setSelection(null),[]);
  const select=(row:IntakeIssue)=>{setSelection(null);setSelected(row);};
  return <main className="intake-dashboard min-h-screen-mobile app-gradient-bg pb-safe"><IntakePreviewHeader/>
    <div className="cms-shell intake-content mx-auto space-y-6 px-3 py-5 sm:space-y-7 sm:px-4 sm:py-7 lg:py-8">
      <DashboardHeader days={days} snapshot={snapshot} onDays={n=>{setSelected(null);setSelection(null);setParams({days:String(n)});}}/>
      {snapshot&&snapshot.coverage.complete<snapshot.coverage.total&&<Alert tone="warning">История загружена частично: {snapshot.coverage.complete} из {snapshot.coverage.total}. Исторические графики предварительные.</Alert>}
      {error?<Alert tone="danger" title="Не удалось загрузить снимок Jira"><p className="mb-3">Проверьте, что локальный сервер прототипа запущен и снимок подготовлен.</p><Button intent="refresh" size="sm" onClick={()=>setRetry(n=>n+1)}>Повторить</Button></Alert>:snapshot?<IntakeAnalysisProvider key={`${snapshot.days}:${snapshot.generated_at}`} snapshot={snapshot} load={loadAnalysis}><DashboardContent snapshot={snapshot} onSelect={select} onSelection={setSelection}/></IntakeAnalysisProvider>:<div role="status" aria-label="Загружаем аналитику Jira"><Skeleton height="h-64"/></div>}
    </div><RequestList selection={selection} onClose={closeList} onSelect={select}/><IssueDrawer row={selected} onClose={close}/>
  </main>;
}

