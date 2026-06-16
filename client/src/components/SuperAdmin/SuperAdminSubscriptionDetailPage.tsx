import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FiAlertTriangle, FiClock, FiRefreshCw, FiShield, FiXCircle } from "react-icons/fi";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";
import DataTable from "../Reusable/DataTable";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import {
  AdminSubscriptionDetailResponse,
  AdminSubscriptionItem,
  BillingService,
} from "../../service/billingService";

const prettyDateTime = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

export default function SuperAdminSubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | "sync" | "cancel" | "resume">(null);
  const [detail, setDetail] = useState<AdminSubscriptionDetailResponse | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await BillingService.getAdminSubscriptionDetail(id);
      setDetail(response);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const subscription = detail?.subscription as AdminSubscriptionItem | undefined;
  const riskFlags = detail?.riskFlags || [];

  const webhookColumns = useMemo(
    () => [
      {
        title: "Event Type",
        dataIndex: "eventType",
        render: (value: string) => <span className="text-sm text-text">{value}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: string) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold capitalize text-text">
            {value}
          </span>
        ),
      },
      {
        title: "Processed At",
        dataIndex: "processedAt",
        render: (value: string | null) => <span className="text-sm text-card-text">{prettyDateTime(value)}</span>,
      },
      {
        title: "Failure",
        dataIndex: "failureReason",
        render: (value: string | null) => (
          <span className={value ? "text-xs text-danger-text" : "text-xs text-card-text"}>{value || "-"}</span>
        ),
      },
      {
        title: "Event ID",
        dataIndex: "eventId",
        render: (value: string) => <span className="font-mono text-xs text-card-text">{value}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ label: "Back to subscriptions", onClick: () => navigate("/super-admin/subscriptions") }}
        title="Subscription Detail"
        description="Lifecycle, webhook sync history, risk posture, and org-level operational actions."
        actions={
          <Button
            variant="secondary"
            isLoading={actionLoading === "sync"}
            onClick={async () => {
              if (!id) return;
              try {
                setActionLoading("sync");
                const response = await BillingService.syncAdminSubscription(id);
                setDetail(response);
              } finally {
                setActionLoading(null);
              }
            }}
          >
            <span className="inline-flex items-center gap-2">
              <FiRefreshCw size={14} />
              Force sync from Stripe
            </span>
          </Button>
        }
      />

      {loading ? <div className="text-sm text-card-text">Loading subscription detail...</div> : null}

      {!loading && !subscription ? (
        <Callout tone="danger" title="Subscription not found">
          This subscription does not exist or is no longer accessible.
        </Callout>
      ) : null}

      {subscription ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Organization"
              value={subscription.organization?.name || "-"}
              hint={subscription.organization?.slug || "-"}
              icon={<FiShield className="h-5 w-5" />}
            />
            <StatCard
              title="Plan"
              value={subscription.plan?.name || subscription.planSnapshot?.name || "-"}
              hint={subscription.plan?.code || subscription.planSnapshot?.code || "-"}
              icon={<FiClock className="h-5 w-5" />}
            />
            <StatCard
              title="Status"
              value={String(subscription.status || "").replace(/_/g, " ")}
              hint={`Cycle: ${subscription.billingCycle || "-"}`}
              icon={<FiAlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              title="Renewal / End"
              value={prettyDateTime(subscription.currentPeriodEnd)}
              hint={subscription.cancelAtPeriodEnd ? "Scheduled to end" : "Auto-renew"}
              icon={<FiXCircle className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
              <h3 className="text-base font-semibold text-text">Risk Flags</h3>
              {riskFlags.length === 0 ? (
                <div className="text-sm text-card-text">No active risk flags detected.</div>
              ) : (
                <div className="space-y-2">
                  {riskFlags.map((flag) => (
                    <div key={flag.code} className="rounded-xl border border-card-border bg-background-muted p-3">
                      <div className="text-sm font-semibold text-text">{flag.label}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-card-text">
                        {flag.code} • {flag.severity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
              <h3 className="text-base font-semibold text-text">Org-Level Actions</h3>
              <p className="text-sm text-card-text">
                Use with care. These actions affect the organization subscription state immediately.
              </p>
              <div className="flex flex-wrap gap-2">
                {subscription.cancelAtPeriodEnd ? (
                  <Button
                    variant="primary"
                    isLoading={actionLoading === "resume"}
                    onClick={async () => {
                      if (!id) return;
                      try {
                        setActionLoading("resume");
                        const response = await BillingService.setAdminSubscriptionCancellation(id, false);
                        setDetail(response);
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                  >
                    Resume auto-renew
                  </Button>
                ) : (
                  <Button
                    variant="warning"
                    isLoading={actionLoading === "cancel"}
                    onClick={async () => {
                      if (!id) return;
                      try {
                        setActionLoading("cancel");
                        const response = await BillingService.setAdminSubscriptionCancellation(id, true);
                        setDetail(response);
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                  >
                    Cancel at period end
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
            <h3 className="text-base font-semibold text-text">Lifecycle Timeline</h3>
            <div className="space-y-2">
              {(detail?.lifecycleEvents || []).map((event) => (
                <div key={event.key} className="rounded-xl border border-card-border bg-background-muted p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-text">{event.title}</div>
                    <div className="text-xs text-card-text">{prettyDateTime(event.date)}</div>
                  </div>
                </div>
              ))}
              {(detail?.lifecycleEvents || []).length === 0 ? (
                <div className="text-sm text-card-text">No lifecycle events available yet.</div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-text">Webhook Sync History</h3>
            <DataTable data={detail?.webhookEvents || []} columns={webhookColumns} loading={loading} />
          </div>
        </>
      ) : null}
    </div>
  );
}
