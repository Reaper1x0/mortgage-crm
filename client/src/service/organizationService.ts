import apiClient from "../api/apiClient";

export interface OrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  /** @deprecated use organizationRole */
  role?: "Owner" | "Admin" | "Member" | "Viewer";
  isOrgOwner?: boolean;
  organizationRole?: string | null;
  organizationRoleId?: string | null;
}

export interface OrganizationWorkspaceAccess {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceRole?: string | null;
  workspaceRoleId?: string | null;
}

export interface OrganizationMemberUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
  organizationRole: "Owner" | "Admin" | "Member" | "Viewer";
  organizationRoleId?: string | null;
  organizationRoleSlug?: string | null;
  isOrgOwner?: boolean;
  workspaceMemberships: OrganizationWorkspaceAccess[];
  profile_picture?: { url?: string } | null;
}

export interface EffectivePermissions {
  isOrgOwner: boolean;
  organizationRoleId: string | null;
  organizationRoleSlug?: string | null;
  organizationPermissions: string[];
  workspacePermissions: string[] | null;
}

export interface PermissionCatalogEntry {
  key: string;
  scope: string;
  label: string;
}

export interface OrganizationWorkspaceSummary {
  workspaceId: string;
  name: string;
  slug: string;
}

export interface RoleRow {
  _id: string;
  name: string;
  slug: string;
  kind: "system" | "custom";
  description?: string;
  permissions: string[];
}

export interface RolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

export interface OrganizationRoleStats {
  ownerCount: number;
  adminCount: number;
  memberCount: number;
  viewerCount: number;
}

export interface OnboardingSessionState {
  hasOrganization: boolean;
  organizationId: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  workspaceId: string | null;
  step: "organization" | "billing" | "workspace" | "access" | "complete";
  hasSubscriptionAccess: boolean;
  hasWorkspace: boolean;
  canManageBilling?: boolean;
  canCreateWorkspace?: boolean;
  accessReason?: "billing_manage_required" | "workspace_create_required" | null;
}

export const OrganizationService = {
  list: () =>
    apiClient.get<{ success: boolean; message: string; organizations: OrganizationSummary[] }>("/organizations"),
  getOnboardingSession: (organizationId?: string | null) =>
    apiClient.get<{ success: boolean; message: string; session: OnboardingSessionState }>(
      "/organizations/onboarding-session",
      { params: organizationId ? { organizationId } : {} }
    ),
  create: (name: string) =>
    apiClient.post<{ success: boolean; message: string; organization: { _id: string; name: string; slug: string } }>(
      "/organizations",
      { name }
    ),
  updateBranding: (formData: FormData, organizationId?: string | null) =>
    apiClient.post<{ success: boolean; message: string; organization: { _id: string; branding: unknown } }>(
      "/organizations/branding",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        ...(organizationId ? { organizationId } : {}),
      }
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
    organizationRole?: "Owner" | "Admin" | "Member" | "Viewer";
    organizationRoleId?: string;
    workspaceRoles: { workspaceId: string; role?: string; workspaceRoleId?: string }[];
  }) => apiClient.post<{ success: boolean; message: string }>("/organizations/members", payload),
  updateMemberRole: (
    userId: string,
    payload: { role?: "Owner" | "Admin" | "Member" | "Viewer"; organizationRoleId?: string }
  ) => apiClient.patch<{ success: boolean; message: string }>(`/organizations/members/${userId}/role`, payload),
  /** Set or create workspace membership for an org member (uses workspace role id from Roles settings). */
  updateMemberWorkspaceRole: (userId: string, workspaceId: string, payload: { workspaceRoleId: string }) =>
    apiClient.patch<{ success: boolean; message: string }>(
      `/organizations/members/${userId}/workspaces/${workspaceId}/role`,
      payload
    ),
  removeWorkspaceAccess: (userId: string, workspaceId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/organizations/members/${userId}/workspaces/${workspaceId}`
    ),
  removeMember: (userId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/organizations/members/${userId}`),

  getAuthzEffective: (workspaceId?: string, organizationId?: string | null) =>
    apiClient.get<{ success: boolean; message: string; effective: EffectivePermissions }>(
      "/organizations/authz/effective",
      {
        params: workspaceId ? { workspaceId } : {},
        ...(organizationId ? { organizationId } : {}),
      }
    ),

  getAuthzCatalog: (organizationId?: string | null) =>
    apiClient.get<{ success: boolean; message: string; permissions: PermissionCatalogEntry[] }>(
      "/organizations/authz/catalog",
      organizationId ? { organizationId } : {}
    ),

  /* ── Role CRUD ─────────────────────────────────────────────────────────── */

  listOrganizationRoles: () =>
    apiClient.get<{ success: boolean; message: string; roles: RoleRow[] }>(
      "/organizations/roles/organization"
    ),
  createOrganizationRole: (payload: RolePayload) =>
    apiClient.post<{ success: boolean; message: string; role: RoleRow }>(
      "/organizations/roles/organization",
      payload
    ),
  updateOrganizationRole: (roleId: string, payload: Partial<RolePayload>) =>
    apiClient.patch<{ success: boolean; message: string; role: RoleRow }>(
      `/organizations/roles/organization/${roleId}`,
      payload
    ),
  deleteOrganizationRole: (roleId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/organizations/roles/organization/${roleId}`
    ),

  listWorkspaceRoles: () =>
    apiClient.get<{ success: boolean; message: string; roles: RoleRow[] }>(
      "/organizations/roles/workspace"
    ),
  createWorkspaceRole: (payload: RolePayload) =>
    apiClient.post<{ success: boolean; message: string; role: RoleRow }>(
      "/organizations/roles/workspace",
      payload
    ),
  updateWorkspaceRoleTemplate: (roleId: string, payload: Partial<RolePayload>) =>
    apiClient.patch<{ success: boolean; message: string; role: RoleRow }>(
      `/organizations/roles/workspace/${roleId}`,
      payload
    ),
  deleteWorkspaceRole: (roleId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/organizations/roles/workspace/${roleId}`
    ),
};
