import { donutSlicePath } from "./intakeDonut";
import { Button } from "../../../design-system";
import type { IntakeBucket, IntakeReport } from "./intakeTypes";

const colors: Record<string,string> = { forward:"blue", deferred:"amber", rejected:"ink3", waiting:"purple", recent:"blue", week:"purple", old:"amber", unknown:"ink4" };
const color = (id:string) => `rgb(var(--c-${colors[id] || "blue"}))`;
export function ReportDonut({ title, groups, center, onSelect }: { title:string; groups:IntakeBucket[]; center:string; onSelect:(group:IntakeBucket)=>void }) {
  const total=groups.reduce((sum,x)=>sum+x.count,0), radius=78;
  let offset=0;
  if(!total) return <p className="py-10 text-center text-sm text-ink3">В этой группе пока нет запросов.</p>;
  return <div className="grid items-center gap-5 sm:grid-cols-[minmax(150px,0.8fr)_minmax(0,1.2fr)]">
    <svg viewBox="0 0 210 210" role="img" aria-label={title} className="mx-auto w-full max-w-[220px]">
      <circle cx={105} cy={105} r={radius} fill="none" stroke="rgb(var(--c-line2))" strokeWidth={22}/>
      {groups.filter(x=>x.count>0).map(group=>{const share=group.count/total, start=offset;offset+=share;
        return <path key={group.id} d={donutSlicePath(start,share)} fill={color(group.id)}><title>{group.label}: {group.count}</title></path>;})}
      <text x={105} y={102} textAnchor="middle" fill="rgb(var(--c-ink))" fontSize={36} fontWeight={700}>{total}</text>
      <text x={105} y={125} textAnchor="middle" fill="rgb(var(--c-ink3))" fontSize={12}>{center}</text>
    </svg>
    <div className="space-y-1">{groups.map(group=><Button key={group.id} variant="ghost" size="sm" disabled={!group.count}
      aria-label={`${group.label}: ${group.count} запросов`} onClick={()=>onSelect(group)} className="w-full justify-between gap-3 px-2 text-left">
      <span className="flex items-center gap-2 text-sm font-medium"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{background:color(group.id)}}/>{group.label}</span>
      <span className="shrink-0 text-sm tabular-nums">{group.count}<span className="ml-2 text-xs font-normal text-ink3">{Math.round(group.count/total*100)}%</span></span>
    </Button>)}</div>
  </div>;
}
export function ReportBars({ groups, onSelect, label="Время разбора по группам", emptyText="За этот период нет запросов с завершённым разбором." }: { groups:IntakeBucket[]; onSelect:(group:IntakeBucket)=>void; label?:string; emptyText?:string }) {
  const total=groups.reduce((sum,x)=>sum+x.count,0);
  if(!total) return <p className="py-10 text-center text-sm text-ink3">{emptyText}</p>;
  return <div className="space-y-2" role="group" aria-label={label}>{groups.map(group=><button key={group.id} disabled={!group.count}
    aria-label={`${group.label}: ${group.count} запросов`} onClick={()=>onSelect(group)}
    className="block w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-line2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue disabled:cursor-default">
    <span className="mb-2 flex justify-between gap-3 text-sm"><span className="text-ink2">{group.label}</span><span className="font-semibold tabular-nums text-ink">{group.count}<span className="ml-2 font-normal text-ink3">{Math.round(group.count/total*100)}%</span></span></span>
    <span className="block h-2.5 overflow-hidden rounded-full bg-line2"><span className="block h-full rounded-full bg-blue" style={{width:`${group.count/total*100}%`}}/></span>
  </button>)}</div>;
}
function shortDate(raw:string) { return `${raw.slice(8)}.${raw.slice(5,7)}`; }
export function WeeklyChart({ report, onSelect }: { report:IntakeReport; onSelect:(title:string,keys:string[])=>void }) {
  const max=Math.max(1,...report.weekly.flatMap(row=>[row.received,row.decided]));
  return <figure aria-label="Поступившие и разобранные запросы по неделям">
    <p className="mb-4 text-xs text-ink3">Количество запросов</p>
    <div className="grid gap-2 border-b border-line pb-2 sm:gap-6" style={{gridTemplateColumns:`repeat(${report.weekly.length},minmax(0,1fr))`}}>
      {report.weekly.map(row=><div key={row.start} className="min-w-0">
        <div className="flex h-36 items-end justify-center gap-1 sm:gap-3">{(["received","decided"] as const).map((key,i)=><button key={key}
          disabled={!row[key]} aria-label={`${i===0?"Поступило":"Разобрали"} ${row.start}–${row.end}: ${row[key]}`}
          onClick={()=>onSelect(`${i===0?"Поступило":"Разобрали"}: ${shortDate(row.start)}–${shortDate(row.end)}`,i===0?row.received_keys:row.decided_keys)}
          className="relative min-w-0 flex-1 rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 disabled:cursor-default"
          style={{height:`${Math.max(2,row[key]/max*115)}px`,maxWidth:38,background:`rgb(var(--c-${i===0?"blue":"purple"}))`}}>
          <span className="absolute -top-6 left-0 right-0 text-center text-xs font-semibold tabular-nums text-ink">{row[key]}</span>
        </button>)}</div><p className="mt-3 text-center text-[10px] text-ink3 sm:text-xs">{shortDate(row.start)}–{shortDate(row.end)}</p>
      </div>)}
    </div><figcaption className="mt-4 flex flex-wrap gap-5 text-xs text-ink3"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-blue"/>Новые запросы</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-purple"/>Первое решение</span><span>Крайние недели могут быть неполными</span></figcaption>
  </figure>;
}

