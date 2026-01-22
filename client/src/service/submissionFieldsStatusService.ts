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
};

export const SubmissionFieldStatusService = {
  getSubmissionFieldStatus: async (submissionId: string) => {
    if (!submissionId) return;

    const response = await apiClient.get<SubmissionFieldStatusResponse>(
      `/submissions/${submissionId}/field-status`,
      { params: { recompute: 1 } }
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
