import apiClient from "../api/apiClient";
import type { GeneratedDocument, SubmissionDocument } from "../types/extraction.types";
import { uploadFormData } from "../utils/uploadRequest";
import type { FileUploadProgressCallback } from "../utils/uploadProgress";

export type { FileUploadProgress, FileUploadPhase } from "../utils/uploadProgress";

export type DocumentUploadResult = {
  original_name?: string;
  ok?: boolean;
  reason?: string;
  docEntryId?: string;
};

export type DocumentsSliceResponse = {
  success: boolean;
  message: string;
  submissionId: string;
  documents: SubmissionDocument[];
};

export type UploadDocumentsResponse = DocumentsSliceResponse & {
  results: DocumentUploadResult[];
};

export type ExtractDocumentResponse = DocumentsSliceResponse & {
  docEntryId: string;
  extracted_fields_count: number;
  extraction_status: string;
};

export type RemoveGeneratedResponse = {
  success: boolean;
  message: string;
  submissionId: string;
  generated_documents: GeneratedDocument[];
};

export type ListDocumentsResponse = DocumentsSliceResponse;

async function uploadSingleDocument(
  submissionId: string,
  file: File,
  onProgress?: FileUploadProgressCallback
) {
  const formData = new FormData();
  formData.append("documents", file);

  const data = await uploadFormData<UploadDocumentsResponse>({
    path: `submissions/${submissionId}/documents`,
    formData,
    file,
    onProgress,
  });

  const fileResult = data.results?.find((r) => r.original_name === file.name) ?? data.results?.[0];

  if (!fileResult?.ok) {
    throw new Error(fileResult?.reason || data.message || "Upload failed.");
  }

  return data;
}

export const SubmissionDocumentsService = {
  list: async (submissionId: string) => {
    const resp = await apiClient.get<ListDocumentsResponse>(
      `/submissions/${submissionId}/documents`
    );
    return resp.data;
  },

  upload: uploadSingleDocument,

  uploadMany: async (
    submissionId: string,
    files: File[],
    onFileProgress?: (file: File, index: number, progress: import("../utils/uploadProgress").FileUploadProgress) => void
  ): Promise<UploadDocumentsResponse> => {
    let lastResponse: UploadDocumentsResponse | null = null;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      lastResponse = await uploadSingleDocument(submissionId, file, (progress) => {
        onFileProgress?.(file, index, progress);
      });
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
    onProgress?: FileUploadProgressCallback
  ) => {
    const fd = new FormData();
    fd.append("file", file);

    return uploadFormData<DocumentsSliceResponse>({
      method: "PUT",
      path: `submissions/${submissionId}/documents/${docEntryId}`,
      formData: fd,
      file,
      onProgress,
    });
  },

  remove: async (submissionId: string, docEntryId: string) => {
    const resp = await apiClient.delete<DocumentsSliceResponse>(
      `/submissions/${submissionId}/documents/${docEntryId}`
    );
    return resp.data;
  },

  removeGenerated: async (submissionId: string, generatedDocId: string) => {
    const resp = await apiClient.delete<RemoveGeneratedResponse>(
      `/submissions/${submissionId}/generated/${generatedDocId}`
    );
    return resp.data;
  },
};
