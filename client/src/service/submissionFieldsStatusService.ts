import apiClient from "../api/apiClient";

type FieldValue = { raw: any; normalized?: any };

export type SubmissionFieldStatusResponse = {
  message: string;
  success: boolean;
  submission: any;
  eligibility: {
    eligible: boolean;
    required_total: number;
    filled_required: number;
    missing_required_keys: string[];
    needs_review_keys: string[];
    updatedAt?: string;
  };
  submission_fields: any[];
  master_fields: any[];
  // Server-side filtered results
  filtered_rows?: Array<{
    masterField: any;
    submissionField: any;
    current: any;
    isManual: boolean;
    confidence?: "high" | "medium" | "low";
    conflictsCount: number;
    isMissing: boolean;
    isReview: boolean;
    isDone: boolean;
    hasValidationErrors: boolean;
  }>;
  counts?: {
    reqMissing: number;
    reqReview: number;
    optMissing: number;
    optReview: number;
    focus: number;
    extracted: number;
  };
  // Audit trail data grouped by field_key
  audit_trail?: Record<string, Array<{
    _id: string;
    user_id: {
      _id: string;
      fullName?: string;
      email?: string;
      username?: string;
    };
    action: string;
    timestamp: string;
    field_key: string;
    field_source?: string;
  }>>;
};

export const SubmissionFieldStatusService = {
  getSubmissionFieldStatus: async (
    submissionId: string,
    options?: {
      filter?: "focus" | "all" | "req_missing" | "req_review" | "opt_missing" | "opt_review" | "done" | "extracted";
      search?: string;
      recompute?: boolean;
    }
  ) => {
    if (!submissionId) return;

    const params: Record<string, any> = {
      recompute: options?.recompute !== false ? 1 : 0,
    };

    if (options?.filter) {
      params.filter = options.filter;
    }

    if (options?.search) {
      params.search = options.search;
    }

    const response = await apiClient.get<SubmissionFieldStatusResponse>(
      `/submissions/${submissionId}/field-status`,
      { params }
    );

    // Your backend returns { success, message, data: {...} }
    return response.data;
  },

  patchSubmissionFieldStatus: async (
    submissionId: string,
    payload: {
      set?: Array<{ key: string; value: FieldValue; notes?: string }>;
      review?: Array<{ key: string; is_reviewed: true }>;
      clear_manual?: string[];
    }
  ) => {
    if (!submissionId) return;

    const response = await apiClient.patch(
      `/submissions/${submissionId}/field-status`,
      payload
    );

    return response.data;
  },
};
