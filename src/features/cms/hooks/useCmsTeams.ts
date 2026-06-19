import { useCallback, useEffect, useRef, useState } from "react";
import { cmsTeamsApi } from "../api/cmsClient";
import type { CmsPrincipal, CmsTeam } from "../api/cmsTypes";

const TEAMS_CACHE_TTL_MS = 60_000;

type TeamsCacheEntry = {
  principalId: string;
  teams: CmsTeam[];
  fetchedAt: number;
};

let sharedTeamsCache: TeamsCacheEntry | null = null;
let inflightTeamsRequest: Promise<CmsTeam[]> | null = null;

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

function principalCacheKey(principal: CmsPrincipal): string {
  return String(principal.id ?? principal.username ?? "unknown");
}

async function fetchTeamsForPrincipal(principal: CmsPrincipal): Promise<CmsTeam[]> {
  const cacheKey = principalCacheKey(principal);
  const now = Date.now();
  if (
    sharedTeamsCache &&
    sharedTeamsCache.principalId === cacheKey &&
    now - sharedTeamsCache.fetchedAt < TEAMS_CACHE_TTL_MS
  ) {
    return sharedTeamsCache.teams;
  }

  if (inflightTeamsRequest) {
    return inflightTeamsRequest;
  }

  const fallback = teamsFromPrincipal(principal);
  inflightTeamsRequest = cmsTeamsApi
    .list()
    .then((result) => {
      const next = mergeTeams(result.items, fallback);
      sharedTeamsCache = { principalId: cacheKey, teams: next, fetchedAt: Date.now() };
      return next;
    })
    .catch((err) => {
      sharedTeamsCache = { principalId: cacheKey, teams: fallback, fetchedAt: Date.now() };
      throw err;
    })
    .finally(() => {
      inflightTeamsRequest = null;
    });

  return inflightTeamsRequest;
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
      sharedTeamsCache = null;
      const next = await fetchTeamsForPrincipal(current);
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
    const fallback = teamsFromPrincipal(principal);
    const cacheKey = principalCacheKey(principal);
    const cached =
      sharedTeamsCache &&
      sharedTeamsCache.principalId === cacheKey &&
      Date.now() - sharedTeamsCache.fetchedAt < TEAMS_CACHE_TTL_MS
        ? sharedTeamsCache.teams
        : null;
    setTeams(cached ?? fallback);
    if (cached) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchTeamsForPrincipal(principal)
      .then((next) => {
        if (!cancelled) setTeams(next);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Не удалось загрузить команды";
        setError(message);
        setTeams(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [principal?.id, reload]);

  return { teams, loading, error, reload };
}
