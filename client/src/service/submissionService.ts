import apiClient from "../api/apiClient";
import { Submission } from "../types/extraction.types";

type SubmissionResponse = {
  message: string;
  success: boolean;
  submission: Submission;
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
  getSubmissionById: async (id: string | undefined) => {
    if (!id) return;
    const response = await apiClient.get<SubmissionResponse>(
      `/submissions/${id}`
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
