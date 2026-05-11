import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiEye,
  FiGrid,
  FiHash,
  FiMail,
  FiShield,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Modal from "../Reusable/Modal";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import {
  RoleCount,
  SuperAdminService,
  SuperAdminWorkspaceDetails,
  SuperAdminWorkspaceRow,
  SuperAdminWorkspacesSummary,
} from "../../service/superAdminService";

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

const safeText = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
};

const getInitials = (value?: string | null) => {
  if (!value) return "WS";
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "WS";
};

const statusTone = (status?: string | null) => {
  const normalized = String(status || "none").toLowerCase();

  if (["active", "trialing"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-500";
  }

  if (
    ["past_due", "incomplete", "incomplete_expired", "unpaid"].includes(
      normalized,
    )
  ) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-500";
  }

  if (["canceled", "paused"].includes(normalized)) {
    return "border-red-400/30 bg-red-500/10 text-red-500";
  }

  return "border-card-border bg-muted/40 text-card-text";
};

function StatusPill({ value }: { value?: string | null }) {
  const label = value ? String(value).replace(/_/g, " ") : "none";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(
        value,
      )}`}
    >
      {label}
    </span>
  );
}

function MiniMetric({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-background/50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl border border-card-border bg-card p-2 text-card-text">
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tight text-text">
            {value}
          </div>
          <div className="mt-0.5 text-xs font-medium text-card-text">
            {label}
          </div>
        </div>
      </div>
      {hint ? <div className="mt-3 text-xs text-card-text">{hint}</div> : null}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-background/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-card-text">
        {icon ? <span className="text-card-text">{icon}</span> : null}
        {label}
      </div>
      <div className="break-words text-sm font-semibold text-text">
        {safeText(value)}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-text">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function RoleBreakdownCard({ roles }: { roles?: RoleCount[] }) {
  const total = roles?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;

  return (
    <div className="rounded-2xl border border-card-border bg-background/40 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-text">Workspace Roles</div>
          <div className="text-xs text-card-text">
            {total} total assigned roles
          </div>
        </div>
        <div className="rounded-full border border-card-border px-3 py-1 text-xs font-semibold text-card-text">
          {roles?.length || 0} roles
        </div>
      </div>

      <div className="space-y-3">
        {roles?.length ? (
          roles.map((item) => {
            const percent =
              total > 0 ? Math.round((item.count / total) * 100) : 0;

            return (
              <div key={item.role} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text">{item.role}</span>
                  <span className="text-card-text">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-card-border p-4 text-sm text-card-text">
            No role information available.
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-card-border p-5 text-center text-sm text-card-text">
      {text}
    </div>
  );
}

function WorkspaceDetailsModal({
  isOpen,
  loading,
  error,
  workspace,
  onClose,
}: {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  workspace: SuperAdminWorkspaceDetails | null;
  onClose: () => void;
}) {
  const subscription = workspace?.subscription;
  const organization = workspace?.organization;
  const planName =
    subscription?.plan?.name || subscription?.planSnapshot?.name || "-";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="max-w-6xl"
      className="max-h-[92vh] overflow-hidden p-0"
      showCloseButton={false}
    >
      <div className="flex max-h-[92vh] flex-col">
        <div className="shrink-0 border-b border-card-border bg-card px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-primary/10 text-base font-black text-primary sm:h-14 sm:w-14 sm:text-lg">
                {getInitials(workspace?.name)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-xl font-bold tracking-tight text-text sm:text-2xl">
                    {workspace?.name || "Workspace Details"}
                  </h2>
                  <StatusPill value={subscription?.status || null} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-card-text">
                  <span className="inline-flex items-center gap-1.5">
                    <FiHash className="h-4 w-4" />
                    {workspace?.slug || "-"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiBriefcase className="h-4 w-4" />
                    {organization?.name || "No organization"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiCalendar className="h-4 w-4" />
                    Updated {prettyDate(workspace?.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-card-border bg-background px-4 py-2 text-sm font-semibold text-card-text transition hover:bg-muted hover:text-text sm:w-auto"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-muted/60"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm font-medium text-red-500">
              {error}
            </div>
          ) : workspace ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MiniMetric
                  label="Members"
                  value={
                    workspace.counts?.members ?? workspace.memberCount ?? 0
                  }
                  icon={<FiUsers className="h-5 w-5" />}
                  hint="Assigned users in this workspace"
                />
                <MiniMetric
                  label="Admins"
                  value={workspace.adminCount ?? 0}
                  icon={<FiShield className="h-5 w-5" />}
                  hint="Workspace administrators"
                />
                <MiniMetric
                  label="Org Workspaces"
                  value={workspace.counts?.organizationWorkspaces ?? 0}
                  icon={<FiGrid className="h-5 w-5" />}
                  hint="Total workspaces in parent org"
                />
                <MiniMetric
                  label="Org Members"
                  value={workspace.counts?.organizationMembers ?? 0}
                  icon={<FiBriefcase className="h-5 w-5" />}
                  hint="Organization-level members"
                />
              </div>

              <DetailSection title="Workspace Profile">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoCard
                    label="Workspace Name"
                    value={workspace.name}
                    icon={<FiGrid />}
                  />
                  <InfoCard
                    label="Workspace Slug"
                    value={workspace.slug}
                    icon={<FiHash />}
                  />
                  <InfoCard
                    label="Created At"
                    value={prettyDateTime(workspace.createdAt)}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Updated At"
                    value={prettyDateTime(workspace.updatedAt)}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Created By"
                    value={
                      workspace.createdBy?.fullName ||
                      workspace.createdBy?.username ||
                      workspace.createdBy?.email
                    }
                    icon={<FiUsers />}
                  />
                  <InfoCard
                    label="Creator Email"
                    value={workspace.createdBy?.email}
                    icon={<FiMail />}
                  />
                </div>
              </DetailSection>

              <DetailSection title="Parent Organization">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoCard
                    label="Organization"
                    value={organization?.name}
                    icon={<FiBriefcase />}
                  />
                  <InfoCard
                    label="Organization Slug"
                    value={organization?.slug}
                    icon={<FiHash />}
                  />
                  <InfoCard
                    label="Legal Name"
                    value={organization?.legalName}
                    icon={<FiBriefcase />}
                  />
                  <InfoCard
                    label="Industry"
                    value={organization?.industry}
                    icon={<FiBriefcase />}
                  />
                  <InfoCard
                    label="Company Size"
                    value={organization?.size}
                    icon={<FiUsers />}
                  />
                  <InfoCard
                    label="Contact Email"
                    value={organization?.contactEmail}
                    icon={<FiMail />}
                  />
                  <InfoCard
                    label="Timezone"
                    value={organization?.settings?.timezone}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Locale"
                    value={organization?.settings?.locale}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Currency"
                    value={organization?.settings?.currency}
                    icon={<FiCreditCard />}
                  />
                </div>
              </DetailSection>

              <DetailSection title="Organization Subscription">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-card-border bg-background/40 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-card-text">
                      Status
                    </div>
                    <StatusPill value={subscription?.status || null} />
                  </div>
                  <InfoCard
                    label="Plan"
                    value={planName}
                    icon={<FiCreditCard />}
                  />
                  <InfoCard
                    label="Billing Cycle"
                    value={subscription?.billingCycle}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Current Period End"
                    value={prettyDate(subscription?.currentPeriodEnd)}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Trial Start"
                    value={prettyDate(subscription?.trialStart)}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Trial End"
                    value={prettyDate(subscription?.trialEnd)}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Cancel At Period End"
                    value={subscription?.cancelAtPeriodEnd ? "Yes" : "No"}
                    icon={
                      subscription?.cancelAtPeriodEnd ? (
                        <FiXCircle />
                      ) : (
                        <FiCheckCircle />
                      )
                    }
                  />
                  <InfoCard
                    label="Last Synced"
                    value={prettyDateTime(subscription?.lastSyncedAt)}
                    icon={<FiCalendar />}
                  />
                </div>
              </DetailSection>

              <DetailSection title="Workspace Role Distribution">
                <RoleBreakdownCard roles={workspace.roleBreakdown || []} />
              </DetailSection>

              <DetailSection title="Recent Workspace Members">
                {workspace.membersPreview?.length ? (
                  <div className="overflow-hidden rounded-2xl border border-card-border">
                    {workspace.membersPreview.map((member) => (
                      <div
                        key={member._id}
                        className="flex flex-col justify-between gap-3 border-b border-card-border bg-background/30 px-4 py-3 last:border-b-0 md:flex-row md:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-muted text-sm font-bold text-text">
                            {getInitials(
                              member.user?.fullName ||
                                member.user?.username ||
                                member.user?.email,
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-text">
                              {member.user?.fullName ||
                                member.user?.username ||
                                member.user?.email ||
                                "-"}
                            </div>
                            <div className="text-xs text-card-text">
                              {member.user?.email || "-"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusPill value={member.role} />
                          <span className="text-xs text-card-text">
                            Added {prettyDate(member.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No workspace members found." />
                )}
              </DetailSection>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
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
  const [role, setRole] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<SuperAdminWorkspaceDetails | null>(null);

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

  const openDetails = useCallback(async (workspaceId: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedWorkspace(null);

    try {
      const details = await SuperAdminService.getWorkspaceDetails(workspaceId);
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
            onClick={() => void openDetails(row._id)}
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
          value={
            summary.atRiskSubscriptionWorkspaces +
            summary.noSubscriptionWorkspaces
          }
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

      <WorkspaceDetailsModal
        isOpen={detailsOpen}
        loading={detailsLoading}
        error={detailsError}
        workspace={selectedWorkspace}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
