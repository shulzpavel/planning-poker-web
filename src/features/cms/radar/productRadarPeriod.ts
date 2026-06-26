import { useEffect, useMemo, useState } from "react";
import type { ProductRadarAnalytics, ProductRadarAnalyticsPeriod, ProductRadarPeriodAnalytics } from "../api/cmsClient";
import { resolvePeriodAnalytics } from "./ProductRadarAnalytics";

export function resolveProductRadarInsightsAnalytics(
  analytics?: ProductRadarAnalytics | null,
): ProductRadarPeriodAnalytics | null {
  return resolvePeriodAnalytics(analytics, "all");
}

export function useProductRadarPeriod(analytics?: ProductRadarAnalytics | null) {
  const [period, setPeriod] = useState<ProductRadarAnalyticsPeriod>(analytics?.default_period ?? "month");

  useEffect(() => {
    if (analytics?.default_period) {
      setPeriod(analytics.default_period);
    }
  }, [analytics?.default_period]);

  const periodAnalytics = useMemo(
    () => resolvePeriodAnalytics(analytics, period),
    [analytics, period],
  );

  return { period, setPeriod, periodAnalytics };
}

export function productRadarTeamBlocking(periodAnalytics: ProductRadarPeriodAnalytics | null) {
  return periodAnalytics?.team_blocking ?? periodAnalytics?.chart_details?.team_blocking;
}
