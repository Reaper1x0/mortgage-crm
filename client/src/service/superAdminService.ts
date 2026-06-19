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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface SuperAdminDashboardResponse {
  success: boolean;
  message: string;
  summary: SuperAdminDashboardSummary;
  systemRoleBreakdown: RoleCount[];
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

export interface SuperAdminPlan {
  _id?: string;
  name?: string;
  code?: string;
  description?: string;
  displayOrder?: number;
  active?: boolean;
  visible?: boolean;
  recommended?: boolean;
  trialDays?: number;
  entitlements?: Record<string, any>;
  stripeMonthlyPriceId?: string | null;
  stripeYearlyPriceId?: string | null;
}

export interface SuperAdminSubscription {
  _id?: string;
  status?: string;
  billingCycle?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
  lastSyncedAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  planSnapshot?: {
    name?: string;
    code?: string;
    entitlements?: Record<string, any>;
  };
  plan?: SuperAdminPlan | null;
  createdAt?: string;
  updatedAt?: string;
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
  subscription?: SuperAdminSubscription | null;
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

export interface SuperAdminWorkspaceOrganization {
  _id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  settings?: {
    timezone?: string;
    locale?: string;
    currency?: string;
  };
  branding?: BrandingInfo | null;
}

export interface SuperAdminWorkspaceRow {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  adminCount: number;
  organization?: SuperAdminWorkspaceOrganization | null;
  subscription?: SuperAdminSubscription | null;
}

export interface BrandingInfo {
  logoUrl?: string | null;
  logoFile?: any;
}

export interface SuperAdminMiniUser {
  _id?: string;
  fullName?: string | null;
  email?: string | null;
  username?: string | null;
  role?: string | null;
  isEmailVerified?: boolean;
  profile_picture?: any;
}

export interface OrganizationMemberPreview {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  user?: SuperAdminMiniUser | null;
}

export interface WorkspaceMemberPreview {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  user?: SuperAdminMiniUser | null;
}

export interface RecentWorkspacePreview {
  _id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  adminCount?: number;
}

export interface SuperAdminOrganizationDetails extends SuperAdminOrganizationRow {
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  settings?: {
    timezone?: string;
    locale?: string;
    currency?: string;
  };
  branding?: BrandingInfo | null;
  createdBy?: SuperAdminMiniUser | null;
  counts?: {
    workspaces: number;
    organizationMembers: number;
    workspaceSeats: number;
  };
  recentWorkspaces?: RecentWorkspacePreview[];
  membersPreview?: OrganizationMemberPreview[];
}

export interface SuperAdminWorkspaceDetails extends SuperAdminWorkspaceRow {
  branding?: BrandingInfo | null;
  createdBy?: SuperAdminMiniUser | null;
  counts?: {
    members: number;
    organizationWorkspaces: number;
    organizationMembers: number;
  };
  membersPreview?: WorkspaceMemberPreview[];
}

const defaultPagination = (limit = 10): PaginationMeta => ({
  page: 1,
  limit,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
});

const unwrapPayload = <T = any>(data: any): T => {
  return (data?.data || data || {}) as T;
};

export const SuperAdminService = {
  getDashboard: async (): Promise<Omit<SuperAdminDashboardResponse, "success" | "message">> => {
    const { data } = await apiClient.get<SuperAdminDashboardResponse>("/super-admin/dashboard");
    const payload = unwrapPayload<SuperAdminDashboardResponse>(data);

    return {
      summary: payload.summary,
      systemRoleBreakdown: payload.systemRoleBreakdown || [],
      signupsLast14Days: payload.signupsLast14Days || [],
      subscriptionStatusBreakdown: payload.subscriptionStatusBreakdown || [],
      estimatedRevenue: payload.estimatedRevenue || {
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
  }): Promise<{
    organizations: SuperAdminOrganizationRow[];
    summary: SuperAdminOrganizationsSummary;
    pagination: PaginationMeta;
  }> => {
    const { data } = await apiClient.get("/super-admin/organizations", { params });
    const payload = unwrapPayload(data);

    return {
      organizations: (payload?.organizations || []) as SuperAdminOrganizationRow[],
      summary: (payload?.summary || {}) as SuperAdminOrganizationsSummary,
      pagination: payload?.pagination || defaultPagination(params.limit),
    };
  },

  getOrganizationDetails: async (organizationId: string): Promise<SuperAdminOrganizationDetails> => {
    const { data } = await apiClient.get(`/super-admin/organizations/${organizationId}`);
    const payload = unwrapPayload(data);

    return payload.organization as SuperAdminOrganizationDetails;
  },

  listWorkspaces: async (params: {
    page: number;
    limit: number;
    search?: string;
    subscriptionStatus?: string;
  }): Promise<{
    workspaces: SuperAdminWorkspaceRow[];
    summary: SuperAdminWorkspacesSummary;
    pagination: PaginationMeta;
  }> => {
    const { data } = await apiClient.get("/super-admin/workspaces", { params });
    const payload = unwrapPayload(data);

    return {
      workspaces: (payload?.workspaces || []) as SuperAdminWorkspaceRow[],
      summary: (payload?.summary || {}) as SuperAdminWorkspacesSummary,
      pagination: payload?.pagination || defaultPagination(params.limit),
    };
  },

  getWorkspaceDetails: async (workspaceId: string): Promise<SuperAdminWorkspaceDetails> => {
    const { data } = await apiClient.get(`/super-admin/workspaces/${workspaceId}`);
    const payload = unwrapPayload(data);

    return payload.workspace as SuperAdminWorkspaceDetails;
  },
};