/** Copy for paid actions blocked by inactive subscription. */
export const BILLING_TOOLTIPS = {
  inactive:
    "Subscription inactive. Open Billing to restore access before using this action.",
  inactiveAskAdmin:
    "Subscription inactive. Ask an organization admin to update billing.",
  extract: "Subscription inactive. Restore billing to extract fields.",
  upload: "Subscription inactive. Restore billing to upload documents.",
  createClient: "Subscription inactive. Restore billing to create clients.",
  moveLeadToClient: "Subscription inactive. Restore billing to create clients from leads.",
  generatePdf: "Subscription inactive. Restore billing to generate PDFs.",
  assistant: "Subscription inactive. Restore billing to use the document assistant.",
  createTemplate: "Subscription inactive. Restore billing to create templates.",
  createWorkspace: "Subscription inactive. Restore billing to create workspaces.",
} as const;

export type BillingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | string;

export function normalizeBillingStatus(status?: string | null): string {
  return String(status || "").toLowerCase();
}

export function isCancelableSubscription(status?: string | null, cancelAtPeriodEnd?: boolean) {
  const s = normalizeBillingStatus(status);
  if (cancelAtPeriodEnd) return false;
  return s === "active" || s === "trialing" || s === "past_due";
}

export function isResumableSubscription(status?: string | null, cancelAtPeriodEnd?: boolean) {
  const s = normalizeBillingStatus(status);
  return Boolean(cancelAtPeriodEnd) && (s === "active" || s === "trialing" || s === "past_due");
}

export function canSwitchLivePlan(status?: string | null, canUseProduct?: boolean) {
  if (!canUseProduct) return false;
  const s = normalizeBillingStatus(status);
  return s === "active" || s === "trialing" || s === "past_due";
}
