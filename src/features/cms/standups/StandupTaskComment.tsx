import { useEffect, useId, useState } from "react";
import { Button, FieldLabel } from "../../../design-system";
import { cn } from "../../../design-system/utils";
import { standupCommentInputClass, standupRowActionButtonClass, standupTaskCardFooterClass } from "./standupUi";

interface StandupTaskCommentProps {
  value: string;
  editable: boolean;
  label?: string;
  /** Card footer — no label, placeholder only. */
  embedded?: boolean;
  onChange: (next: string) => void;
}

/** Single-row comment aligned with standup control height. */
export function StandupTaskComment({
  value,
  editable,
  label = "Комментарий",
  embedded = false,
  onChange,
}: StandupTaskCommentProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(value ?? "");
  const savedText = (value ?? "").trim();
  const draftText = draft.trim();
  const isDirty = draftText !== savedText;

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  if (!editable && !savedText) {
    return null;
  }

  if (!editable) {
    return (
      <div className="mt-3 space-y-1">
        <FieldLabel>{label}</FieldLabel>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink2">{savedText}</p>
      </div>
    );
  }

  const canSave = Boolean(draftText) && isDirty;

  function commit(nextText: string) {
    setDraft(nextText);
    onChange(nextText);
  }

  const commentPlaceholder = label === "Комментарий" ? "Комментарий…" : `${label}…`;

  return (
    <div className={cn(embedded ? cn(standupTaskCardFooterClass, "mt-3") : "mt-3 space-y-1.5")}>
      {embedded ? null : <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div className="flex items-stretch gap-2">
        <textarea
          id={inputId}
          rows={1}
          value={draft}
          placeholder={embedded ? commentPlaceholder : undefined}
          aria-label={embedded ? label : undefined}
          className={standupCommentInputClass}
          onChange={(event) => setDraft(event.target.value)}
        />
        {(canSave || savedText) ? (
          <div className="flex shrink-0 items-stretch gap-1">
            {canSave ? (
              <Button
                intent="add"
                size="sm"
                className={cn(standupRowActionButtonClass, "min-w-11 px-0")}
                aria-label="Добавить комментарий"
                title="Добавить"
                onClick={() => commit(draftText)}
              >
                +
              </Button>
            ) : null}
            {savedText ? (
              <Button
                intent="delete"
                size="sm"
                className={cn(standupRowActionButtonClass, "min-w-11 px-0")}
                aria-label="Удалить комментарий"
                title="Удалить"
                onClick={() => commit("")}
              >
                −
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
