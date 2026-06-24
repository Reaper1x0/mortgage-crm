import apiClient from "../api/apiClient";

export interface TenantBranding {
  logoUrl?: string | null;
}

export interface WorkspaceSummary {
  workspaceId: string;
  name: string;
  slug: string;
  role: "Admin" | "Agent" | "Viewer";
  workspaceRoleSlug?: string | null;
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

export interface OrganizationWorkspaceSummary {
  workspaceId: string;
  name: string;
  slug: string;
  role: "Admin" | "Agent" | "Viewer";
  workspaceRoleSlug?: string | null;
  branding?: WorkspaceSummary["branding"];
}

export interface OrganizationMembership {
  organizationId: string;
  name: string;
  slug: string;
  isOrgOwner?: boolean;
  organizationRole?: "Owner" | "Admin" | "Member" | "Viewer" | null;
  organizationRoleSlug?: string | null;
  branding?: TenantBranding | null;
  workspaces: OrganizationWorkspaceSummary[];
}

export const WorkspaceService = {
  list: () =>
    apiClient.get<{
      success: boolean;
      message: string;
      organizations: OrganizationMembership[];
      workspaces: WorkspaceSummary[];
    }>("/workspaces"),

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
