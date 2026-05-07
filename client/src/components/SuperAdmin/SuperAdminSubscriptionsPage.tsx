import { useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCreditCard, FiTrendingUp, FiXCircle } from "react-icons/fi";
import { useNavigate } from "react-router";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import { AdminSubscriptionItem, BillingService } from "../../service/billingService";
import Button from "../Reusable/Button";

const prettyDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
};

export default function SuperAdminSubscriptionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AdminSubscriptionItem[]>([]);
  const [summary, setSummary] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    pastDueSubscriptions: 0,
    canceledSubscriptions: 0,
    incompleteSubscriptions: 0,
    scheduledToCancel: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [billingCycle, setBillingCycle] = useState("");
  const [cancelFilter, setCancelFilter] = useState<"" | "true" | "false">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await BillingService.listAdminSubscriptions({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
        billingCycle: billingCycle || undefined,
        cancelAtPeriodEnd: cancelFilter,
      });
      setRows(data.subscriptions);
      setSummary(data.summary);
      setTotal(data.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, billingCycle, cancelFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        title: "Organization",
        dataIndex: "organization",
        render: (value: AdminSubscriptionItem["organization"]) => (
          <div>
            <div className="font-semibold text-text">{value?.name || "-"}</div>
            <div className="text-xs text-card-text">{value?.slug || "-"}</div>
          </div>
        ),
      },
      {
        title: "Plan",
        dataIndex: "plan",
        render: (value: AdminSubscriptionItem["plan"], row: AdminSubscriptionItem) => (
          <div>
            <div className="font-semibold text-text">{value?.name || row.planSnapshot?.name || "-"}</div>
            <div className="text-xs text-card-text">{value?.code || row.planSnapshot?.code || "-"}</div>
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: string) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold capitalize text-text">
            {String(value || "").replace(/_/g, " ")}
          </span>
        ),
      },
      {
        title: "Cycle",
        dataIndex: "billingCycle",
        render: (value: string) => <span className="text-sm capitalize text-card-text">{value || "-"}</span>,
      },
      {
        title: "Renewal / End Date",
        dataIndex: "currentPeriodEnd",
        render: (value: string | null, row: AdminSubscriptionItem) => (
          <div>
            <div className="text-sm text-text">{prettyDate(value)}</div>
            <div className="text-xs text-card-text">{row.cancelAtPeriodEnd ? "Scheduled to end" : "Renews"}</div>
          </div>
        ),
      },
      {
        title: "Stripe Subscription",
        dataIndex: "stripeSubscriptionId",
        render: (value: string | null) => (
          <span className="font-mono text-xs text-card-text">{value || "-"}</span>
        ),
      },
      {
        title: "Last Sync",
        dataIndex: "lastSyncedAt",
        render: (value: string | null) => <span className="text-sm text-card-text">{prettyDate(value)}</span>,
      },
      {
        title: "Actions",
        dataIndex: "_id",
        render: (_: string, row: AdminSubscriptionItem) => (
          <Button
            variant="secondary"
            className="!py-1 !px-2"
            onClick={() => navigate(`/super-admin/subscriptions/${row._id}`)}
          >
            View detail
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Subscriptions"
        description="Enterprise subscription visibility across all organizations, including billing health and renewal lifecycle."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Subscriptions"
          value={summary.totalSubscriptions}
          hint="Across all organizations"
          icon={<FiCreditCard className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Active + Trialing"
          value={summary.activeSubscriptions + summary.trialingSubscriptions}
          hint={`${summary.activeSubscriptions} active / ${summary.trialingSubscriptions} trialing`}
          icon={<FiTrendingUp className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="At Risk"
          value={summary.pastDueSubscriptions + summary.incompleteSubscriptions}
          hint={`${summary.pastDueSubscriptions} past due / ${summary.incompleteSubscriptions} incomplete`}
          icon={<FiAlertTriangle className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Ending / Canceled"
          value={summary.scheduledToCancel + summary.canceledSubscriptions}
          hint={`${summary.scheduledToCancel} period-end / ${summary.canceledSubscriptions} canceled`}
          icon={<FiXCircle className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-4">
        <Input
          name="subscriptionSearch"
          label="Search"
          placeholder="Organization, plan, stripe id..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          name="statusFilter"
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { label: "All statuses", value: "" },
            { label: "active", value: "active" },
            { label: "trialing", value: "trialing" },
            { label: "past_due", value: "past_due" },
            { label: "incomplete", value: "incomplete" },
            { label: "canceled", value: "canceled" },
            { label: "unpaid", value: "unpaid" },
            { label: "paused", value: "paused" },
          ]}
        />
        <Select
          name="cycleFilter"
          label="Billing cycle"
          value={billingCycle}
          onChange={(e) => {
            setBillingCycle(e.target.value);
            setPage(1);
          }}
          options={[
            { label: "All cycles", value: "" },
            { label: "monthly", value: "monthly" },
            { label: "yearly", value: "yearly" },
          ]}
        />
        <Select
          name="cancelFilter"
          label="Period-end cancellation"
          value={cancelFilter}
          onChange={(e) => {
            setCancelFilter(e.target.value as "" | "true" | "false");
            setPage(1);
          }}
          options={[
            { label: "All", value: "" },
            { label: "Scheduled", value: "true" },
            { label: "Not scheduled", value: "false" },
          ]}
        />
      </div>

      <DataTable
        loading={loading}
        data={rows}
        columns={columns}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />
    </div>
  );
}
