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
