import apiClient from "../api/apiClient";

export type BillingCycle = "monthly" | "yearly";

export interface StripePriceInfo {
  id: string;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
  unitAmount: number | null;
  productName: string | null;
  nickname: string | null;
  displayAmount: string | null;
}

export interface PlanPricing {
  monthly: StripePriceInfo;
  yearly: StripePriceInfo;
  currency: string;
  display: {
    monthly: string | null;
    yearly: string | null;
  };
}

export interface Plan {
  _id: string;
  name: string;
  code: string;
  description: string;
  displayOrder: number;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
  active: boolean;
  visible: boolean;
  recommended: boolean;
  trialDays: number;
  entitlements: Record<string, number | boolean | null>;
  pricing?: PlanPricing | null;
}

export interface AdminSubscriptionSummary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  incompleteSubscriptions: number;
  scheduledToCancel: number;
}

export interface AdminSubscriptionItem {
  _id: string;
  status: string;
  billingCycle: BillingCycle;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { _id: string; name: string; slug: string } | null;
  plan: { _id: string; name: string; code: string } | null;
  planSnapshot?: { name?: string; code?: string } | null;
}

export interface AdminSubscriptionsResponse {
  subscriptions: AdminSubscriptionItem[];
  summary: AdminSubscriptionSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

export interface AdminSubscriptionDetailResponse {
  subscription: AdminSubscriptionItem;
  riskFlags: Array<{
    code: string;
    severity: "high" | "medium" | "low";
    label: string;
  }>;
  lifecycleEvents: Array<{
    key: string;
    type: string;
    title: string;
    date: string;
    meta?: Record<string, unknown>;
  }>;
  webhookEvents: Array<{
    eventId: string;
    eventType: string;
    status: "processing" | "processed" | "failed";
    failureReason: string | null;
    stripeSubscriptionId: string | null;
    processedAt: string | null;
    createdAt: string;
  }>;
}

export const BillingService = {
  async listPublicPlans(): Promise<Plan[]> {
    const { data } = await apiClient.get("/billing/plans/public");
    return data?.plans || [];
  },
  async getOrganizationBilling() {
    const { data } = await apiClient.get("/billing/organization");
    return data;
  },
  async createCheckoutSession(planId: string, billingCycle: BillingCycle) {
    const { data } = await apiClient.post("/billing/checkout", { planId, billingCycle });
    return data;
  },
  async createPortalSession() {
    const { data } = await apiClient.post("/billing/portal");
    return data;
  },
  async changePlan(planId: string, billingCycle: BillingCycle) {
    const { data } = await apiClient.post("/billing/change-plan", { planId, billingCycle });
    return data;
  },
  async cancelSubscription(immediate = false) {
    const { data } = await apiClient.post("/billing/cancel", { immediate });
    return data;
  },
  async resumeSubscription() {
    const { data } = await apiClient.post("/billing/resume");
    return data;
  },
  async listAdminPlans(): Promise<Plan[]> {
    const { data } = await apiClient.get("/billing/admin/plans");
    return data?.plans || [];
  },
  async listAdminSubscriptions(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    billingCycle?: string;
    cancelAtPeriodEnd?: "" | "true" | "false";
  }): Promise<AdminSubscriptionsResponse> {
    const queryParams: Record<string, string | number> = {
      page: params.page,
      limit: params.limit,
    };
    if (params.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params.status) queryParams.status = params.status;
    if (params.billingCycle) queryParams.billingCycle = params.billingCycle;
    if (params.cancelAtPeriodEnd === "true" || params.cancelAtPeriodEnd === "false") {
      queryParams.cancelAtPeriodEnd = params.cancelAtPeriodEnd;
    }
    const { data } = await apiClient.get("/billing/admin/subscriptions", { params: queryParams });
    return {
      subscriptions: data?.subscriptions || [],
      summary: data?.summary || {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        trialingSubscriptions: 0,
        pastDueSubscriptions: 0,
        canceledSubscriptions: 0,
        incompleteSubscriptions: 0,
        scheduledToCancel: 0,
      },
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
  async getAdminSubscriptionDetail(subscriptionId: string): Promise<AdminSubscriptionDetailResponse> {
    const { data } = await apiClient.get(`/billing/admin/subscriptions/${subscriptionId}`);
    return {
      subscription: data?.subscription,
      riskFlags: data?.riskFlags || [],
      lifecycleEvents: data?.lifecycleEvents || [],
      webhookEvents: data?.webhookEvents || [],
    };
  },
  async syncAdminSubscription(subscriptionId: string): Promise<AdminSubscriptionDetailResponse> {
    const { data } = await apiClient.post(`/billing/admin/subscriptions/${subscriptionId}/sync`);
    return {
      subscription: data?.subscription,
      riskFlags: data?.riskFlags || [],
      lifecycleEvents: data?.lifecycleEvents || [],
      webhookEvents: data?.webhookEvents || [],
    };
  },
  async setAdminSubscriptionCancellation(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<AdminSubscriptionDetailResponse> {
    const { data } = await apiClient.post(`/billing/admin/subscriptions/${subscriptionId}/cancellation`, {
      cancelAtPeriodEnd,
    });
    return {
      subscription: data?.subscription,
      riskFlags: data?.riskFlags || [],
      lifecycleEvents: data?.lifecycleEvents || [],
      webhookEvents: data?.webhookEvents || [],
    };
  },
  async createAdminPlan(payload: Partial<Plan>) {
    const { data } = await apiClient.post("/billing/admin/plans", payload);
    return data?.plan;
  },
  async updateAdminPlan(id: string, payload: Partial<Plan>) {
    const { data } = await apiClient.put(`/billing/admin/plans/${id}`, payload);
    return data?.plan;
  },
  async validateStripePriceIds(stripeMonthlyPriceId: string, stripeYearlyPriceId: string): Promise<PlanPricing> {
    const { data } = await apiClient.post("/billing/admin/plans/validate-prices", {
      stripeMonthlyPriceId,
      stripeYearlyPriceId,
    });
    return data?.pricing;
  },
};
