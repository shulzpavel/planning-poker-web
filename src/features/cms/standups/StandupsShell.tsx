import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AiGenerationProgress,
  BackButton,
  BackLink,
  Badge,
  Button,
  DatePickerPopover,
  DropdownField,
  EmptyState,
  ListSkeleton,
  Spinner,
  StickyActionFooter,
  Surface,
  TextField,
  cn,
  useToast,
} from "../../../design-system";
import {
  cmsStandupsApi,
  type StandupAiSummary,
  type StandupParticipant,
  type StandupPayload,
  type StandupRecord,
  type StandupRole,
  type StandupRosterMember,
  type StandupTrack,
  type StandupWorkItem,
} from "../api/cmsClient";
import { pollAiJob } from "../../../shared/lib/pollAiJob";
import type { CmsPrincipal } from "../api/cmsTypes";
import { InlineError, SectionHeader, Skeleton } from "../components/CmsPrimitives";
import { filterFieldWidth } from "../components/cmsFilterLayout";
import { CmsTeamListPage } from "../components/CmsTeamListPage";
import { TeamBadge } from "../components/TeamBadge";
import { teamFilterParams } from "../components/TeamFilter";
import {
  TeamSelect,
  needsTeamPicker,
  teamPickerRequired,
  useTeamIdState,
} from "../components/TeamSelect";
import { useCmsTeams } from "../hooks/useCmsTeams";
import { useCmsList } from "../hooks/useCmsList";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { StandupParticipantSection } from "./StandupParticipantSection";
import { StandupAiSummaryView } from "./StandupAiSummaryView";
import { StandupsListView } from "./StandupsListView";
import { isStandupAnalyzeResult } from "./standupAi";
import {
  STANDUP_ROLE_META,
  collectBlockerItems,
  countStandupBlockers,
  emptyWorkItem,
  formatStandupDate,
  newLocalId,
  sanitizeStandupPayload,
  standupPayloadSaveError,
  defaultStandupsListFromDate,
  defaultStandupsListToDate,
  todayIsoDate,
} from "./standupsLogic";
import {
  standupCompactField,
  standupFieldChevronClass,
  standupFieldInputClass,
  standupFieldTriggerClass,
  standupHeaderActionButtonClass,
  standupRosterGridClass,
  standupRowActionButtonClass,
} from "./standupUi";

interface StandupsShellProps {
  principal: CmsPrincipal;
  canManage: boolean;
}

export default function StandupsShell({ principal, canManage }: StandupsShellProps) {
  return (
    <Routes>
      <Route index element={<StandupsListPage principal={principal} canManage={canManage} />} />
      <Route path="new" element={<StandupCreatePage principal={principal} />} />
      <Route path="rosters" element={<StandupRosterPage principal={principal} />} />
      <Route path=":standupId" element={<StandupDetailPage canManage={canManage} />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

function StandupsListPage({ principal, canManage }: { principal: CmsPrincipal; canManage: boolean }) {
  const navigate = useNavigate();
  const [teamFilter, setTeamFilter] = useState("");
  const [fromDate, setFromDate] = useState(defaultStandupsListFromDate);
  const [toDate, setToDate] = useState(defaultStandupsListToDate);

  const listParams = useMemo(
    () => ({
      ...teamFilterParams(teamFilter),
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [teamFilter, fromDate, toDate],
  );

  const list = useCmsList<StandupRecord>("/standups", listParams, { scrollKey: "cms-standups" });

  const blockerTotal = useMemo(
    () => list.items.reduce((sum, item) => sum + countStandupBlockers(item.payload), 0),
    [list.items],
  );

  return (
    <CmsTeamListPage
      principal={principal}
      className="space-y-5"
      title="Дейлики"
      description="Краткая запись standup по команде: что сделано, что в работе и что блокирует."
      mobileDescription="Список дейликов за выбранный период."
      mobileAction={
        canManage ? (
          <div className="flex items-center gap-2">
            <Button intent="neutral" size="sm" className={standupHeaderActionButtonClass} onClick={() => navigate("rosters")}>
              Ростер
            </Button>
            <Button intent="create" size="sm" className={standupHeaderActionButtonClass} onClick={() => navigate("new")}>
              Сегодня
            </Button>
          </div>
        ) : undefined
      }
      headerActions={
        canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button intent="neutral" size="sm" className={standupHeaderActionButtonClass} onClick={() => navigate("rosters")}>
              Ростер
            </Button>
            <Button intent="create" size="sm" className={standupHeaderActionButtonClass} onClick={() => navigate("new")}>
              Новый дейлик
            </Button>
          </div>
        ) : undefined
      }
      teamFilter={teamFilter}
      onTeamFilterChange={setTeamFilter}
      onRefresh={() => void list.reload()}
      refreshLoading={list.loading}
      onReset={() => {
        setFromDate(defaultStandupsListFromDate());
        setToDate(defaultStandupsListToDate());
      }}
      error={list.error}
      helpCallout={{
        title: "Коротко",
        children: canManage ? (
          <>
            <p>Ростер — постоянный список участников standup для команды; из него подставляются имена при создании записи.</p>
            <p>На каждую дату и команду — один дейлик: что сделано, над чем работает и что мешает.</p>
            <p>Черновик виден только редакторам. Опубликуйте, когда запись готова — после этого её увидит команда.</p>
          </>
        ) : (
          <p>Здесь отображаются опубликованные дейлики ваших команд. Черновики и незавершённые записи скрыты.</p>
        ),
      }}
      mobileStats={[
        { label: "Записей", value: String(list.items.length) },
        { label: "Блокеров", value: String(blockerTotal), tone: blockerTotal > 0 ? "danger" : "neutral" },
      ]}
      toolbar={
        <>
          <DatePickerPopover
            label="С"
            className={filterFieldWidth("date")}
            value={fromDate}
            placeholder="начало"
            reservePopoverSpace={false}
            onChange={setFromDate}
          />
          <DatePickerPopover
            label="По"
            className={filterFieldWidth("date")}
            value={toDate}
            placeholder="конец"
            reservePopoverSpace={false}
            onChange={setToDate}
          />
        </>
      }
    >
      {list.loading && list.items.length === 0 ? <ListSkeleton rows={4} /> : null}
      <StandupsListView
        items={list.items}
        teamFilter={teamFilter}
        canManage={canManage}
        loading={list.loading}
        loadingMore={list.loadingMore}
        hasMore={list.hasMore}
        reachedCap={list.reachedCap}
        loadedCount={list.items.length}
        total={list.total}
        error={list.error}
        onMore={() => void list.loadMore()}
      />
    </CmsTeamListPage>
  );
}

function StandupCreatePage({ principal }: { principal: CmsPrincipal }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { teams, loading: teamsLoading } = useCmsTeams(principal);
  const [teamId, setTeamId] = useTeamIdState(teams);
  const [meetingDate, setMeetingDate] = useState(todayIsoDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createStandup() {
    if (teamPickerRequired(teams, principal.is_superuser, principal.team_ids ?? []) && teamId === "") {
      setError("Выберите команду.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const record = await cmsStandupsApi.create({
        team_id: teamId === "" ? null : Number(teamId),
        meeting_date: meetingDate,
      });
      toast.success("Дейлик создан.");
      navigate(`../${record.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать дейлик.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <BackLink to=".." label="К списку" />
      <SectionHeader title="Новый дейлик" description="Один дейлик на команду в день. Участники подставятся из ростера." />
      {error ? <InlineError text={error} /> : null}
      <Surface className="space-y-3 p-4 sm:max-w-lg">
        {needsTeamPicker(teams, principal.is_superuser, principal.team_ids ?? []) ? (
          <TeamSelect teams={teams} loading={teamsLoading} value={teamId} onChange={setTeamId} required />
        ) : null}
        <DatePickerPopover
          fieldLabel="Дата встречи"
          value={meetingDate}
          reservePopoverSpace={false}
          onChange={setMeetingDate}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <Button intent="create" loading={saving} onClick={() => void createStandup()}>
            Создать
          </Button>
          <Button intent="neutral" onClick={() => navigate("rosters")}>
            Ростер
          </Button>
        </div>
      </Surface>
    </section>
  );
}

function StandupRosterPage({ principal }: { principal: CmsPrincipal }) {
  const toast = useToast();
  const { teams, loading: teamsLoading } = useCmsTeams(principal);
  const [teamId, setTeamId] = useTeamIdState(teams);
  const [members, setMembers] = useState<StandupRosterMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId === "") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void cmsStandupsApi
      .getRoster(Number(teamId))
      .then((roster) => {
        if (!cancelled) setMembers(roster.members ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Не удалось загрузить ростер.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  function updateMember(index: number, patch: Partial<StandupRosterMember>) {
    setMembers((current) => current.map((member, idx) => (idx === index ? { ...member, ...patch } : member)));
  }

  return (
    <section className="space-y-4">
      <BackLink to=".." label="К списку" />
      <SectionHeader title="Ростер команды" description="Имена и роли для ежедневных записей." />
      {error ? <InlineError text={error} /> : null}
      <Surface className="space-y-3 p-4">
        {needsTeamPicker(teams, principal.is_superuser, principal.team_ids ?? []) ? (
          <TeamSelect teams={teams} loading={teamsLoading} value={teamId} onChange={setTeamId} required />
        ) : null}
        {loading ? <Spinner /> : null}
        {!loading
          ? members.map((member, index) => (
              <div key={member.id} className={standupRosterGridClass}>
                <TextField
                  label="Имя"
                  value={member.name}
                  inputClassName={standupFieldInputClass}
                  {...standupCompactField}
                  onChange={(event) => updateMember(index, { name: event.target.value })}
                />
                <DropdownField
                  label="Роль"
                  value={member.role}
                  options={Object.entries(STANDUP_ROLE_META).map(([value, meta]) => ({ value, label: meta.label }))}
                  triggerClassName={standupFieldTriggerClass}
                  chevronClassName={standupFieldChevronClass}
                  {...standupCompactField}
                  onChange={(value) => updateMember(index, { role: value as StandupRole })}
                />
                <div className="space-y-1.5">
                  <span className="block text-sm font-semibold text-ink3 sm:text-xs">В ростере</span>
                  <label
                    className={cn(
                      standupFieldTriggerClass,
                      "flex cursor-pointer items-center justify-center rounded-lg border border-line bg-surface",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={member.active}
                      className="h-4 w-4 rounded border-line text-blue focus:ring-2 focus:ring-blue/20"
                      onChange={(event) => updateMember(index, { active: event.target.checked })}
                    />
                  </label>
                </div>
                <div className="space-y-1.5">
                  <span className="block text-sm font-semibold leading-none text-transparent sm:text-xs" aria-hidden="true">
                    —
                  </span>
                  <Button
                    intent="delete"
                    size="sm"
                    className={standupRowActionButtonClass}
                    confirmTitle="Убрать из ростера?"
                    confirmDescription="Участник исчезнет из списка. Сохраните ростер, чтобы зафиксировать."
                    confirmLabel="Убрать"
                    onClick={() => setMembers((current) => current.filter((_, idx) => idx !== index))}
                  >
                    Убрать
                  </Button>
                </div>
              </div>
            ))
          : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button
            intent="add"
            size="sm"
            className={standupHeaderActionButtonClass}
            onClick={() => setMembers((current) => [...current, { id: newLocalId("member"), name: "", role: "other", active: true }])}
          >
            Добавить участника
          </Button>
          <Button
            intent="save"
            loading={saving}
            onClick={() => {
              if (teamId === "") {
                setError("Выберите команду.");
                return;
              }
              setSaving(true);
              setError(null);
              void cmsStandupsApi
                .saveRoster(
                  Number(teamId),
                  members.filter((member) => member.name.trim()),
                )
                .then((roster) => {
                  setMembers(roster.members);
                  toast.success("Ростер сохранён.");
                })
                .catch((err) => setError(err instanceof Error ? err.message : "Не удалось сохранить ростер."))
                .finally(() => setSaving(false));
            }}
          >
            Сохранить
          </Button>
        </div>
      </Surface>
    </section>
  );
}

function StandupDetailPage({ canManage }: { canManage: boolean }) {
  const { standupId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const numericId = Number(standupId);
  const [record, setRecord] = useState<StandupRecord | null>(null);
  const [payload, setPayload] = useState<StandupPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<StandupAiSummary | null>(null);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const dirty = useMemo(() => JSON.stringify(payload) !== JSON.stringify(record?.payload ?? null), [payload, record]);
  const unsavedGuard = useUnsavedChangesGuard({
    when: dirty && canManage,
    title: "Выйти без сохранения?",
    description: "В дейлике есть несохранённые изменения. Если уйти сейчас, они пропадут.",
  });

  const reload = useCallback(async () => {
    if (!Number.isFinite(numericId)) return;
    setLoading(true);
    setError(null);
    try {
      const item = await cmsStandupsApi.get(numericId);
      setRecord(item);
      setPayload(item.payload);
      setAiSummary(item.ai_summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить дейлик.");
    } finally {
      setLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const blockers = useMemo(() => (payload ? collectBlockerItems(payload) : []), [payload]);
  const editable = canManage;

  function updateParticipant(participantId: string, patch: Partial<StandupParticipant>) {
    setPayload((current) =>
      current
        ? {
            ...current,
            participants: current.participants.map((participant) =>
              participant.id === participantId ? { ...participant, ...patch } : participant,
            ),
          }
        : current,
    );
  }

  function updateItem(participantId: string, itemId: string, patch: Partial<StandupWorkItem>) {
    setPayload((current) =>
      current
        ? {
            ...current,
            participants: current.participants.map((participant) =>
              participant.id === participantId
                ? {
                    ...participant,
                    items: participant.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
                  }
                : participant,
            ),
          }
        : current,
    );
  }

  function addItem(participantId: string, track: StandupTrack) {
    setPayload((current) =>
      current
        ? {
            ...current,
            participants: current.participants.map((participant) =>
              participant.id === participantId
                ? { ...participant, items: [...participant.items, emptyWorkItem(track)] }
                : participant,
            ),
          }
        : current,
    );
  }

  function removeItem(participantId: string, itemId: string) {
    setPayload((current) =>
      current
        ? {
            ...current,
            participants: current.participants.map((participant) =>
              participant.id === participantId
                ? { ...participant, items: participant.items.filter((item) => item.id !== itemId) }
                : participant,
            ),
          }
        : current,
    );
  }

  async function waitForStandupAi(standupId: number) {
    setAiProgress("Запускаем AI-дайджест...");
    try {
      const started = await cmsStandupsApi.startAnalyze(standupId);
      if (isStandupAnalyzeResult(started)) {
        setAiSummary(started.ai_summary);
        setRecord((current) => (current ? { ...current, ai_summary: started.ai_summary } : current));
        toast.success(started.cached ? "AI-дайджест уже актуален" : "AI-дайджест готов");
        return;
      }

      const jobId = started.job_id;
      if (!jobId) {
        throw new Error("AI job was not started");
      }

      const result = await pollAiJob(
        () => cmsStandupsApi.getAnalyzeJob(standupId, jobId),
        {
          intervalMs: 1200,
          onProgress: (job) => setAiProgress(job.message ?? "AI готовит дайджест..."),
        },
      );
      setAiSummary(result.ai_summary);
      setRecord((current) => (current ? { ...current, ai_summary: result.ai_summary } : current));
      toast.success(result.cached ? "AI-дайджест уже актуален" : "AI-дайджест готов и отправлен в Telegram");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI-дайджест не выполнен", { title: "Ошибка" });
    } finally {
      setAiProgress(null);
    }
  }

  async function saveStandup(publish = false) {
    if (!record || !payload) return;
    const normalized = sanitizeStandupPayload(payload);
    const validationError = standupPayloadSaveError(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await cmsStandupsApi.update(record.id, {
        payload: normalized,
        status: publish ? "published" : undefined,
      });
      setRecord(updated);
      setPayload(updated.payload);
      toast.success(publish ? "Опубликовано." : "Сохранено.");
      if (publish && updated.status === "published") {
        void waitForStandupAi(updated.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить.");
    } finally {
      setSaving(false);
    }
  }

  async function syncRosterFromTeam() {
    if (!record) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await cmsStandupsApi.syncRoster(record.id);
      setRecord(updated);
      setPayload(updated.payload);
      toast.success("Участники из ростера добавлены.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить из ростера.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStandup() {
    if (!record) return;
    setSaving(true);
    try {
      await cmsStandupsApi.delete(record.id);
      toast.success("Дейлик удалён.");
      unsavedGuard.runWithoutPrompt(() => navigate(".."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить.");
    } finally {
      setSaving(false);
    }
  }

  if (!Number.isFinite(numericId)) return <Navigate to=".." replace />;
  if (loading) return <Skeleton height="320px" />;
  if (!record || !payload) {
    return <EmptyState title="Дейлик не найден" action={<BackLink to=".." label="Назад" />} />;
  }

  return (
    <section className="space-y-4 pb-24">
      <BackButton
        label="К списку"
        size="sm"
        onClick={() => unsavedGuard.confirmIfNeeded(() => navigate(".."))}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          title={formatStandupDate(record.meeting_date)}
          description={record.team?.name ?? "Команда"}
        />
        <div className="flex flex-wrap items-center gap-2">
          <TeamBadge teamId={record.team_id} team={record.team} />
          <Badge tone={record.status === "published" ? "success" : "warning"}>
            {record.status === "published" ? "Опубликован" : "Черновик"}
          </Badge>
          {editable && record.status !== "published" ? (
            <Button intent="neutral" size="sm" loading={saving} onClick={() => void syncRosterFromTeam()}>
              Обновить из ростера
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <InlineError text={error} /> : null}

      {dirty && editable ? (
        <Alert tone="warning" title="Есть несохранённые изменения">
          Сохраните или опубликуйте дейлик, прежде чем уходить со страницы.
        </Alert>
      ) : null}

      {blockers.length > 0 ? (
        <Alert tone="danger" title={`Блокеры: ${blockers.length}`}>
          <ul className="mt-1 space-y-1 text-sm">
            {blockers.map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.participantName}</span> — {item.task_title}
                {item.comment ? `: ${item.comment}` : ""}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {record.status === "published" && (aiSummary || aiProgress) ? (
        aiSummary ? (
          <StandupAiSummaryView summary={aiSummary} loading={Boolean(aiProgress)} progress={aiProgress} />
        ) : (
          <AiGenerationProgress message={aiProgress ?? "Готовим AI-дайджест..."} />
        )
      ) : null}

      <Surface className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
        <TextField
          label="Ведущий"
          value={payload.facilitator ?? ""}
          disabled={!editable}
          {...standupCompactField}
          onChange={(event) => setPayload({ ...payload, facilitator: event.target.value })}
        />
        <TextField
          label="Заметки"
          value={payload.notes ?? ""}
          disabled={!editable}
          {...standupCompactField}
          onChange={(event) => setPayload({ ...payload, notes: event.target.value })}
        />
      </Surface>

      <div className="space-y-3">
        {payload.participants.map((participant, index) => (
          <StandupParticipantSection
            key={participant.id}
            participant={participant}
            editable={editable}
            defaultOpen={index === 0}
            teamId={record.team_id}
            meetingDate={record.meeting_date}
            onParticipantChange={(patch) => updateParticipant(participant.id, patch)}
            onItemChange={(itemId, patch) => updateItem(participant.id, itemId, patch)}
            onItemAdd={(track) => addItem(participant.id, track)}
            onItemRemove={(itemId) => removeItem(participant.id, itemId)}
          />
        ))}
      </div>

      {editable ? (
        <StickyActionFooter>
          <Button intent="reset" disabled={!dirty || saving} onClick={() => setPayload(record.payload)}>
            Сбросить
          </Button>
          <Button intent="save" loading={saving} disabled={!dirty} onClick={() => void saveStandup(false)}>
            Сохранить
          </Button>
          <Button intent="success" loading={saving} onClick={() => void saveStandup(true)}>
            Опубликовать
          </Button>
          <Button intent="delete" loading={saving} onClick={() => void deleteStandup()}>
            Удалить
          </Button>
        </StickyActionFooter>
      ) : null}
      {unsavedGuard.dialog}
    </section>
  );
}
