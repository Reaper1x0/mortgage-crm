import { useState, useEffect, useCallback, useRef } from "react";
import {
  DashboardService,
  DashboardRange,
  DashboardSummary,
  TrendBucket,
  ValidationFailuresData,
  WorkloadData,
} from "../service/dashboardService";

export interface DashboardAnalyticsData {
  summary: DashboardSummary | null;
  trends: TrendBucket[];
  validationFailures: ValidationFailuresData | null;
  workload: WorkloadData | null;
}

const dataCache = new Map<string, { data: unknown; ts: number }>();
const inflight = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 60_000;

async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = dataCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return hit.data as T;
  }

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      dataCache.set(key, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

function useDashboardResource<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): { data: T | null; loading: boolean; error: Error | null; retry: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const retry = useCallback(() => {
    dataCache.delete(cacheKey);
    inflight.delete(cacheKey);
    setTick((n) => n + 1);
  }, [cacheKey]);

  useEffect(() => {
    let cancelled = false;

    const cached = dataCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setData(cached.data as T);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchWithCache(cacheKey, () => fetcherRef.current())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch dashboard data"));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, tick]);

  return { data, loading, error, retry };
}

/** Summary KPIs are overall (all-time) totals, so they are not range-scoped. */
export const useDashboardSummary = () =>
  useDashboardResource<DashboardSummary>(
    `summary:overall`,
    () => DashboardService.getSummary("daily").then((r) => r.data)
  );

export const useDashboardTrends = (range: DashboardRange = "daily") =>
  useDashboardResource<TrendBucket[]>(
    `trends:${range}`,
    () => DashboardService.getTrends(range).then((r) => r.data)
  );

export const useDashboardValidationFailures = (range: DashboardRange = "daily") =>
  useDashboardResource<ValidationFailuresData>(
    `validation-failures:${range}`,
    () => DashboardService.getValidationFailures(range).then((r) => r.data)
  );

export const useDashboardWorkload = (range: DashboardRange = "daily") =>
  useDashboardResource<WorkloadData>(
    `workload:${range}`,
    () => DashboardService.getWorkload(range).then((r) => r.data)
  );

/** @deprecated Prefer per-card hooks (useDashboardSummary, useDashboardTrends, etc.) */
export const useDashboardAnalytics = (
  range: DashboardRange = "daily",
  startDate?: string,
  endDate?: string
): {
  data: DashboardAnalyticsData;
  loading: boolean;
  error: Error | null;
  retry: () => void;
} => {
  const [data, setData] = useState<DashboardAnalyticsData>({
    summary: null,
    trends: [],
    validationFailures: null,
    workload: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, trendsRes, failuresRes, workloadRes] = await Promise.all([
        DashboardService.getSummary(range, startDate, endDate),
        DashboardService.getTrends(range, startDate, endDate),
        DashboardService.getValidationFailures(range, startDate, endDate),
        DashboardService.getWorkload(range, startDate, endDate),
      ]);

      setData({
        summary: summaryRes.data,
        trends: trendsRes.data,
        validationFailures: failuresRes.data,
        workload: workloadRes.data,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch dashboard data"));
      setData({
        summary: null,
        trends: [],
        validationFailures: null,
        workload: null,
      });
    } finally {
      setLoading(false);
    }
  }, [range, startDate, endDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, retry: fetchData };
};
