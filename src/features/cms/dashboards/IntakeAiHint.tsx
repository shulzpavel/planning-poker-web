import { useState } from "react";
import { AiIntelligenceSurface, AiSparkleIcon, Button } from "../../../design-system";
import { CmsSection } from "../components/CmsSection";
import { buildAnalysisFacts, hintLabels } from "./intakeAnalysisFacts";
import type { IntakeHintKind } from "./intakeAnalysisFacts";
import { useIntakeAnalysis } from "./IntakeAnalysisProvider";
import type { IntakeSnapshot } from "./intakeTypes";

export function IntakeAiHint({ snapshot, kind, onGroup }: {
  snapshot: IntakeSnapshot; kind: IntakeHintKind; onGroup: (title: string, keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { analysis, error, retry } = useIntakeAnalysis();
  const hint = analysis?.charts[kind], facts = buildAnalysisFacts(snapshot)[kind].facts;
  return <CmsSection open={open} onToggle={setOpen} key={`${snapshot.days}:${snapshot.generated_at}`} className="mx-0 border-x-0 border-b-0 shadow-none sm:mx-0 lg:rounded-none lg:shadow-none" bodyClassName="!pt-0"
    title={<span className="inline-flex items-center gap-2 text-sm font-medium text-ink3"><AiSparkleIcon className="h-4 w-4"/><span>ИИ-разбор: {hintLabels[kind]}</span></span>}>
    {open && <div aria-label={`ИИ-подсказка: ${hintLabels[kind]}`} role="region">
      {hint && analysis ? <AiIntelligenceSurface sparkleLabel="ИИ-разбор" className="space-y-4 p-5 sm:p-6">
        <p className="pr-5 text-sm leading-6"><strong>{hint.headline}</strong></p>
        <p className="max-w-prose text-sm leading-7 text-ink2">{hint.explanation.replace(/\s+согласно факту [a-z]\w*/gi, "")}</p>
        <ul className="max-w-prose space-y-2 border-t border-line pt-4 text-xs leading-6 text-ink3">{hint.fact_ids.map(id => <li key={id}>{facts.find(x => x.id === id)?.text}</li>)}</ul>
        {kind !== "flow" && <p className="max-w-prose text-sm leading-7 text-ink2"><strong>Фокус разбора: </strong>{hint.focus}</p>}
        {hint.keys.length > 0 && <Button size="sm" variant="ghost" onClick={() => onGroup(`ИИ-разбор: ${hintLabels[kind]}`, hint.keys)}>Связанные запросы · {hint.keys.length}</Button>}
        <p className="text-xs leading-5 text-ink3">Claude · {new Date(analysis.generated_at).toLocaleString("ru-RU", { timeZone: "Europe/Belgrade" })} · по снимку Jira</p>
      </AiIntelligenceSurface> : error ? <div className="space-y-3 text-sm text-ink3"><p>Не удалось получить ИИ-разбор. Графики доступны; попробуйте ещё раз.</p><Button size="sm" variant="ghost" onClick={retry}>Повторить ИИ-разбор</Button></div> : <p role="status" className="text-sm leading-7 text-ink3">ИИ сопоставляет динамику и запросы. Графики уже доступны, разбор появится автоматически.</p>}
    </div>}
  </CmsSection>;
}
