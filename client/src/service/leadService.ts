import apiClient from "../api/apiClient";

export interface Lead {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
  usedAsClient?: boolean;
  clientCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsListResponse {
  success: boolean;
  message: string;
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

type LeadField = "fullName" | "email" | "phone" | "company" | "source" | "notes";

export interface BulkPreviewResponse {
  success: boolean;
  message: string;
  columns: string[];
  previewRows: Record<string, unknown>[];
  rows: Record<string, unknown>[];
  totalRows: number;
  fields: LeadField[];
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  skippedReasons: Array<{ row: number; reason: string }>;
}

export interface MoveToClientsResponse {
  success: boolean;
  message: string;
  movedCount: number;
  skippedCount: number;
  skipped: Array<{ id: string; reason: string }>;
}

export const LeadService = {
  listLeads: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    source?: string;
    company?: string;
    createdFrom?: string;
    createdTo?: string;
  }) => {
    const response = await apiClient.get<LeadsListResponse>("/leads", { params });
    return response.data;
  },

  createLead: async (data: {
    fullName: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<{ success: boolean; message: string; lead: Lead }>("/leads", data);
    return response.data;
  },

  updateLead: async (
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      company?: string;
      source?: string;
      notes?: string;
    }
  ) => {
    const response = await apiClient.put<{ success: boolean; message: string; lead: Lead }>(`/leads/${id}`, data);
    return response.data;
  },

  deleteLead: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/leads/${id}`);
    return response.data;
  },

  bulkDeleteLeads: async (ids: string[]) => {
    const response = await apiClient.post<{ success: boolean; message: string; deletedCount: number }>(
      "/leads/bulk/delete",
      { ids }
    );
    return response.data;
  },

  moveLeadToClient: async (id: string) => {
    const response = await apiClient.post<MoveToClientsResponse>(`/leads/${id}/move-to-client`);
    return response.data;
  },

  bulkMoveLeadsToClients: async (ids: string[]) => {
    const response = await apiClient.post<MoveToClientsResponse>("/leads/bulk/move-to-clients", { ids });
    return response.data;
  },

  downloadLeadsImportTemplate: async () => {
    const response = await apiClient.get<Blob>("/leads/bulk/sample-template", {
      responseType: "blob",
    });
    const blob = response.data;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "leads-import-template.xlsx";
    anchor.rel = "noopener";
    anchor.click();
    URL.revokeObjectURL(url);
  },

  bulkPreview: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<BulkPreviewResponse>("/leads/bulk/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  },

  bulkImport: async (payload: {
    rows: Record<string, unknown>[];
    mapping: Record<LeadField, string>;
  }) => {
    const response = await apiClient.post<BulkImportResponse>("/leads/bulk/import", payload);
    return response.data;
  },
};
