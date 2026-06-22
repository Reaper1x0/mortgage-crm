import apiClient from "../api/apiClient";
import type { BulkImportPreview, BulkImportResult, PaginatedListResult } from "../types/listQuery";

export interface MasterField {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
  validation_rules: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type MasterFieldListParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  type?: string;
  required?: string;
  createdFrom?: string;
  createdTo?: string;
};

export const MasterFieldService = {
  getAllFields: async (params?: MasterFieldListParams): Promise<PaginatedListResult<MasterField>> => {
    const res = await apiClient.get("/master-fields/fields", { params });
    return {
      items: res.data?.fields || [],
      pagination: res.data?.pagination,
    };
  },

  createField: async (data: MasterField) => {
    const response = await apiClient.post("/master-fields/fields", data);
    return response.data;
  },

  updateField: async (key: string, data: MasterField) => {
    const response = await apiClient.put(`/master-fields/fields/${key}`, data);
    return response.data;
  },

  deleteField: async (key: string) => {
    const response = await apiClient.delete(`/master-fields/fields/${key}`);
    return response.data;
  },

  deleteMultipleFields: async (keys: string[]) => {
    const response = await apiClient.post("/master-fields/bulk/delete", { keys });
    return response.data;
  },

  downloadImportTemplate: async () => {
    const response = await apiClient.get("/master-fields/bulk/sample-template", {
      responseType: "blob",
    });
    return response.data as Blob;
  },

  bulkPreview: async (file: File): Promise<BulkImportPreview> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/master-fields/bulk/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  bulkImport: async (payload: {
    rows: Record<string, unknown>[];
    mapping: Record<string, string>;
  }): Promise<BulkImportResult> => {
    const response = await apiClient.post("/master-fields/bulk/import", payload);
    return response.data;
  },
};
