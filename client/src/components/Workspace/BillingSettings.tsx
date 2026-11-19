import { useEffect, useMemo, useState } from "react";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";
import PlanCard from "../Reusable/PlanCard";
import Segmented from "../Reusable/Segmented";
import Modal from "../Reusable/Modal";
import { BillingCycle, BillingService, Plan } from "../../service/billingService";
import { FiCreditCard, FiExternalLink, FiRefreshCw, FiXCircle } from "react-icons/fi";
import { prettyDate } from "../../utils/date";
import {
  canSwitchLivePlan,
  isCancelableSubscription,
  isResumableSubscription,
  normalizeBillingStatus,
} from "../../utils/billingUi";
import { useBillingAccessOptional } from "../../context/BillingAccessContext";

export default function BillingSettings() {
  const billingAccess = useBillingAccessOptional();
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
      await billingAccess?.refreshBilling();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlanCode = billing?.subscription?.plan?.code || billing?.subscription?.planSnapshot?.code;
  const usageRows = useMemo(() => billing?.usage || [], [billing?.usage]);
  const subscription = billing?.subscription;
  const canUseProduct = Boolean(billing?.access?.canUseProduct);
  const status = normalizeBillingStatus(subscription?.status);
  const cancelAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd);

  const formatDate = (value?: string | null) => (value ? prettyDate(value) : "-");

  const statusMeta = useMemo(() => {
    if (!subscription) return { label: "Not started" };
    if (status === "active" && cancelAtPeriodEnd) return { label: "Canceling" };
    if (status === "active") return { label: "Active" };
    if (status === "trialing" && cancelAtPeriodEnd) return { label: "Trial ending" };
    if (status === "trialing") return { label: "Trialing" };
    if (status === "past_due") return { label: "Past due" };
    if (status === "canceled") return { label: "Canceled" };
    if (status === "unpaid") return { label: "Unpaid" };
    if (status === "incomplete" || status === "incomplete_expired") return { label: "Incomplete" };
    if (status === "paused") return { label: "Paused" };
    return { label: status ? status.replace(/_/g, " ") : "Unknown" };
  }, [subscription, status, cancelAtPeriodEnd]);

  const periodLabel = useMemo(() => {
    if (!subscription) return { title: "Renewal", value: "-" as string };
    if (status === "canceled") {
      return { title: "Ended", value: formatDate(subscription.currentPeriodEnd || subscription.canceledAt) };
    }
    if (cancelAtPeriodEnd) {
      return { title: "Ends", value: formatDate(subscription.currentPeriodEnd) };
    }
    if (status === "trialing") {
      return { title: "Trial ends", value: formatDate(subscription.trialEnd || subscription.currentPeriodEnd) };
    }
    return { title: "Renewal", value: formatDate(subscription.currentPeriodEnd) };
  }, [subscription, status, cancelAtPeriodEnd]);

  const renewalMessage = useMemo(() => {
    if (!subscription) return "";
    if (status === "canceled") {
      return `Subscription ended on ${formatDate(subscription.currentPeriodEnd)}. Resubscribe to restore paid features.`;
    }
    if (cancelAtPeriodEnd) {
      return `Scheduled to end on ${formatDate(subscription.currentPeriodEnd)}. You can resume before this date.`;
    }
    if (status === "trialing" && subscription.trialEnd) {
      return `Trial ends on ${formatDate(subscription.trialEnd)}.`;
    }
    if (status === "past_due") {
      return `Payment is past due. Access may continue until ${formatDate(subscription.currentPeriodEnd)}. Update billing details to avoid interruption.`;
    }
    if (status === "unpaid" || status === "incomplete" || status === "incomplete_expired" || status === "paused") {
      return "Paid features are unavailable until billing is restored.";
    }
    if (subscription.currentPeriodEnd) {
      return `Renews automatically on ${formatDate(subscription.currentPeriodEnd)}.`;
    }
    return "";
  }, [subscription, status, cancelAtPeriodEnd]);

  const restrictedMessage = useMemo(() => {
    if (canUseProduct) return null;
    if (status === "canceled") {
      return "Access is restricted because this subscription is canceled. Resubscribe or manage billing to restore paid features.";
    }
    if (status === "past_due") {
      return "Access is restricted. Complete payment or update billing details to restore full access.";
    }
    if (status === "unpaid" || status === "incomplete" || status === "incomplete_expired") {
      return "Access is restricted until checkout or payment is completed.";
    }
    return "Access is currently restricted. Open billing to restore paid features.";
  }, [canUseProduct, status]);

  const showCancel = isCancelableSubscription(status, cancelAtPeriodEnd);
  const showResume = isResumableSubscription(status, cancelAtPeriodEnd);
  const livePlanSwitch = canSwitchLivePlan(status, canUseProduct);

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
          Choose a plan below to start using protected CRM features.
        </Callout>
      ) : null}

      {!loading && billing?.subscription ? (
        <div className="rounded-xl border border-card-border bg-card p-6 text-sm">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-xs text-card-text">Status</div>
              <div className="mt-1 font-semibold text-text">{statusMeta.label}</div>
            </div>
            <div>
              <div className="text-xs text-card-text">Plan</div>
              <div className="mt-1 font-semibold text-text">
                {billing.subscription.plan?.name || billing.subscription.planSnapshot?.name || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-card-text">Billing cycle</div>
              <div className="mt-1 font-semibold capitalize text-text">
                {billing.subscription.billingCycle || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-card-text">{periodLabel.title}</div>
              <div className="mt-1 font-semibold text-text">{periodLabel.value}</div>
            </div>
          </div>
          {renewalMessage ? <div className="mt-4 text-sm text-card-text">{renewalMessage}</div> : null}
          {restrictedMessage ? (
            <div className="mt-3 rounded-xl border border-warning-border bg-warning-muted px-3 py-2 text-xs text-warning">
              {restrictedMessage}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
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
                Manage billing
              </span>
            </Button>
            {showResume ? (
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
            ) : null}
            {showCancel ? (
              <Button
                variant="danger-soft"
                isLoading={actionLoading === "cancel"}
                onClick={() => setConfirmAction("cancel")}
              >
                <span className="inline-flex items-center gap-2">
                  <FiXCircle size={14} />
                  Cancel at period end
                </span>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <h2 className="text-lg font-semibold text-text">Usage vs limits</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {usageRows.map((row: any) => {
            const limit = row.unlimited ? null : Number(row.limit || 0);
            const usage = Number(row.usage || 0);
            const percent = limit && limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0;
            return (
              <div key={row.key} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-text">{row.label}</div>
                  <div className="text-card-text">
                    {usage} / {row.unlimited ? "Unlimited" : limit ?? 0}
                  </div>
                </div>
                {!row.unlimited ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-text">
            <FiCreditCard size={18} />
            {canUseProduct ? "Change plan" : "Choose a plan"}
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
        {!canUseProduct ? (
          <p className="text-sm text-card-text">
            Select a plan to checkout and restore paid features for this organization.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = activePlanCode === plan.code && canUseProduct;
            const actionLabel = !plan.pricing
              ? "Pricing unavailable"
              : isCurrent
                ? "Current plan"
                : livePlanSwitch
                  ? "Switch plan"
                  : "Subscribe";
            return (
              <PlanCard
                key={plan._id}
                name={plan.name}
                description={plan.description}
                recommended={plan.recommended}
                pricing={plan.pricing}
                billingCycle={cycle}
                entitlements={plan.entitlements}
                disabled={isCurrent || !plan.pricing || actionLoading === "switch"}
                actionLabel={actionLabel}
                onAction={
                  !plan.pricing || isCurrent
                    ? undefined
                    : () =>
                        void (async () => {
                          try {
                            setActionLoading("switch");
                            if (livePlanSwitch) {
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
            );
          })}
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
                ? "Your subscription remains active until the current billing period ends. After that date, paid features will stop unless you renew."
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
            <Button
              variant="secondary"
              onClick={closeConfirmModal}
              disabled={actionLoading === "cancel" || actionLoading === "resume"}
            >
              Keep current setting
            </Button>
            {confirmAction === "cancel" ? (
              <Button
                variant="danger-soft"
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
