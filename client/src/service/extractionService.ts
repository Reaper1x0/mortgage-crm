// src/api/extractionClient.ts

import apiClient from "../api/apiClient";
import { Submission } from "../types/extraction.types";

type CnicResponse = {
  message: string;
  success: boolean;
  legalName: string | null;
  rawTextLength: number;
  submission: Submission;
};

type DocumentsResponse = {
  success: boolean;
  personName: string | null;
  submission: Submission;
};

export async function uploadCnicForName(submissionId: string | undefined, file: File) {
  const formData = new FormData();
  formData.append("cnic", file);

  const res = await apiClient.post<CnicResponse>(
    `extraction/cnic/extract-name/${submissionId}`,
    formData,
    {
      headers: {
        // let browser set boundary
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
}

export async function uploadDocumentsForFields(
  files: File[],
  submissionId: string | undefined,
  personName?: string | null
) {
  const formData = new FormData();
  files.forEach((f) => formData.append("documents", f));
  if (personName) {
    formData.append("personName", personName);
  }

  const res = await apiClient.post<DocumentsResponse>(
    `extraction/documents/extract-fields/${submissionId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
}
