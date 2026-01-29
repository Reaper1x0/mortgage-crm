import { useState, useEffect, useCallback } from "react";
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

interface UseDashboardAnalyticsReturn {
  data: DashboardAnalyticsData;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export const useDashboardAnalytics = (
  range: DashboardRange = "daily",
  startDate?: string,
  endDate?: string
): UseDashboardAnalyticsReturn => {
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
      // Fetch all endpoints concurrently
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
      // Reset data on error
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
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    retry: fetchData,
  };
};

