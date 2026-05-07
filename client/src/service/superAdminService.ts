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
  subscriptionStatusBreakdown: Array<{ status: string; count: number }>;
  estimatedRevenue: {
    mrr: number;
    arr: number;
    currency: string;
    byPlan: Array<{ code: string; name: string; mrr: number; subscriptions: number }>;
    byCycle: Array<{ cycle: string; mrr: number }>;
    estimatedFromSubscriptions: number;
    estimateAvailable: boolean;
  };
}

export interface SuperAdminOrganizationsSummary {
  totalOrganizations: number;
  totalWorkspaces: number;
  totalOrgMembers: number;
  totalWorkspaceSeats: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueOrIncomplete: number;
  noSubscription: number;
  avgWorkspacesPerOrganization: number;
}

export interface SuperAdminOrganizationRow {
  _id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  contactEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceCount: number;
  orgMemberCount: number;
  workspaceSeatCount: number;
  subscription?: {
    _id?: string;
    status?: string;
    billingCycle?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | null;
    planSnapshot?: { name?: string; code?: string };
    stripeSubscriptionId?: string | null;
  } | null;
}

export interface SuperAdminWorkspacesSummary {
  totalWorkspaces: number;
  totalWorkspaceMembers: number;
  totalWorkspaceAdmins: number;
  activeSubscriptionWorkspaces: number;
  atRiskSubscriptionWorkspaces: number;
  noSubscriptionWorkspaces: number;
  avgMembersPerWorkspace: number;
}

export interface SuperAdminWorkspaceRow {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  adminCount: number;
  organization?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
  subscription?: {
    status?: string;
    billingCycle?: string;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  } | null;
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
      subscriptionStatusBreakdown: data.subscriptionStatusBreakdown || [],
      estimatedRevenue: data.estimatedRevenue || {
        mrr: 0,
        arr: 0,
        currency: "USD",
        byPlan: [],
        byCycle: [],
        estimatedFromSubscriptions: 0,
        estimateAvailable: false,
      },
    };
  },
  listOrganizations: async (params: {
    page: number;
    limit: number;
    search?: string;
    subscriptionStatus?: string;
  }) => {
    const { data } = await apiClient.get("/super-admin/organizations", { params });
    return {
      organizations: (data?.organizations || []) as SuperAdminOrganizationRow[],
      summary: (data?.summary || {}) as SuperAdminOrganizationsSummary,
      pagination: data?.pagination || {
        page: 1,
        limit: params.limit || 10,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      },
    };
  },
  listWorkspaces: async (params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    subscriptionStatus?: string;
  }) => {
    const { data } = await apiClient.get("/super-admin/workspaces", { params });
    return {
      workspaces: (data?.workspaces || []) as SuperAdminWorkspaceRow[],
      summary: (data?.summary || {}) as SuperAdminWorkspacesSummary,
      pagination: data?.pagination || {
        page: 1,
        limit: params.limit || 10,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      },
    };
  },
};
