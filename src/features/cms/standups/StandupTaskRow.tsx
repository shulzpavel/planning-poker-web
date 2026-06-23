import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, DatePickerPopover, DropdownField, TextField } from "../../../design-system";
import { cn } from "../../../design-system/utils";
import type { StandupTrack, StandupWorkItem } from "../api/cmsClient";
import {
  formatStandupLocalDueTag,
  lookupStandupJiraIssue,
  lookupStandupLocalDueHint,
  normalizeStandupJiraKey,
  resolveStandupWorkItemTitle,
  shouldLookupStandupJiraOnBlur,
  type StandupLocalDueHint,
} from "./standupJira";
import { STANDUP_STATUS_OPTIONS, formatStandupShortDate, isDueSoonOrOverdue } from "./standupsLogic";
import { StandupAdaptiveTextarea } from "./StandupAdaptiveTextarea";
import { StandupTaskComment } from "./StandupTaskComment";
import {
  standupCompactField,
  standupFieldChevronClass,
  standupFieldInputClass,
  standupFieldTriggerClass,
  standupRowActionButtonClass,
  standupTaskCardClass,
  standupTaskIndexBadgeClass,
  standupTaskMetaGridClass,
  standupTaskMetaPanelClass,
} from "./standupUi";

interface StandupTaskRowProps {
  item: StandupWorkItem;
  track: StandupTrack;
  editable: boolean;
  teamId: number | null;
  meetingDate: string;
  /** Shown when a track has multiple tasks — helps scan the list. */
  cardIndex?: number;
  onChange: (patch: Partial<StandupWorkItem>) => void;
  onRemove?: () => void;
}

export function StandupTaskRow({
  item,
  track,
  editable,
  teamId,
  meetingDate,
  cardIndex,
  onChange,
  onRemove,
}: StandupTaskRowProps) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [localDueHint, setLocalDueHint] = useState<StandupLocalDueHint | null>(null);
  const [localDueLoading, setLocalDueLoading] = useState(false);
  const onChangeRef = useRef(onChange);
  const lastLookupKeyRef = useRef<string | null>(null);
  onChangeRef.current = onChange;

  const manualTitle = (item.task_title ?? "").trim();
  const displayTitle = resolveStandupWorkItemTitle(item);
  const showLocalDueTag = Boolean(localDueHint?.dueDate);
  const showLocalDueRow = localDueLoading || showLocalDueTag;
  const metaVisible = lookupBusy || Boolean(lookupError);
  const cardVariant = track === "blocker" ? "blocker" : "default";
  const commentLabel = track === "blocker" ? "Что мешает" : "Комментарий";

  useEffect(() => {
    const key = normalizeStandupJiraKey(item.jira_key ?? "");
    const title = (item.task_title ?? "").trim();
    lastLookupKeyRef.current = key && title && title.toUpperCase() !== key ? key : null;
    setLookupError(null);
    setLookupBusy(false);
  }, [item.id]);

  useEffect(() => {
    const key = normalizeStandupJiraKey(item.jira_key ?? "");
    if (!key || teamId == null) {
      setLocalDueHint(null);
      setLocalDueLoading(false);
      return;
    }

    let cancelled = false;
    setLocalDueLoading(true);
    void lookupStandupLocalDueHint(key, { teamId, beforeMeetingDate: meetingDate })
      .then((hint) => {
        if (!cancelled) setLocalDueHint(hint);
      })
      .catch(() => {
        if (!cancelled) setLocalDueHint(null);
      })
      .finally(() => {
        if (!cancelled) setLocalDueLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item.jira_key, meetingDate, teamId]);

  const runJiraLookup = useCallback(
    async (rawKey: string, taskTitle: string) => {
      if (!shouldLookupStandupJiraOnBlur(rawKey, taskTitle, lastLookupKeyRef.current)) {
        if (!normalizeStandupJiraKey(rawKey)) setLookupError(null);
        return;
      }

      const key = normalizeStandupJiraKey(rawKey)!;
      setLookupBusy(true);
      setLookupError(null);
      try {
        const result = await lookupStandupJiraIssue(key);
        if (!result) return;
        lastLookupKeyRef.current = result.key;
        const patch: Partial<StandupWorkItem> = { jira_key: result.key };
        const currentTitle = taskTitle.trim();
        const prevKey = normalizeStandupJiraKey(item.jira_key ?? "");
        if (!currentTitle || (prevKey && currentTitle.toUpperCase() === prevKey)) {
          patch.task_title = result.summary;
        }
        onChangeRef.current(patch);
      } catch (error: unknown) {
        lastLookupKeyRef.current = null;
        setLookupError(error instanceof Error ? error.message : "Задача не найдена в Jira");
      } finally {
        setLookupBusy(false);
      }
    },
    [item.jira_key],
  );

  if (!editable) {
    return (
      <li className={standupTaskCardClass(cardVariant)}>
        <div className="flex items-start gap-3">
          {cardIndex ? <span className={standupTaskIndexBadgeClass}>{cardIndex}</span> : null}
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="whitespace-pre-wrap text-sm font-medium leading-snug text-ink">{displayTitle}</p>
            <div className="flex flex-wrap items-center gap-2">
              {item.jira_key ? (
                <span className="rounded-md bg-line2/40 px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                  {item.jira_key}
                </span>
              ) : null}
              {item.due_date ? (
                <Badge tone={isDueSoonOrOverdue(item.due_date) ? "danger" : "neutral"} className="tabular-nums">
                  до {formatStandupShortDate(item.due_date)}
                </Badge>
              ) : null}
              {item.status ? (
                <Badge tone="info">
                  {STANDUP_STATUS_OPTIONS.find((option) => option.value === item.status)?.label ?? item.status}
                </Badge>
              ) : null}
            </div>
            {showLocalDueTag && localDueHint ? (
              <Badge
                tone={isDueSoonOrOverdue(localDueHint.dueDate) ? "warning" : "info"}
                className="max-w-full whitespace-normal leading-snug tabular-nums"
              >
                {formatStandupLocalDueTag(localDueHint.dueDate, localDueHint.meetingDate)}
              </Badge>
            ) : null}
            <StandupTaskComment
              value={item.comment ?? ""}
              editable={false}
              label={commentLabel}
              onChange={() => undefined}
            />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={standupTaskCardClass(cardVariant)}>
      <div className="flex items-start gap-3">
        {cardIndex ? <span className={standupTaskIndexBadgeClass}>{cardIndex}</span> : null}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2 sm:gap-3">
            <StandupAdaptiveTextarea
              hideLabel
              label="Задача"
              placeholder="Research OAuth, ревью PR…"
              className="min-w-0 flex-1"
              value={item.task_title ?? ""}
              onChange={(task_title) => onChange({ task_title })}
            />
            {onRemove ? (
              <Button
                intent="delete"
                size="sm"
                className={standupRowActionButtonClass}
                confirmTitle="Убрать запись?"
                confirmDescription="Строка исчезнет из дейлика. Сохраните форму, чтобы зафиксировать."
                confirmLabel="Убрать"
                onClick={onRemove}
              >
                Убрать
              </Button>
            ) : null}
          </div>

          <div className={standupTaskMetaPanelClass}>
            <div className={standupTaskMetaGridClass}>
              <TextField
                aria-label="Jira"
                placeholder="Jira-ключ"
                value={item.jira_key ?? ""}
                className="min-w-0"
                inputClassName={cn("font-mono", standupFieldInputClass)}
                {...standupCompactField}
                onChange={(event) => {
                  const next = event.target.value;
                  const prevKey = normalizeStandupJiraKey(item.jira_key ?? "");
                  const nextKey = normalizeStandupJiraKey(next);
                  const patch: Partial<StandupWorkItem> = { jira_key: next };
                  if (prevKey && prevKey !== nextKey && manualTitle.toUpperCase() === prevKey) {
                    patch.task_title = "";
                  }
                  if (prevKey && prevKey !== nextKey) {
                    lastLookupKeyRef.current = null;
                  }
                  if (lookupError) setLookupError(null);
                  onChange(patch);
                }}
                onBlur={(event) => {
                  void runJiraLookup(event.target.value, item.task_title ?? "");
                }}
              />
              <DatePickerPopover
                label="Срок"
                value={item.due_date ?? ""}
                placeholder="не задан"
                reservePopoverSpace={false}
                className="min-w-0"
                triggerClassName={standupFieldTriggerClass}
                chevronClassName={standupFieldChevronClass}
                onChange={(value) => onChange({ due_date: value || null })}
              />
              <DropdownField
                aria-label="Статус"
                value={item.status ?? "in_progress"}
                options={STANDUP_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                triggerClassName={standupFieldTriggerClass}
                chevronClassName={standupFieldChevronClass}
                {...standupCompactField}
                onChange={(value) => onChange({ status: value as StandupWorkItem["status"] })}
              />
            </div>
          </div>

          {showLocalDueRow ? (
            <div className="flex flex-wrap items-center gap-2">
              {localDueLoading ? <p className="text-xs text-ink3">Ищем прошлый срок…</p> : null}
              {!localDueLoading && localDueHint ? (
                <Badge
                  tone={isDueSoonOrOverdue(localDueHint.dueDate) ? "warning" : "info"}
                  className="max-w-full whitespace-normal leading-snug tabular-nums"
                >
                  {formatStandupLocalDueTag(localDueHint.dueDate, localDueHint.meetingDate)}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {metaVisible ? (
            <div>
              {lookupBusy ? <p className="text-xs text-ink3">Загружаем задачу…</p> : null}
              {!lookupBusy && lookupError ? <p className="text-xs text-danger">{lookupError}</p> : null}
            </div>
          ) : null}

          <StandupTaskComment
            embedded
            value={item.comment ?? ""}
            editable
            label={commentLabel}
            onChange={(comment) => onChange({ comment })}
          />
        </div>
      </div>
    </li>
  );
}
