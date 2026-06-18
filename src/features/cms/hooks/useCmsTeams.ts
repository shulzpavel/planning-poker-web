import { useCallback, useEffect, useRef, useState } from "react";
import { cmsTeamsApi } from "../api/cmsClient";
import type { CmsPrincipal, CmsTeam } from "../api/cmsTypes";

function teamsFromPrincipal(principal: CmsPrincipal | null): CmsTeam[] {
  if (!principal) return [];
  const assigned = principal.teams ?? [];
  if (assigned.length > 0) return assigned;
  return (principal.team_ids ?? []).map((id) => ({
    id,
    slug: String(id),
    name: `Команда #${id}`,
    description: "",
    is_active: true,
    created_at: "",
    updated_at: "",
  }));
}

function mergeTeams(apiTeams: CmsTeam[], fallback: CmsTeam[]): CmsTeam[] {
  if (apiTeams.length > 0) return apiTeams;
  return fallback;
}

export function useCmsTeams(principal: CmsPrincipal | null) {
  const principalRef = useRef(principal);
  principalRef.current = principal;

  const [teams, setTeams] = useState<CmsTeam[]>(() => teamsFromPrincipal(principal));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<CmsTeam[]> => {
    const current = principalRef.current;
    if (!current) {
      setTeams([]);
      setError(null);
      return [];
    }
    const fallback = teamsFromPrincipal(current);
    setLoading(true);
    setError(null);
    try {
      const result = await cmsTeamsApi.list();
      const next = mergeTeams(result.items, fallback);
      setTeams(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить команды";
      setError(message);
      setTeams(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!principal) {
      setTeams([]);
      setError(null);
      return;
    }
    setTeams(teamsFromPrincipal(principal));
    void reload();
  }, [principal?.id, reload]);

  return { teams, loading, error, reload };
}
