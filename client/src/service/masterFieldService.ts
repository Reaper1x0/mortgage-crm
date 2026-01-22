import apiClient from "../api/apiClient";

// Service for CRUD operations related to MasterField
export const MasterFieldService = {
  getAllFields: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const res = await apiClient.get("/master-fields/fields", { params }); // adjust endpoint
    return res.data;
  },

  createField: async (data: Record<string, any>) => {
    const response = await apiClient.post("/master-fields/fields", data);
    return response.data;
  },

  updateField: async (key: string, data: Record<string, any>) => {
    const response = await apiClient.put(`/master-fields/fields/${key}`, data);
    return response.data;
  },

  deleteField: async (key: string) => {
    const response = await apiClient.delete(`/master-fields/fields/${key}`);
    return response.data;
  },

  deleteMultipleFields: async (keys: string[]) => {
    const response = await apiClient.delete("/master-fields/fields", {
      data: { keys },
    });
    return response.data;
  },
};
