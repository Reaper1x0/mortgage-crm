import apiClient from "../api/apiClient";

export type DashboardRange = "daily" | "weekly" | "monthly";

export interface DashboardSummary {
  casesProcessedCount: number;
  avgProcessingTimeMinutes: number;
  manualEditsRatePercent: number;
  pendingReviewsCount: number;
  completedCasesCount: number;
}

export interface TrendBucket {
  bucket: string;
  casesProcessedCount: number;
}

export interface ValidationFailure {
  rule: string;
  count: number;
  percentage: number;
  severityCounts: {
    error: number;
    warning: number;
  };
  sampleMessages: string[];
  affectedFieldsCount: number;
  affectedFields: string[];
}

export interface ValidationFailuresData {
  topValidationFailures: ValidationFailure[];
  totalFailures: number;
  uniqueRules: number;
}

export interface WorkloadStatus {
  status: string;
  count: number;
}

export interface WorkloadBucket {
  bucket: string;
  statuses: WorkloadStatus[];
}

export interface WorkloadData {
  buckets: WorkloadBucket[];
  totals: {
    pending: number;
    completed: number;
  };
}

type DashboardResponse<T> = {
  message: string;
  success: boolean;
  data: T;
};

export const DashboardService = {
  getSummary: async (range: DashboardRange, startDate?: string, endDate?: string) => {
    const params: Record<string, string> = { range };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await apiClient.get<DashboardResponse<DashboardSummary>>(
      "/dashboard/summary",
      { params }
    );
    return response.data;
  },

  getTrends: async (range: DashboardRange, startDate?: string, endDate?: string) => {
    const params: Record<string, string> = { range };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await apiClient.get<DashboardResponse<TrendBucket[]>>(
      "/dashboard/trends",
      { params }
    );
    return response.data;
  },

  getValidationFailures: async (
    range: DashboardRange,
    startDate?: string,
    endDate?: string
  ) => {
    const params: Record<string, string> = { range };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await apiClient.get<DashboardResponse<ValidationFailuresData>>(
      "/dashboard/validation-failures",
      { params }
    );
    return response.data;
  },

  getWorkload: async (range: DashboardRange, startDate?: string, endDate?: string) => {
    const params: Record<string, string> = { range };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await apiClient.get<DashboardResponse<WorkloadData>>(
      "/dashboard/workload",
      { params }
    );
    return response.data;
  },
};

