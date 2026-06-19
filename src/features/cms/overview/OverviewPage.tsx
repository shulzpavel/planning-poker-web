import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../design-system";
import { cmsFetch } from "../api/cmsClient";
import type { CmsPrincipal, Overview } from "../api/cmsTypes";
import { TeamFilter, teamFilterParams } from "../components/TeamFilter";
import { useCmsTeams } from "../hooks/useCmsTeams";
import { HelpCallout, InlineError, SectionHeader, Skeleton, Toolbar } from "../components/CmsPrimitives";
import { formatNumber } from "../../../shared/lib/format";

interface OverviewTile {
  label: string;
  value: number;
  caption: string;
  to: string;
  hint: string;
}

export default function OverviewPage({ principal }: { principal: CmsPrincipal }) {
  const { teams } = useCmsTeams(principal);
  const [teamFilter, setTeamFilter] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadOverview = useCallback(() => {
    setError(null);
    const query = new URLSearchParams();
    const teamParams = teamFilterParams(teamFilter);
    if (teamParams.team_id != null) query.set("team_id", String(teamParams.team_id));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    cmsFetch<Overview>(`/overview${suffix}`)
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить сводку"));
  }, [teamFilter]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Сводка"
        description="KPI по четырём модулям delivery hub: калькулятор, отчёты месяца, planning sessions и ретро — плюс участники и активные invite-ссылки."
        actions={
          <>
            <Button variant="primary" size="sm" onClick={() => navigate("/cms/scope")}>
              Открыть отчёты
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate("/cms/planner")}>
              Калькулятор
            </Button>
            <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={loadOverview}>
              Обновить
            </Button>
          </>
        }
      />
      <HelpCallout title="Что здесь">
        <p>
          Карточки идут в порядке типичного контура: калькулятор → отчёт месяца → planning poker → ретро.
          Клик открывает соответствующий раздел CMS.
        </p>
        <p>
          Цифры обновляются вручную. Удалённые из истории сессии не учитываются. Супер-админ может сузить
          сводку фильтром «Команда» — как в списках planner / scope / sessions / retro.
        </p>
      </HelpCallout>
      {principal.is_superuser ? (
        <Toolbar>
          <TeamFilter teams={teams} value={teamFilter} onChange={setTeamFilter} />
        </Toolbar>
      ) : null}
      {error ? <InlineError text={error} /> : null}
      {overview ? <OverviewCards overview={overview} onSelect={(to) => navigate(to)} /> : <Skeleton height="h-24" />}
    </section>
  );
}

function OverviewCards({
  overview,
  onSelect,
}: {
  overview: Overview;
  onSelect: (to: string) => void;
}) {
  const tiles: OverviewTile[] = [
    {
      label: "Калькулятор",
      value: overview.total_sprint_plans,
      caption: "сохранённых расчётов SP",
      to: "/cms/planner",
      hint: "Открыть калькулятор capacity",
    },
    {
      label: "Отчёты",
      value: overview.total_scope_boards ?? 0,
      caption: "досок scope / месяца",
      to: "/cms/scope",
      hint: "Открыть отчёты месяца и релиза",
    },
    {
      label: "Сессии",
      value: overview.total_sessions,
      caption: `${overview.active_sessions} идёт · ${overview.total_tasks} задач`,
      to: "/cms/sessions",
      hint: "Открыть planning sessions",
    },
    {
      label: "Ретро",
      value: overview.total_retros,
      caption: `${overview.live_retros} идёт сейчас`,
      to: "/cms/retro",
      hint: "Открыть ретроспективы",
    },
    {
      label: "Участники",
      value: overview.total_users,
      caption: `${overview.web_users} с веба`,
      to: "/cms/users",
      hint: "Открыть справочник участников",
    },
    {
      label: "Invite-ссылки",
      value: overview.active_web_tokens,
      caption: `${overview.total_web_tokens} всего · голоса ${formatNumber(overview.total_votes)}`,
      to: "/cms/sessions",
      hint: "Перейти к сессиям с invite-ссылками",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <button
          key={tile.label}
          type="button"
          onClick={() => onSelect(tile.to)}
          className="rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-blue/60 hover:bg-line2/40 focus:outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/40"
          aria-label={tile.hint}
        >
          <p className="text-xs font-semibold text-ink3">{tile.label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatNumber(tile.value)}</p>
          <p className="mt-1 break-words text-xs text-ink3">{tile.caption}</p>
        </button>
      ))}
    </section>
  );
}
