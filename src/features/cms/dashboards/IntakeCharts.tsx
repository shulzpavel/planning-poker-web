import type { IntakeSnapshot } from "./intakeTypes";

const W=720,H=220,L=42,R=18,T=20,B=38;
export function QueueChart({ snapshot }: { snapshot:IntakeSnapshot }) {
  const rows=snapshot.daily, max=Math.max(2,...rows.map(x=>x.queue));
  const x=(i:number)=>L+i/Math.max(1,rows.length-1)*(W-L-R);
  const y=(v:number)=>H-B-v/max*(H-T-B);
  const points=rows.map((r,i)=>`${x(i)},${y(r.queue)}`).join(" ");
  return <figure className="intake-figure"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Сколько запросов ждёт решения">
    {[0,.5,1].map(f=><g key={f}><line x1={L} x2={W-R} y1={y(max*f)} y2={y(max*f)} stroke="rgb(var(--c-line))"/><text x={L-10} y={y(max*f)+4} textAnchor="end">{Math.round(max*f)}</text></g>)}
    <polygon points={`${L},${H-B} ${points} ${x(rows.length-1)},${H-B}`} fill="rgb(var(--c-blue) / .08)"/>
    <polyline points={points} stroke="rgb(var(--c-blue))" strokeWidth={2.5} fill="none" strokeLinejoin="round"/>
    {rows.map((r,i)=><g key={r.date}><circle cx={x(i)} cy={y(r.queue)} r={3} fill="rgb(var(--c-blue))"><title>{r.date}: {r.queue} запросов</title></circle>
      {(i%Math.max(1,Math.ceil(rows.length/5))===0||i===rows.length-1)&&<text x={x(i)} y={H-15} textAnchor="middle">{r.date.slice(8)}.{r.date.slice(5,7)}</text>}</g>)}
    <text x={L} y={12}>Ждут решения, запросов</text>
  </svg><figcaption>Дата · количество ожидающих на конец дня; сегодня — на момент снимка</figcaption></figure>;
}

