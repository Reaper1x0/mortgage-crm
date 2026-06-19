import apiClient from "../api/apiClient";
import type {
  AssistantIndexStatusResponse,
  AssistantQueryResponse,
} from "../types/assistant.types";

export const AssistantService = {
  query: async (submissionId: string, question: string, fileIds?: string[] | null) => {
    const resp = await apiClient.post(`/submissions/${submissionId}/assistant/query`, {
      question,
      ...(fileIds?.length ? { fileIds } : {}),
    });
    return resp.data as {
      success: boolean;
      message: string;
    } & AssistantQueryResponse;
  },

  getStatus: async (submissionId: string) => {
    const resp = await apiClient.get(`/submissions/${submissionId}/assistant/status`);
    return resp.data as {
      success: boolean;
      message: string;
    } & AssistantIndexStatusResponse;
  },

  reindex: async (submissionId: string) => {
    const resp = await apiClient.post(`/submissions/${submissionId}/assistant/reindex`);
    return resp.data as {
      success: boolean;
      message: string;
      results: Array<{ fileId: string; ok: boolean; chunkCount?: number; reason?: string }>;
      status: AssistantIndexStatusResponse;
    };
  },

  indexDocument: async (submissionId: string, fileId: string) => {
    const resp = await apiClient.post(
      `/submissions/${submissionId}/assistant/documents/${fileId}/index`
    );
    return resp.data as {
      success: boolean;
      message: string;
      result: { fileId: string; ok: boolean; chunkCount?: number };
      status: AssistantIndexStatusResponse;
    };
  },
};
