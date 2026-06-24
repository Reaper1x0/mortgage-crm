import apiClient from "../api/apiClient";
import type {
  GeneratedDocument,
  Submission,
  SubmissionIdentitySlice,
  SubmissionSummary,
} from "../types/extraction.types";

type SubmissionResponse = {
  message: string;
  success: boolean;
  submission: Submission;
};

type SubmissionSummaryResponse = {
  message: string;
  success: boolean;
  summary: SubmissionSummary;
};

type SubmissionIdentityResponse = {
  message: string;
  success: boolean;
} & SubmissionIdentitySlice;

type GeneratedDocumentsResponse = {
  message: string;
  success: boolean;
  submissionId: string;
  generated_documents: GeneratedDocument[];
};

export const SubmissionService = {
  getAllSubmissions: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const response = await apiClient.get("/submissions", { params });
    return response.data;
  },
  /** Full submission — use for assistant, admin, or detail views only. */
  getSubmissionById: async (id: string | undefined) => {
    if (!id) return;
    const response = await apiClient.get<SubmissionResponse>(
      `/submissions/${id}`
    );
    return response.data;
  },
  getSummary: async (id: string | undefined) => {
    if (!id) return;
    const response = await apiClient.get<SubmissionSummaryResponse>(
      `/submissions/${id}/summary`
    );
    return response.data;
  },
  getIdentity: async (id: string | undefined) => {
    if (!id) return;
    const response = await apiClient.get<SubmissionIdentityResponse>(
      `/submissions/${id}/identity`
    );
    return response.data;
  },
  listGeneratedDocuments: async (id: string | undefined) => {
    if (!id) return;
    const response = await apiClient.get<GeneratedDocumentsResponse>(
      `/submissions/${id}/generated`
    );
    return response.data;
  },
  createSubmission: async (data: Record<string, any>) => {
    const response = await apiClient.post("/submissions", data);
    return response.data;
  },
  updateSubmission: async (
    id: string | undefined,
    data: Record<string, any>
  ) => {
    const response = await apiClient.put<SubmissionResponse>(
      `/submissions/${id}`,
      data
    );
    return response.data;
  },
};
