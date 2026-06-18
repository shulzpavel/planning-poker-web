import { useCallback, useEffect, useRef, useState } from "react";
import { cmsTeamsApi } from "../api/cmsClient";
import type { CmsPrincipal, CmsTeam } from "../api/cmsTypes";

export function useCmsTeams(principal: CmsPrincipal | null) {
  const principalRef = useRef(principal);
  principalRef.current = principal;

  const [teams, setTeams] = useState<CmsTeam[]>(principal?.teams ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<CmsTeam[]> => {
    const current = principalRef.current;
    if (!current) {
      setTeams([]);
      setError(null);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await cmsTeamsApi.list();
      setTeams(result.items);
      return result.items;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить команды";
      setError(message);
      const fallback = current.teams ?? [];
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
    setTeams(principal.teams ?? []);
    void reload();
  }, [principal?.id, reload]);

  return { teams, loading, error, reload };
}
