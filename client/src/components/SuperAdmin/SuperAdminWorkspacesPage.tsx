import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCalendar,
  FiEye,
  FiGrid,
  FiHash,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import {
  SuperAdminService,
  SuperAdminWorkspaceDetails,
  SuperAdminWorkspaceRow,
  SuperAdminWorkspacesSummary,
} from "../../service/superAdminService";
import {
  DetailList,
  DetailModalHeader,
  DetailModalShell,
  DetailSection,
  EmptyState,
  FieldList,
  MetricStrip,
  StatusPill,
  getInitials,
  prettyDate,
  prettyDateTime,
  safeText,
} from "./superAdminDetailUi";

type WorkspacePreview = {
  name: string;
  slug?: string | null;
  updatedAt?: string | null;
  organizationName?: string | null;
  subscriptionStatus?: string | null;
};

function WorkspaceDetailsModal({
  isOpen,
  loading,
  error,
  workspace,
  preview,
  onClose,
}: {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  workspace: SuperAdminWorkspaceDetails | null;
  preview: WorkspacePreview | null;
  onClose: () => void;
}) {
  const subscription = workspace?.subscription;
  const organization = workspace?.organization;
  const title = workspace?.name || preview?.name || "Workspace details";
  const slug = workspace?.slug || preview?.slug || "—";
  const updatedAt = workspace?.updatedAt || preview?.updatedAt;
  const orgName =
    organization?.name || preview?.organizationName || "No organization";
  const status = subscription?.status || preview?.subscriptionStatus || null;
  const planName =
    subscription?.plan?.name || subscription?.planSnapshot?.name || "—";

  return (
    <DetailModalShell
      isOpen={isOpen}
      onClose={onClose}
      loading={loading}
      loadingLabel="Loading workspace…"
      error={error}
      header={
        <DetailModalHeader
          initials={getInitials(title, "WS")}
          title={title}
          status={status}
          onClose={onClose}
          meta={
            <>
              <span className="inline-flex items-center gap-1">
                <FiHash className="h-3.5 w-3.5" />
                {slug}
              </span>
              <span className="inline-flex items-center gap-1">
                <FiBriefcase className="h-3.5 w-3.5" />
                {orgName}
              </span>
              <span className="inline-flex items-center gap-1">
                <FiCalendar className="h-3.5 w-3.5" />
                Updated {prettyDate(updatedAt)}
              </span>
            </>
          }
        />
      }
    >
      {workspace ? (
        <div className="space-y-5">
          <MetricStrip
            items={[
              {
                label: "Members",
                value: workspace.counts?.members ?? workspace.memberCount ?? 0,
              },
              {
                label: "Admins",
                value: workspace.adminCount ?? 0,
              },
              {
                label: "Org workspaces",
                value: workspace.counts?.organizationWorkspaces ?? 0,
              },
              {
                label: "Org members",
                value: workspace.counts?.organizationMembers ?? 0,
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <DetailSection title="Workspace">
              <FieldList
                fields={[
                  { label: "Name", value: workspace.name },
                  { label: "Slug", value: workspace.slug },
                  { label: "Created", value: prettyDateTime(workspace.createdAt) },
                  { label: "Updated", value: prettyDateTime(workspace.updatedAt) },
                  {
                    label: "Created by",
                    value:
                      workspace.createdBy?.fullName ||
                      workspace.createdBy?.username ||
                      workspace.createdBy?.email,
                  },
                  { label: "Creator email", value: workspace.createdBy?.email },
                ]}
              />
            </DetailSection>

            <DetailSection title="Parent organization">
              <FieldList
                fields={[
                  { label: "Organization", value: organization?.name },
                  { label: "Slug", value: organization?.slug },
                  { label: "Legal name", value: organization?.legalName },
                  { label: "Industry", value: organization?.industry },
                  { label: "Company size", value: organization?.size },
                  { label: "Contact email", value: organization?.contactEmail },
                  { label: "Timezone", value: organization?.settings?.timezone },
                  { label: "Locale", value: organization?.settings?.locale },
                  { label: "Currency", value: organization?.settings?.currency },
                ]}
              />
            </DetailSection>
          </div>

          <DetailSection title="Organization subscription">
            <div className="overflow-hidden rounded-xl border border-card-border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border bg-card/40 px-3.5 py-3">
                <div>
                  <div className="text-xs font-medium text-card-text">Status</div>
                  <div className="mt-1">
                    <StatusPill value={subscription?.status || null} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-card-text">Plan</div>
                  <div className="mt-1 text-sm font-semibold text-text">{planName}</div>
                </div>
              </div>
              <FieldList
                framed={false}
                fields={[
                  {
                    label: "Billing cycle",
                    value: safeText(subscription?.billingCycle),
                  },
                  {
                    label: "Period end",
                    value: prettyDate(subscription?.currentPeriodEnd),
                  },
                  {
                    label: "Trial",
                    value:
                      subscription?.trialStart || subscription?.trialEnd
                        ? `${prettyDate(subscription?.trialStart)} → ${prettyDate(subscription?.trialEnd)}`
                        : "—",
                  },
                  {
                    label: "Cancel at period end",
                    value: subscription?.cancelAtPeriodEnd ? "Yes" : "No",
                  },
                  {
                    label: "Last synced",
                    value: prettyDateTime(subscription?.lastSyncedAt),
                  },
                ]}
              />
            </div>
          </DetailSection>

          <DetailSection title="Workspace members">
            {workspace.membersPreview?.length ? (
              <DetailList>
                {workspace.membersPreview.map((member) => (
                  <div
                    key={member._id}
                    className="flex flex-col justify-between gap-2 px-3.5 py-2.5 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-text">
                        {getInitials(
                          member.user?.fullName ||
                            member.user?.username ||
                            member.user?.email,
                          "U",
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-text">
                          {member.user?.fullName ||
                            member.user?.username ||
                            member.user?.email ||
                            "—"}
                        </div>
                        <div className="truncate text-xs text-card-text">
                          {member.user?.email || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-card-text">
                      <span>
                        {member.user?.role === "superAdmin" ? "Super admin" : "User"}
                      </span>
                      <span>Added {prettyDate(member.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </DetailList>
            ) : (
              <EmptyState text="No workspace members found." />
            )}
          </DetailSection>
        </div>
      ) : null}
    </DetailModalShell>
  );
}

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
  const [subscriptionStatus, setSubscriptionStatus] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<SuperAdminWorkspaceDetails | null>(null);
  const [workspacePreview, setWorkspacePreview] =
    useState<WorkspacePreview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SuperAdminService.listWorkspaces({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        subscriptionStatus: subscriptionStatus || undefined,
      });

      setRows(data.workspaces);
      setSummary(data.summary);
      setTotal(data.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, subscriptionStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetails = useCallback(async (row: SuperAdminWorkspaceRow) => {
    setWorkspacePreview({
      name: row.name,
      slug: row.slug,
      updatedAt: row.updatedAt,
      organizationName: row.organization?.name || null,
      subscriptionStatus: row.subscription?.status || null,
    });
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedWorkspace(null);

    try {
      const details = await SuperAdminService.getWorkspaceDetails(row._id);
      setSelectedWorkspace(details);
    } catch (error: any) {
      setDetailsError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load workspace details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }, []);

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
            <div className="text-sm font-semibold text-text">
              {org?.name || "-"}
            </div>
            <div className="text-xs text-card-text">{org?.slug || "-"}</div>
          </div>
        ),
      },
      {
        title: "Membership Health",
        dataIndex: "memberCount",
        render: (_: number, row: SuperAdminWorkspaceRow) => (
          <div>
            <div className="text-sm text-text">
              {row.memberCount || 0} members
            </div>
            <div className="text-xs text-card-text">
              {row.adminCount || 0} admins
            </div>
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
              {value?.billingCycle || "-"} •{" "}
              {prettyDate(value?.currentPeriodEnd || null)}
            </div>
          </div>
        ),
      },
      {
        title: "Updated",
        dataIndex: "updatedAt",
        render: (value: string) => (
          <span className="text-sm text-card-text">{prettyDate(value)}</span>
        ),
      },
      {
        title: "Action",
        dataIndex: "_id",
        render: (_: string, row: SuperAdminWorkspaceRow) => (
          <button
            type="button"
            onClick={() => void openDetails(row)}
            className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-background/60 px-3 py-2 text-sm font-semibold text-text transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <FiEye className="h-4 w-4" />
            Details
          </button>
        ),
      },
    ],
    [openDetails],
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
          icon={<FiGrid className="h-4 w-4" />}
          iconClassName="text-primary"
          loading={loading}
        />
        <StatCard
          title="Workspace Members"
          value={summary.totalWorkspaceMembers}
          hint={`${summary.totalWorkspaceAdmins} admins across all workspaces`}
          icon={<FiUsers className="h-4 w-4" />}
          iconClassName="text-info"
          loading={loading}
        />
        <StatCard
          title="Covered by Active Billing"
          value={summary.activeSubscriptionWorkspaces}
          hint="Workspaces whose org subscription is active"
          icon={<FiShield className="h-4 w-4" />}
          iconClassName="text-success"
          loading={loading}
        />
        <StatCard
          title="At Risk / Uncovered"
          value={
            summary.atRiskSubscriptionWorkspaces +
            summary.noSubscriptionWorkspaces
          }
          hint={`${summary.atRiskSubscriptionWorkspaces} at risk / ${summary.noSubscriptionWorkspaces} no subscription`}
          icon={<FiAlertTriangle className="h-4 w-4" />}
          iconClassName="text-warning"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-2">
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

      <WorkspaceDetailsModal
        isOpen={detailsOpen}
        loading={detailsLoading}
        error={detailsError}
        workspace={selectedWorkspace}
        preview={workspacePreview}
        onClose={() => {
          setDetailsOpen(false);
          setWorkspacePreview(null);
          setSelectedWorkspace(null);
          setDetailsError(null);
        }}
      />
    </div>
  );
}
