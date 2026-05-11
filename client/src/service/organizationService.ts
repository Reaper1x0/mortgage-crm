import apiClient from "../api/apiClient";

export interface OrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
}

export interface OrganizationWorkspaceAccess {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: "Admin" | "Agent" | "Viewer";
}

export interface OrganizationMemberUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
  organizationRole: "Owner" | "Admin" | "Member" | "Viewer";
  workspaceMemberships: OrganizationWorkspaceAccess[];
  profile_picture?: { url?: string } | null;
}

export interface OrganizationWorkspaceSummary {
  workspaceId: string;
  name: string;
  slug: string;
}

export interface OrganizationRoleStats {
  ownerCount: number;
  adminCount: number;
  memberCount: number;
  viewerCount: number;
}

export const OrganizationService = {
  list: () =>
    apiClient.get<{ success: boolean; message: string; organizations: OrganizationSummary[] }>("/organizations"),
  create: (name: string) =>
    apiClient.post<{ success: boolean; message: string; organization: { _id: string; name: string; slug: string } }>(
      "/organizations",
      { name }
    ),
  updateBranding: (formData: FormData) =>
    apiClient.post<{ success: boolean; message: string; organization: { _id: string; branding: unknown } }>(
      "/organizations/branding",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    ),
  updateProfile: (payload: Record<string, string | null>) =>
    apiClient.patch<{ success: boolean; message: string; organization: unknown }>(
      "/organizations/profile",
      payload
    ),
  listMembers: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    role?: "Owner" | "Admin" | "Member" | "Viewer";
    search?: string;
  }) =>
    apiClient.get<{
      success: boolean;
      message: string;
      users: OrganizationMemberUser[];
      workspaces: OrganizationWorkspaceSummary[];
      roleStats: OrganizationRoleStats;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>("/organizations/members", { params }),
  addMember: (payload: {
    fullName: string;
    username: string;
    email: string;
    password?: string;
    organizationRole: "Owner" | "Admin" | "Member" | "Viewer";
    workspaceRoles: { workspaceId: string; role: "Admin" | "Agent" | "Viewer" }[];
  }) => apiClient.post<{ success: boolean; message: string }>("/organizations/members", payload),
  updateMemberRole: (userId: string, role: "Owner" | "Admin" | "Member" | "Viewer") =>
    apiClient.patch<{ success: boolean; message: string }>(`/organizations/members/${userId}/role`, { role }),
  updateWorkspaceRole: (userId: string, workspaceId: string, role: "Admin" | "Agent" | "Viewer") =>
    apiClient.patch<{ success: boolean; message: string }>(
      `/organizations/members/${userId}/workspaces/${workspaceId}/role`,
      { role }
    ),
  removeWorkspaceAccess: (userId: string, workspaceId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/organizations/members/${userId}/workspaces/${workspaceId}`
    ),
  removeMember: (userId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/organizations/members/${userId}`),
};
