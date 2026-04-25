import apiClient from "../api/apiClient";

export interface WorkspaceSummary {
  workspaceId: string;
  name: string;
  slug: string;
  role: "Admin" | "Agent" | "Viewer";
  organization?: {
    organizationId: string;
    name: string;
    slug: string;
  } | null;
  organizationRole?: "Owner" | "Admin" | "Member" | "Viewer" | null;
  branding?: {
    organization?: TenantBranding | null;
    workspace?: TenantBranding | null;
    effective?: TenantBranding | null;
  } | null;
}

export interface TenantBranding {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  themeMode?: "light" | "dark" | "system" | null;
  customVars?: Record<string, string> | null;
}

export const WorkspaceService = {
  list: () =>
    apiClient.get<{ success: boolean; message: string; workspaces: WorkspaceSummary[] }>("/workspaces"),

  create: (name: string, organizationId?: string | null, organizationName?: string | null) =>
    apiClient.post<{ success: boolean; message: string; workspace: { _id: string; name: string; slug: string } }>(
      "/workspaces",
      {
        name,
        ...(organizationId ? { organizationId } : {}),
        ...(organizationName ? { organizationName } : {}),
      }
    ),
  updateBranding: (formData: FormData) =>
    apiClient.patch<{ success: boolean; message: string; workspace: { _id: string; branding: unknown } }>(
      "/workspaces/branding",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    ),
};
