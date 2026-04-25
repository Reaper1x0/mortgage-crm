import apiClient from "../api/apiClient";

export interface SuperAdminDashboardSummary {
  totalUsers: number;
  superAdminUsers: number;
  regularUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  totalOrganizations: number;
  totalWorkspaces: number;
  organizationMemberships: number;
  workspaceMemberships: number;
  avgWorkspacesPerUser: number;
  avgOrgsPerUser: number;
}

export interface RoleCount {
  role: string;
  count: number;
}

export interface SignupDay {
  date: string;
  count: number;
}

export interface SuperAdminDashboardResponse {
  success: boolean;
  message: string;
  summary: SuperAdminDashboardSummary;
  systemRoleBreakdown: RoleCount[];
  workspaceRoleBreakdown: RoleCount[];
  organizationRoleBreakdown: RoleCount[];
  signupsLast14Days: SignupDay[];
}

export const SuperAdminService = {
  getDashboard: async (): Promise<Omit<SuperAdminDashboardResponse, "success" | "message">> => {
    const { data } = await apiClient.get<SuperAdminDashboardResponse>("/super-admin/dashboard");
    return {
      summary: data.summary,
      systemRoleBreakdown: data.systemRoleBreakdown,
      workspaceRoleBreakdown: data.workspaceRoleBreakdown,
      organizationRoleBreakdown: data.organizationRoleBreakdown,
      signupsLast14Days: data.signupsLast14Days,
    };
  },
};
