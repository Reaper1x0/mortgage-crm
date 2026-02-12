import apiClient from "../api/apiClient";

export const TemplateService = {
  createTemplate: async (name: string, file: File) => {
    const form = new FormData();
    form.append("name", name);
    form.append("file", file);

    const res = await apiClient.post("/templates", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getTemplate: async (id: string) => {
    const res = await apiClient.get(`/templates/${id}`);
    return res.data;
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
};
