import { useEffect, useState } from "react";
import { Alert, Badge, Button, Surface } from "../../../design-system";
import { Skeleton } from "../components/CmsPrimitives";
import { cmsMobileSectionShell } from "../components/cmsMobileLayout";
import { IntakePreviewHeader } from "./IntakePreviewHeader";
import { ageLabel, fetchDiscoverySnapshot, type DiscoveryOwner, type DiscoverySnapshot, type DiscoveryStatusStat, type DiscoveryStageSla } from "./discoveryTypes";
import "./intakeDashboard.css";


function useDiscovery(days: number, retry: number) {
  const [snapshot, setSnapshot] = useState<DiscoverySnapshot | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null); setError(false);
    fetchDiscoverySnapshot(days, controller.signal).then(setSnapshot).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [days, retry]);
  return { snapshot, error };
}

function DashboardHeader({ days, onDays, snapshot }: { days: number; onDays: (value: number) => void; snapshot: DiscoverySnapshot | null }) {
  return <Surface className={cmsMobileSectionShell}><div className="space-y-5 px-4 py-6 sm:px-6 sm:py-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="max-w-3xl space-y-3"><Badge tone="info">Исследование и подготовка</Badge><h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">Где зависает подготовка инициатив</h1><p className="intake-subtitle max-w-2xl text-base leading-7 text-ink3">Ретроспектива потока за <strong>{days} дней</strong>: переходы, возвраты и задачи, которые продолжают стоять.</p></div><div className="flex shrink-0 gap-2" aria-label="Период">{[7, 30, 90].map(value => <Button key={value} size="sm" variant={days === value ? "primary" : "secondary"} aria-pressed={days === value} onClick={() => onDays(value)}>{value} дней</Button>)}</div></div><p className="max-w-3xl border-t border-line pt-5 text-sm leading-7 text-ink2">Период влияет на историю переходов. Текущая очередь и возраст задач показываются отдельным срезом на дату обновления.</p><p className="text-xs text-ink3">{snapshot ? `Данные из Jira на ${new Date(snapshot.generated_at).toLocaleString("ru-RU", { timeZone: "Europe/Belgrade" })}.` : "Загружаем данные из Jira…"}</p></div></Surface>;
}

export default function DiscoveryDashboard() {
  const [days, setDays] = useState(30);
  const [retry, setRetry] = useState(0);
  const { snapshot, error } = useDiscovery(days, retry);
  return <main className="intake-dashboard min-h-screen-mobile app-gradient-bg pb-safe"><IntakePreviewHeader active="discovery"/><div className="cms-shell intake-content mx-auto space-y-6 px-3 py-5 sm:space-y-7 sm:px-4 sm:py-7 lg:py-8"><DashboardHeader days={days} onDays={setDays} snapshot={snapshot}/>{error ? <Alert tone="danger" title="Не удалось загрузить снимок Jira"><Button intent="refresh" size="sm" onClick={() => setRetry(value => value + 1)}>Повторить</Button></Alert> : snapshot ? <DashboardContent snapshot={snapshot}/> : <div role="status" aria-label="Загружаем аналитику исследования"><Skeleton height="h-64"/></div>}</div></main>;
}

function DashboardContent({ snapshot }: { snapshot: DiscoverySnapshot }) {
  return <><StageSlaCard sla={snapshot.stage_sla}/><OwnerChart snapshot={snapshot}/><AttentionSection snapshot={snapshot}/><FlowSection snapshot={snapshot}/><footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-xs text-ink3"><span>История: {snapshot.coverage.complete} / {snapshot.coverage.total} эпиков полностью загружены</span><span>Календарное время · Europe/Belgrade</span></footer></>;
}

function StageSlaCard({ sla }: { sla: DiscoveryStageSla }) {
  const trend = sla.trend === "up" ? "↑ растёт" : sla.trend === "down" ? "↓ снижается" : "→ стабильно";
  const trendTone = sla.trend === "up" ? "text-red-300" : sla.trend === "down" ? "text-green-300" : "text-ink3";
  return <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-ink3">SLA всей стадии</p><h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Исследование → backlog SA</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink3">Надёжный ориентир для планирования: 85% завершённых инициатив проходят всю стадию не дольше указанного срока.</p></div><span className={`text-lg font-bold ${trendTone}`}>{trend}</span></div><div className="mt-6 flex flex-col gap-5 rounded-xl bg-surface2 p-5 sm:flex-row sm:items-center sm:gap-8"><div className="shrink-0"><p className="text-xs font-semibold uppercase tracking-wide text-ink3">SLA стадии · p85</p><strong className="mt-1 block text-5xl text-ink sm:text-6xl">{sla.p85_workdays ?? "—"}</strong><span className="text-sm text-ink3">рабочих дней</span></div><div className="max-w-xl text-sm leading-6 text-ink2"><strong>85% инициатив проходят стадию за {sla.p85_workdays ?? "—"} рабочих дней или быстрее.</strong> Это показатель, на который стоит опираться при планировании.</div></div><p className="mt-4 text-xs text-ink3">В расчёте {sla.completed_count} завершённых инициатив. Задача, прошедшая оба статуса в один рабочий день, считается как 1 рабочий день.</p></section>;
}

function FlowSection({ snapshot }: { snapshot: DiscoverySnapshot }) {
  const max = Math.max(...snapshot.status_stats.map(row => row.current), 1);
  const largestQueue = snapshot.status_stats.reduce((best, row) => row.current > best.current ? row : best, snapshot.status_stats[0]);
  const slowest = snapshot.status_stats.reduce((best, row) => (row.p85_days || 0) > (best.p85_days || 0) ? row : best, snapshot.status_stats[0]);
  return <section className="space-y-4"><div><h2 className="text-xl font-bold text-ink">Где зависает поток</h2><p className="mt-1 max-w-3xl text-sm leading-7 text-ink3">Синяя полоса — сколько задач находится в статусе сейчас. Чем длиннее полоса, тем больше очередь.</p></div><div className="rounded-xl border border-line bg-surface p-5 sm:p-7"><div className="space-y-5">{snapshot.status_stats.map(row => <StageBar key={row.status} row={row} max={max}/>)}</div><div className="mt-7 rounded-lg bg-blue/10 p-4 text-sm leading-6 text-ink"><strong>Главный вывод:</strong> больше всего задач сейчас в «{largestQueue.status}» — {largestQueue.current}. Самый длинный хвост по времени — «{slowest.status}»: до 85% завершённых заходов укладывались не быстрее {ageLabel(slowest.p85_days || 0)}. Эти два места стоит разбирать в первую очередь.</div></div></section>;
}

function StageBar({ row, max }: { row: DiscoveryStatusStat; max: number }) {
  return <div><div className="mb-2 flex items-baseline justify-between gap-3"><span className="font-semibold text-ink">{row.status}</span><span className="text-sm text-ink3">{row.current} сейчас</span></div><div className="h-7 overflow-hidden rounded-md bg-line2"><span className="block h-full rounded-md bg-blue transition-all" style={{ width: `${Math.max(row.current / max * 100, row.current ? 4 : 0)}%` }}/></div><p className="mt-1 text-xs text-ink3">{row.p85_days == null ? "Нет завершённых заходов" : `длинный хвост: ${ageLabel(row.p85_days)}`}</p></div>;
}


function AttentionSection({ snapshot }: { snapshot: DiscoverySnapshot }) {
  return <section className="space-y-4"><div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><span className="attention-alarm-dot" aria-hidden="true"><span/></span><h2 className="text-2xl font-bold text-ink sm:text-3xl">На что обратить внимание</h2><span className="attention-alarm-label">ALARM · {snapshot.attention.length}</span></div><p className="mt-3 max-w-3xl text-sm leading-7 text-ink2">{snapshot.attention.length} инициатив продолжают стоять дольше 14 дней. Это сигнал для проверки карточки, а не автоматически подтверждённый блокер.</p></div></div><div className="mt-6 grid gap-3">{snapshot.attention.map((row, index) => <AttentionCard key={row.key} row={row} priority={index < 3 ? "high" : "watch"} index={index}/>)}</div><p className="mt-5 pt-4 text-xs leading-5 text-ink3">Причина зависания требует проверки истории изменений и комментариев в Jira.</p></div></section>;
}

function AttentionCard({ row, priority, index }: { row: DiscoverySnapshot["attention"][number]; priority: "high" | "watch"; index: number }) {
  return <article style={{ animationDelay: `${index * 70}ms` }} className={`attention-card group grid cursor-default gap-3 rounded-xl p-4 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg focus-within:-translate-y-0.5 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] sm:items-center ${priority === "high" ? "bg-red-500/10 hover:bg-red-500/15 hover:shadow-red-500/10" : "bg-amber-500/5 hover:bg-amber-500/10"}`}><div className="min-w-0"><a className="font-bold text-blue hover:underline" href={`https://media-global.atlassian.net/browse/${row.key}`}>{row.key}</a><p className="mt-1 truncate text-sm text-ink" title={row.summary}>{row.summary}</p></div><div className="text-sm text-ink2"><span className="block text-xs text-ink3">Исполнитель</span>{row.assignee}</div><div className="text-sm text-ink2"><span className="block text-xs text-ink3">Статус</span>{row.status}</div><div className={`justify-self-start rounded-full px-3 py-1 text-sm font-bold transition-transform duration-200 group-hover:scale-105 sm:justify-self-end ${priority === "high" ? "bg-red-500/15 text-red-200" : "bg-amber-500/15 text-amber"}`}>{ageLabel(row.age_days)}</div></article>;
}

const ownerStatuses = ["backlog SA", "Исследование", "Описание от PO", "Дизайн"];
const ownerStatusTone: Record<string, string> = { "backlog SA": "bg-blue", "Исследование": "bg-lime-600", "Описание от PO": "bg-purple", "Дизайн": "bg-orange-500" };

function OwnerChart({ snapshot }: { snapshot: DiscoverySnapshot }) {
  const owners = snapshot.owners.filter(owner => owner.stage_count + owner.backlog_sa_count > 0);
  const max = Math.max(...owners.map(owner => owner.stage_count + owner.backlog_sa_count), 1);
  return <section className="space-y-3"><div><h2 className="text-xl font-bold text-ink">Задачи по исполнителям и статусам</h2><p className="mt-1 text-sm leading-7 text-ink3">Текущие задачи на стадии 2. Один столбец — один исполнитель, цветные сегменты показывают распределение по статусам.</p></div><div className="rounded-xl border border-line bg-surface p-5 sm:p-7"><div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-5 text-xs font-semibold text-ink3">{ownerStatuses.map(status => <span key={status} className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-sm ${ownerStatusTone[status]}`}/>{status}</span>)}</div><div className="mt-6 flex min-h-72 items-end gap-3 overflow-x-auto pb-10 sm:gap-6">{owners.map(owner => <OwnerBar key={owner.name} owner={owner} max={max}/>)}</div><p className="mt-2 text-center text-xs font-semibold text-ink3">Исполнитель</p></div></section>;
}

function OwnerBar({ owner, max }: { owner: DiscoveryOwner; max: number }) {
  const total = owner.stage_count + owner.backlog_sa_count;
  return <div className="flex min-w-24 flex-1 flex-col items-center justify-end gap-2"><div className="flex h-56 w-full max-w-32 flex-col justify-end overflow-hidden rounded-t-md bg-line2" title={`${owner.name}: ${total} задач`}>{ownerStatuses.map(status => { const count = status === "backlog SA" ? owner.backlog_sa_count : owner.status_counts[status] || 0; return count ? <div key={status} className={`flex items-center justify-center text-xs font-semibold text-white ${ownerStatusTone[status]}`} style={{ height: `${count / max * 100}%`, minHeight: 22 }} title={`${status}: ${count}`}>{count}</div> : null; })}</div><span className="max-w-32 text-center text-xs text-ink3">{owner.name}</span><span className="text-sm font-bold text-ink">{total}</span></div>;
}

