import { useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCreditCard, FiGrid } from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import {
  SuperAdminOrganizationRow,
  SuperAdminOrganizationsSummary,
  SuperAdminService,
} from "../../service/superAdminService";

const prettyDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

export default function SuperAdminOrganizationsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SuperAdminOrganizationRow[]>([]);
  const [summary, setSummary] = useState<SuperAdminOrganizationsSummary>({
    totalOrganizations: 0,
    totalWorkspaces: 0,
    totalOrgMembers: 0,
    totalWorkspaceSeats: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    pastDueOrIncomplete: 0,
    noSubscription: 0,
    avgWorkspacesPerOrganization: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SuperAdminService.listOrganizations({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        subscriptionStatus: subscriptionStatus || undefined,
      });
      setRows(data.organizations);
      setSummary(data.summary);
      setTotal(data.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, subscriptionStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        title: "Organization",
        dataIndex: "name",
        render: (_: string, row: SuperAdminOrganizationRow) => (
          <div>
            <div className="font-semibold text-text">{row.name}</div>
            <div className="text-xs text-card-text">{row.slug}</div>
          </div>
        ),
      },
      {
        title: "Subscription Health",
        dataIndex: "subscription",
        render: (value: SuperAdminOrganizationRow["subscription"]) => (
          <div>
            <div className="text-sm font-semibold capitalize text-text">
              {value?.status ? String(value.status).replace(/_/g, " ") : "none"}
            </div>
            <div className="text-xs text-card-text">
              {value?.planSnapshot?.name || "-"} {value?.billingCycle ? `• ${value.billingCycle}` : ""}
            </div>
          </div>
        ),
      },
      {
        title: "Seats & Members",
        dataIndex: "orgMemberCount",
        render: (_: number, row: SuperAdminOrganizationRow) => (
          <div>
            <div className="text-sm text-text">Org members: {row.orgMemberCount}</div>
            <div className="text-xs text-card-text">Workspace seats: {row.workspaceSeatCount}</div>
          </div>
        ),
      },
      {
        title: "Workspaces",
        dataIndex: "workspaceCount",
        render: (value: number) => <span className="text-sm font-semibold text-text">{value || 0}</span>,
      },
      {
        title: "Renewal / End",
        dataIndex: "subscription",
        render: (value: SuperAdminOrganizationRow["subscription"]) => (
          <div>
            <div className="text-sm text-text">{prettyDate(value?.currentPeriodEnd || null)}</div>
            <div className="text-xs text-card-text">
              {value?.cancelAtPeriodEnd ? "Scheduled to end" : value?.status ? "Renews" : "No subscription"}
            </div>
          </div>
        ),
      },
      {
        title: "Updated",
        dataIndex: "updatedAt",
        render: (value: string) => <span className="text-sm text-card-text">{prettyDate(value)}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organizations"
        description="Enterprise organization intelligence: subscription posture, capacity footprint, and tenant health."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Organizations"
          value={summary.totalOrganizations}
          hint={`${summary.avgWorkspacesPerOrganization} avg workspaces per org`}
          icon={<RiBuildingLine className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Subscription Coverage"
          value={summary.activeSubscriptions + summary.trialingSubscriptions}
          hint={`${summary.activeSubscriptions} active / ${summary.trialingSubscriptions} trialing`}
          icon={<FiCreditCard className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="At Risk / Uncovered"
          value={summary.pastDueOrIncomplete + summary.noSubscription}
          hint={`${summary.pastDueOrIncomplete} at risk / ${summary.noSubscription} no subscription`}
          icon={<FiAlertTriangle className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Workspace Footprint"
          value={summary.totalWorkspaces}
          hint={`${summary.totalOrgMembers} org members / ${summary.totalWorkspaceSeats} workspace seats`}
          icon={<FiGrid className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-2">
        <Input
          name="orgSearch"
          label="Search organizations"
          placeholder="By name, slug, legal name, contact email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          name="orgSubscriptionStatus"
          label="Subscription status"
          value={subscriptionStatus}
          onChange={(e) => {
            setSubscriptionStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { label: "All", value: "" },
            { label: "none", value: "none" },
            { label: "active", value: "active" },
            { label: "trialing", value: "trialing" },
            { label: "past_due", value: "past_due" },
            { label: "incomplete", value: "incomplete" },
            { label: "canceled", value: "canceled" },
            { label: "unpaid", value: "unpaid" },
            { label: "paused", value: "paused" },
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
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />
    </div>
  );
}
