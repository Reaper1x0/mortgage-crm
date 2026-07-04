import type { SubmissionIdentitySlice } from "../types/extraction.types";
import { uploadFormData } from "../utils/uploadRequest";
import type { FileUploadProgressCallback } from "../utils/uploadProgress";

type CnicResponse = {
  message: string;
  success: boolean;
  legalName: string | null;
  rawTextLength: number;
  extractionStatus?: "pending" | "extracted" | "extract_failed";
  needsManualLegalName?: boolean;
  nameConfidence?: "high" | "medium" | "low" | null;
  documentAuthenticity?:
    | "likely_genuine"
    | "uncertain"
    | "likely_template_or_sample"
    | null;
  authenticityNote?: string | null;
  documentTypeDetected?: string | null;
} & SubmissionIdentitySlice;

export async function uploadCnicForName(
  submissionId: string | undefined,
  file: File,
  onProgress?: FileUploadProgressCallback
) {
  const formData = new FormData();
  formData.append("cnic", file);

  return uploadFormData<CnicResponse>({
    path: `extraction/cnic/extract-name/${submissionId}`,
    formData,
    file,
    onProgress,
  });
}
