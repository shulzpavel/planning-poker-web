import { Badge, Button, CheckboxField } from "../../../design-system";
import { cn } from "../../../design-system/utils";
import { CmsSection } from "../components/CmsSection";
import { standupHeaderActionButtonClass, standupTaskListClass } from "./standupUi";
import type { StandupParticipant, StandupTrack, StandupWorkItem } from "../api/cmsClient";
import { STANDUP_ROLE_META, STANDUP_TRACK_META } from "./standupsLogic";
import { StandupTaskRow } from "./StandupTaskRow";

const TRACKS: StandupTrack[] = ["yesterday", "today", "blocker"];

interface StandupParticipantSectionProps {
  participant: StandupParticipant;
  editable: boolean;
  defaultOpen?: boolean;
  teamId: number | null;
  meetingDate: string;
  onParticipantChange: (patch: Partial<StandupParticipant>) => void;
  onItemChange: (itemId: string, patch: Partial<StandupWorkItem>) => void;
  onItemAdd: (track: StandupTrack) => void;
  onItemRemove: (itemId: string) => void;
}

export function StandupParticipantSection({
  participant,
  editable,
  defaultOpen = false,
  teamId,
  meetingDate,
  onParticipantChange,
  onItemChange,
  onItemAdd,
  onItemRemove,
}: StandupParticipantSectionProps) {
  const itemCount = participant.items.length;

  return (
    <CmsSection
      defaultOpen={defaultOpen}
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{participant.name}</span>
          <Badge tone={STANDUP_ROLE_META[participant.role].tone}>{STANDUP_ROLE_META[participant.role].label}</Badge>
          {!participant.present ? <Badge tone="neutral">не был</Badge> : null}
        </span>
      }
      subtitle={itemCount > 0 ? `${itemCount} записей` : "Пока пусто"}
      trailing={
        editable ? (
          <CheckboxField
            label="На созвоне"
            checked={participant.present}
            className="min-h-0 py-0"
            onChange={(event) => onParticipantChange({ present: event.target.checked })}
            onClick={(event) => event.stopPropagation()}
          />
        ) : undefined
      }
    >
      <div className="divide-y divide-line">
        {TRACKS.map((track) => {
          const rows = participant.items.filter((item) => item.track === track);
          const meta = STANDUP_TRACK_META[track];
          return (
            <section
              key={track}
              className={cn(
                "space-y-3 py-5 first:pt-0 last:pb-0",
                track === "blocker" && rows.length > 0 && "rounded-xl bg-red/5 px-3 -mx-1 sm:px-4 sm:-mx-2",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-ink">{meta.description}</h4>
                </div>
                {editable ? (
                  <Button
                    intent="add"
                    size="sm"
                    className={standupHeaderActionButtonClass}
                    onClick={() => onItemAdd(track)}
                  >
                    Добавить
                  </Button>
                ) : null}
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-ink3">—</p>
              ) : (
                <ul className={standupTaskListClass}>
                  {rows.map((item, index) => (
                    <StandupTaskRow
                      key={item.id}
                      item={item}
                      track={track}
                      editable={editable}
                      teamId={teamId}
                      meetingDate={meetingDate}
                      cardIndex={rows.length > 1 ? index + 1 : undefined}
                      onChange={(patch) => onItemChange(item.id, patch)}
                      onRemove={editable ? () => onItemRemove(item.id) : undefined}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </CmsSection>
  );
}
