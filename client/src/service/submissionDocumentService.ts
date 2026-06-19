import apiClient from "../api/apiClient";
import type { Submission } from "../types/extraction.types";

export type DocumentUploadResult = {
  original_name?: string;
  ok?: boolean;
  reason?: string;
  docEntryId?: string;
};

export type UploadDocumentsResponse = {
  success: boolean;
  message: string;
  submission: Submission;
  results: DocumentUploadResult[];
};

export type ExtractDocumentResponse = {
  success: boolean;
  message: string;
  submission: Submission;
  docEntryId: string;
  extracted_fields_count: number;
  extraction_status: string;
};

export type FileUploadPhase = "uploading" | "processing" | "done" | "error";

export type FileUploadProgress = {
  fileName: string;
  phase: FileUploadPhase;
  /** 0–100 during upload; processing uses indeterminate UI */
  percent: number;
  error?: string;
};

type ProgressCallback = (progress: FileUploadProgress) => void;

function applyUploadProgress(
  file: File,
  onProgress: ProgressCallback | undefined,
  event: { loaded: number; total?: number }
) {
  if (!onProgress) return;
  const total = event.total || file.size || 1;
  const raw = Math.round((event.loaded * 100) / total);
  const percent = Math.min(Math.max(raw, 0), 99);
  onProgress({
    fileName: file.name,
    phase: event.loaded >= total ? "processing" : "uploading",
    percent: event.loaded >= total ? 100 : percent,
  });
}

async function uploadSingleDocument(
  submissionId: string,
  file: File,
  onProgress?: ProgressCallback
) {
  const formData = new FormData();
  formData.append("documents", file);

  onProgress?.({ fileName: file.name, phase: "uploading", percent: 0 });

  const resp = await apiClient.post<UploadDocumentsResponse>(
    `/submissions/${submissionId}/documents`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => applyUploadProgress(file, onProgress, event),
    }
  );

  onProgress?.({ fileName: file.name, phase: "processing", percent: 100 });

  const data = resp.data;
  const fileResult = data.results?.find((r) => r.original_name === file.name) ?? data.results?.[0];

  if (!fileResult?.ok) {
    onProgress?.({
      fileName: file.name,
      phase: "error",
      percent: 0,
      error: fileResult?.reason || data.message || "Upload failed.",
    });
    throw new Error(fileResult?.reason || data.message || "Upload failed.");
  }

  onProgress?.({ fileName: file.name, phase: "done", percent: 100 });
  return data;
}

export const SubmissionDocumentsService = {
  list: async (submissionId: string) => {
    const resp = await apiClient.get(`/submissions/${submissionId}/documents`);
    return resp.data;
  },

  upload: uploadSingleDocument,

  uploadMany: async (
    submissionId: string,
    files: File[],
    onFileProgress?: (fileName: string, progress: FileUploadProgress) => void
  ): Promise<UploadDocumentsResponse> => {
    let lastResponse: UploadDocumentsResponse | null = null;

    for (const file of files) {
      const data = await uploadSingleDocument(submissionId, file, (progress) => {
        onFileProgress?.(file.name, progress);
      });
      lastResponse = data;
    }

    if (!lastResponse) {
      throw new Error("No files to upload.");
    }

    return lastResponse;
  },

  extract: async (submissionId: string, docEntryId: string) => {
    const resp = await apiClient.post<ExtractDocumentResponse>(
      `/submissions/${submissionId}/documents/${docEntryId}/extract`
    );
    return resp.data;
  },

  replace: async (
    submissionId: string,
    docEntryId: string,
    file: File,
    onProgress?: ProgressCallback
  ) => {
    const fd = new FormData();
    fd.append("file", file);

    onProgress?.({ fileName: file.name, phase: "uploading", percent: 0 });

    const resp = await apiClient.put(
      `/submissions/${submissionId}/documents/${docEntryId}`,
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => applyUploadProgress(file, onProgress, event),
      }
    );

    onProgress?.({ fileName: file.name, phase: "done", percent: 100 });
    return resp.data;
  },

  remove: async (submissionId: string, docEntryId: string) => {
    const resp = await apiClient.delete(
      `/submissions/${submissionId}/documents/${docEntryId}`
    );
    return resp.data;
  },
};
