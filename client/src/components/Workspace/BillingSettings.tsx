import { useEffect, useMemo, useState } from "react";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";
import PlanCard from "../Reusable/PlanCard";
import Segmented from "../Reusable/Segmented";
import Modal from "../Reusable/Modal";
import { BillingCycle, BillingService, Plan } from "../../service/billingService";
import { FiCalendar, FiCreditCard, FiExternalLink, FiRefreshCw, FiXCircle } from "react-icons/fi";

export default function BillingSettings() {
  const [billing, setBilling] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<null | "cancel" | "resume" | "portal" | "switch">(null);
  const [confirmAction, setConfirmAction] = useState<null | "cancel" | "resume">(null);

  const load = async () => {
    setLoading(true);
    try {
      const [billingData, planRows] = await Promise.all([
        BillingService.getOrganizationBilling(),
        BillingService.listPublicPlans(),
      ]);
      setBilling(billingData);
      setPlans(planRows);
      if (billingData?.subscription?.billingCycle) setCycle(billingData.subscription.billingCycle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activePlanCode = billing?.subscription?.plan?.code || billing?.subscription?.planSnapshot?.code;
  const usageRows = useMemo(() => billing?.usage || [], [billing?.usage]);
  const subscription = billing?.subscription;
  const canUseProduct = Boolean(billing?.access?.canUseProduct);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  };

  const statusMeta = useMemo(() => {
    if (!subscription) return { label: "Not started" };
    const status = String(subscription.status || "").toLowerCase();
    if (status === "active") return { label: "Active" };
    if (status === "trialing") return { label: "Trialing" };
    if (status === "past_due") return { label: "Past due" };
    if (status === "canceled") return { label: "Canceled" };
    return { label: status ? status.replace(/_/g, " ") : "Unknown" };
  }, [subscription]);

  const renewalMessage = useMemo(() => {
    if (!subscription) return "";
    if (subscription.cancelAtPeriodEnd) {
      return `Scheduled to end on ${formatDate(subscription.currentPeriodEnd)}. You can resume before this date.`;
    }
    if (subscription.status === "trialing" && subscription.trialEnd) {
      return `Trial ends on ${formatDate(subscription.trialEnd)}.`;
    }
    return `Renews automatically on ${formatDate(subscription.currentPeriodEnd)}.`;
  }, [subscription]);

  const closeConfirmModal = () => {
    if (actionLoading === "cancel" || actionLoading === "resume") return;
    setConfirmAction(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text">Billing & Subscription</h1>
        <p className="text-sm text-card-text">Manage plan, usage, and billing lifecycle for this organization.</p>
      </div>

      {loading ? <div className="text-sm text-card-text">Loading billing details...</div> : null}

      {!loading && !billing?.subscription ? (
        <Callout tone="warning" title="No active subscription">
          Start a subscription to continue using protected CRM features.
        </Callout>
      ) : null}

      {!loading && billing?.subscription ? (
        <div className="rounded-2xl border border-card-border bg-card p-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <div className="text-card-text">Status</div>
              <div className="font-semibold text-text">{statusMeta.label}</div>
            </div>
            <div>
              <div className="text-card-text">Current plan</div>
              <div className="font-semibold text-text">{billing.subscription.plan?.name || billing.subscription.planSnapshot?.name}</div>
            </div>
            <div>
              <div className="text-card-text">Billing cycle</div>
              <div className="font-semibold capitalize text-text">{billing.subscription.billingCycle || "-"}</div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-card-border bg-background/40 px-3 py-2 text-xs text-card-text">
            <span className="inline-flex items-center gap-2">
              <FiCalendar size={14} className="text-card-text" />
              {renewalMessage}
            </span>
          </div>
          {!canUseProduct ? (
            <div className="mt-3 rounded-xl border border-warning-border bg-warning-muted px-3 py-2 text-xs text-warning">
              Access is currently restricted. Complete payment or update billing details to restore full access.
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              isLoading={actionLoading === "portal"}
              onClick={async () => {
                try {
                  setActionLoading("portal");
                  const d = await BillingService.createPortalSession();
                  if (d?.portalUrl) window.open(d.portalUrl, "_blank", "noopener,noreferrer");
                } finally {
                  setActionLoading(null);
                }
              }}
            >
              <span className="inline-flex items-center gap-2">
                <FiExternalLink size={14} />
                Open billing portal
              </span>
            </Button>
            {subscription.cancelAtPeriodEnd ? (
              <Button
                variant="primary"
                isLoading={actionLoading === "resume"}
                onClick={() => setConfirmAction("resume")}
              >
                <span className="inline-flex items-center gap-2">
                  <FiRefreshCw size={14} />
                  Resume auto-renew
                </span>
              </Button>
            ) : (
              <Button
                variant="warning"
                isLoading={actionLoading === "cancel"}
                onClick={() => setConfirmAction("cancel")}
              >
                <span className="inline-flex items-center gap-2">
                  <FiXCircle size={14} />
                  Cancel at period end
                </span>
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <h2 className="text-lg font-semibold text-text">Usage vs limits</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {usageRows.map((row: any) => (
            <div key={row.key} className="rounded-xl border border-card-border p-3 text-sm">
              <div className="font-semibold text-text">{row.label}</div>
              <div className="text-card-text">
                {row.usage} / {row.unlimited ? "Unlimited" : row.limit ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-text">
            <FiCreditCard size={18} />
            Change plan
          </h2>
          <Segmented
            value={cycle}
            onChange={(value) => setCycle(value as BillingCycle)}
            options={[
              { label: "Monthly", key: "monthly" },
              { label: "Yearly", key: "yearly" },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan._id}
              name={plan.name}
              description={plan.description}
              recommended={plan.recommended}
              pricing={plan.pricing}
              billingCycle={cycle}
              entitlements={plan.entitlements}
              disabled={activePlanCode === plan.code || !plan.pricing || actionLoading === "switch"}
              actionLabel={
                activePlanCode === plan.code ? "Current plan" : !plan.pricing ? "Pricing unavailable" : "Switch plan"
              }
              onAction={
                !plan.pricing
                  ? undefined
                  : () =>
                      void (async () => {
                        try {
                          setActionLoading("switch");
                          if (billing?.subscription) {
                            await BillingService.changePlan(plan._id, cycle);
                            await load();
                          } else {
                            const d = await BillingService.createCheckoutSession(plan._id, cycle);
                            if (d?.checkoutUrl) window.location.href = d.checkoutUrl;
                          }
                        } finally {
                          setActionLoading(null);
                        }
                      })()
              }
            />
          ))}
        </div>
      </div>

      <Modal isOpen={confirmAction !== null} onClose={closeConfirmModal} className="max-w-xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text">
              {confirmAction === "cancel" ? "Cancel subscription at period end?" : "Resume auto-renew for subscription?"}
            </h3>
            <p className="mt-1 text-sm text-card-text">
              {confirmAction === "cancel"
                ? "Your subscription remains active until the current billing period ends. After that date, paid features and plan entitlements will stop unless you renew."
                : "Auto-renew will be restored and your subscription will continue billing automatically on the next renewal date."}
            </p>
          </div>

          <div className="rounded-xl border border-card-border bg-background/40 p-3 text-xs text-card-text">
            {confirmAction === "cancel" ? (
              <>
                <div>Current period end: {formatDate(subscription?.currentPeriodEnd)}</div>
                <div className="mt-1">You can resume auto-renew any time before this date.</div>
              </>
            ) : (
              <>
                <div>Next renewal date: {formatDate(subscription?.currentPeriodEnd)}</div>
                <div className="mt-1">Billing and access will continue without interruption.</div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeConfirmModal} disabled={actionLoading === "cancel" || actionLoading === "resume"}>
              Keep current setting
            </Button>
            {confirmAction === "cancel" ? (
              <Button
                variant="warning"
                isLoading={actionLoading === "cancel"}
                onClick={async () => {
                  try {
                    setActionLoading("cancel");
                    await BillingService.cancelSubscription(false);
                    await load();
                    setConfirmAction(null);
                  } finally {
                    setActionLoading(null);
                  }
                }}
              >
                Confirm cancel at period end
              </Button>
            ) : (
              <Button
                variant="primary"
                isLoading={actionLoading === "resume"}
                onClick={async () => {
                  try {
                    setActionLoading("resume");
                    await BillingService.resumeSubscription();
                    await load();
                    setConfirmAction(null);
                  } finally {
                    setActionLoading(null);
                  }
                }}
              >
                Confirm resume auto-renew
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
