import apiClient from "../api/apiClient";
import { uploadFormData } from "../utils/uploadRequest";
import type { FileUploadProgressCallback } from "../utils/uploadProgress";

export const TemplateService = {
  createTemplate: async (
    name: string,
    file: File,
    onProgress?: FileUploadProgressCallback
  ) => {
    const form = new FormData();
    form.append("name", name);
    form.append("file", file);

    return uploadFormData({
      path: "templates",
      formData: form,
      file,
      onProgress,
    });
  },

  getTemplate: async (id: string) => {
    const res = await apiClient.get(`/templates/${id}`);
    return res.data;
  },

  getTemplateFile: async (id: string) => {
    const res = await apiClient.get(`/templates/${id}/file`, {
      responseType: "arraybuffer",
      skipErrorToast: true,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    return res.data as ArrayBuffer;
  },

  savePlacements: async (id: string, placements: any[]) => {
    const res = await apiClient.put(`/templates/${id}/placements`, {
      placements,
    });
    return res.data;
  },

  render: async (id: string, values: Record<string, any>, submissionId?: string) => {
    const res = await apiClient.post(`/templates/${id}/render`, { values, submissionId });
    return res.data;
  },

  listTemplates: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const res = await apiClient.get("/templates", { params });
    return res.data;
  },

  deleteTemplate: async (id: string) => {
    const res = await apiClient.delete(`/templates/${id}`);
    return res.data;
  },
};
