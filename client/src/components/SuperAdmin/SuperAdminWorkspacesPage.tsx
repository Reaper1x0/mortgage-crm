import { useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiGrid, FiShield, FiUsers } from "react-icons/fi";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import { SuperAdminService, SuperAdminWorkspaceRow, SuperAdminWorkspacesSummary } from "../../service/superAdminService";

const prettyDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

export default function SuperAdminWorkspacesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SuperAdminWorkspaceRow[]>([]);
  const [summary, setSummary] = useState<SuperAdminWorkspacesSummary>({
    totalWorkspaces: 0,
    totalWorkspaceMembers: 0,
    totalWorkspaceAdmins: 0,
    activeSubscriptionWorkspaces: 0,
    atRiskSubscriptionWorkspaces: 0,
    noSubscriptionWorkspaces: 0,
    avgMembersPerWorkspace: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SuperAdminService.listWorkspaces({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        role: role || undefined,
        subscriptionStatus: subscriptionStatus || undefined,
      });
      setRows(data.workspaces);
      setSummary(data.summary);
      setTotal(data.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, role, subscriptionStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        title: "Workspace",
        dataIndex: "name",
        render: (_: string, row: SuperAdminWorkspaceRow) => (
          <div>
            <div className="font-semibold text-text">{row.name}</div>
            <div className="text-xs text-card-text">{row.slug}</div>
          </div>
        ),
      },
      {
        title: "Organization",
        dataIndex: "organization",
        render: (org: SuperAdminWorkspaceRow["organization"]) => (
          <div>
            <div className="text-sm font-semibold text-text">{org?.name || "-"}</div>
            <div className="text-xs text-card-text">{org?.slug || "-"}</div>
          </div>
        ),
      },
      {
        title: "Membership Health",
        dataIndex: "memberCount",
        render: (_: number, row: SuperAdminWorkspaceRow) => (
          <div>
            <div className="text-sm text-text">{row.memberCount || 0} members</div>
            <div className="text-xs text-card-text">{row.adminCount || 0} admins</div>
          </div>
        ),
      },
      {
        title: "Org Subscription",
        dataIndex: "subscription",
        render: (value: SuperAdminWorkspaceRow["subscription"]) => (
          <div>
            <div className="text-sm font-semibold capitalize text-text">
              {value?.status ? String(value.status).replace(/_/g, " ") : "none"}
            </div>
            <div className="text-xs text-card-text">
              {value?.billingCycle || "-"} • {prettyDate(value?.currentPeriodEnd || null)}
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
        title="Workspaces"
        description="Operational workspace intelligence with member distribution and parent-organization subscription context."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Workspaces"
          value={summary.totalWorkspaces}
          hint={`${summary.avgMembersPerWorkspace} avg members/workspace`}
          icon={<FiGrid className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Workspace Members"
          value={summary.totalWorkspaceMembers}
          hint={`${summary.totalWorkspaceAdmins} admins across all workspaces`}
          icon={<FiUsers className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Covered by Active Billing"
          value={summary.activeSubscriptionWorkspaces}
          hint="Workspaces whose org subscription is active"
          icon={<FiShield className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="At Risk / Uncovered"
          value={summary.atRiskSubscriptionWorkspaces + summary.noSubscriptionWorkspaces}
          hint={`${summary.atRiskSubscriptionWorkspaces} at risk / ${summary.noSubscriptionWorkspaces} no subscription`}
          icon={<FiAlertTriangle className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-3">
        <Input
          name="workspaceSearch"
          label="Search workspaces"
          placeholder="By workspace name or slug..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          name="workspaceRoleFilter"
          label="Contains role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          options={[
            { label: "All roles", value: "" },
            { label: "Admin", value: "Admin" },
            { label: "Agent", value: "Agent" },
            { label: "Viewer", value: "Viewer" },
          ]}
        />
        <Select
          name="workspaceSubFilter"
          label="Org subscription status"
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
