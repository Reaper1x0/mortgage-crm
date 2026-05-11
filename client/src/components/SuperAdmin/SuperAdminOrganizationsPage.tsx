import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiExternalLink,
  FiEye,
  FiGrid,
  FiHash,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Modal from "../Reusable/Modal";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import {
  RoleCount,
  SuperAdminOrganizationDetails,
  SuperAdminOrganizationRow,
  SuperAdminOrganizationsSummary,
  SuperAdminService,
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
  if (!value) return "OR";
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "OR";
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
  href,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
  href?: string | null;
}) {
  const content = safeText(value);

  return (
    <div className="rounded-2xl border border-card-border bg-background/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-card-text">
        {icon ? <span className="text-card-text">{icon}</span> : null}
        {label}
      </div>

      {href && value ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-2 break-all text-sm font-semibold text-primary hover:underline"
        >
          {content}
          <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      ) : (
        <div className="break-words text-sm font-semibold text-text">
          {content}
        </div>
      )}
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

function RoleBreakdownCard({
  title,
  roles,
}: {
  title: string;
  roles?: RoleCount[];
}) {
  const total = roles?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;

  return (
    <div className="rounded-2xl border border-card-border bg-background/40 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-text">{title}</div>
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

const formatAddress = (org?: SuperAdminOrganizationDetails | null) => {
  const address = org?.address;
  if (!address) return "-";

  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
};

function OrganizationDetailsModal({
  isOpen,
  loading,
  error,
  organization,
  onClose,
}: {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  organization: SuperAdminOrganizationDetails | null;
  onClose: () => void;
}) {
  const subscription = organization?.subscription;
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
                {getInitials(organization?.name)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-xl font-bold tracking-tight text-text sm:text-2xl">
                    {organization?.name || "Organization Details"}
                  </h2>
                  <StatusPill value={subscription?.status || null} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-card-text">
                  <span className="inline-flex items-center gap-1.5">
                    <FiHash className="h-4 w-4" />
                    {organization?.slug || "-"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiCalendar className="h-4 w-4" />
                    Updated {prettyDate(organization?.updatedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiCreditCard className="h-4 w-4" />
                    {planName}
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
          ) : organization ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MiniMetric
                  label="Workspaces"
                  value={
                    organization.counts?.workspaces ??
                    organization.workspaceCount ??
                    0
                  }
                  icon={<FiGrid className="h-5 w-5" />}
                  hint="Total workspaces under this tenant"
                />
                <MiniMetric
                  label="Organization Members"
                  value={
                    organization.counts?.organizationMembers ??
                    organization.orgMemberCount ??
                    0
                  }
                  icon={<FiUsers className="h-5 w-5" />}
                  hint="Users assigned at organization level"
                />
                <MiniMetric
                  label="Workspace Seats"
                  value={
                    organization.counts?.workspaceSeats ??
                    organization.workspaceSeatCount ??
                    0
                  }
                  icon={<FiBriefcase className="h-5 w-5" />}
                  hint="Total assigned workspace memberships"
                />
              </div>

              <DetailSection title="Business Profile">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoCard
                    label="Legal Name"
                    value={organization.legalName}
                    icon={<RiBuildingLine />}
                  />
                  <InfoCard
                    label="Industry"
                    value={organization.industry}
                    icon={<FiBriefcase />}
                  />
                  <InfoCard
                    label="Company Size"
                    value={organization.size}
                    icon={<FiUsers />}
                  />
                  <InfoCard
                    label="Contact Email"
                    value={organization.contactEmail}
                    icon={<FiMail />}
                  />
                  <InfoCard
                    label="Phone"
                    value={organization.phone}
                    icon={<FiPhone />}
                  />
                  <InfoCard
                    label="Website"
                    value={organization.website}
                    href={organization.website}
                    icon={<FiExternalLink />}
                  />
                  <InfoCard
                    label="Address"
                    value={formatAddress(organization)}
                    icon={<FiMapPin />}
                  />
                  <InfoCard
                    label="Timezone"
                    value={organization.settings?.timezone}
                    icon={<FiCalendar />}
                  />
                  <InfoCard
                    label="Currency"
                    value={organization.settings?.currency}
                    icon={<FiCreditCard />}
                  />
                </div>
              </DetailSection>

              <DetailSection title="Subscription & Billing">
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

              <DetailSection title="Role Distribution">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <RoleBreakdownCard
                    title="Organization Roles"
                    roles={organization.roleBreakdown?.organization || []}
                  />
                  <RoleBreakdownCard
                    title="Workspace Roles"
                    roles={organization.roleBreakdown?.workspace || []}
                  />
                </div>
              </DetailSection>

              <DetailSection title="Recent Workspaces">
                {organization.recentWorkspaces?.length ? (
                  <div className="overflow-hidden rounded-2xl border border-card-border">
                    {organization.recentWorkspaces.map((workspace) => (
                      <div
                        key={workspace._id}
                        className="flex flex-col justify-between gap-3 border-b border-card-border bg-background/30 px-4 py-3 last:border-b-0 md:flex-row md:items-center"
                      >
                        <div>
                          <div className="font-semibold text-text">
                            {workspace.name}
                          </div>
                          <div className="mt-0.5 text-xs text-card-text">
                            {workspace.slug}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-card-border px-2.5 py-1 text-card-text">
                            {workspace.memberCount || 0} members
                          </span>
                          <span className="rounded-full border border-card-border px-2.5 py-1 text-card-text">
                            {workspace.adminCount || 0} admins
                          </span>
                          <span className="rounded-full border border-card-border px-2.5 py-1 text-card-text">
                            Updated {prettyDate(workspace.updatedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No workspaces found for this organization." />
                )}
              </DetailSection>

              <DetailSection title="Recent Organization Members">
                {organization.membersPreview?.length ? (
                  <div className="overflow-hidden rounded-2xl border border-card-border">
                    {organization.membersPreview.map((member) => (
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
                  <EmptyState text="No organization members found." />
                )}
              </DetailSection>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

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

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] =
    useState<SuperAdminOrganizationDetails | null>(null);

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

  const openDetails = useCallback(async (organizationId: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedOrganization(null);

    try {
      const details =
        await SuperAdminService.getOrganizationDetails(organizationId);
      setSelectedOrganization(details);
    } catch (error: any) {
      setDetailsError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load organization details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }, []);

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
              {value?.planSnapshot?.name || "-"}{" "}
              {value?.billingCycle ? `• ${value.billingCycle}` : ""}
            </div>
          </div>
        ),
      },
      {
        title: "Seats & Members",
        dataIndex: "orgMemberCount",
        render: (_: number, row: SuperAdminOrganizationRow) => (
          <div>
            <div className="text-sm text-text">
              Org members: {row.orgMemberCount}
            </div>
            <div className="text-xs text-card-text">
              Workspace seats: {row.workspaceSeatCount}
            </div>
          </div>
        ),
      },
      {
        title: "Workspaces",
        dataIndex: "workspaceCount",
        render: (value: number) => (
          <span className="text-sm font-semibold text-text">{value || 0}</span>
        ),
      },
      {
        title: "Renewal / End",
        dataIndex: "subscription",
        render: (value: SuperAdminOrganizationRow["subscription"]) => (
          <div>
            <div className="text-sm text-text">
              {prettyDate(value?.currentPeriodEnd || null)}
            </div>
            <div className="text-xs text-card-text">
              {value?.cancelAtPeriodEnd
                ? "Scheduled to end"
                : value?.status
                  ? "Renews"
                  : "No subscription"}
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
        render: (_: string, row: SuperAdminOrganizationRow) => (
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

      <OrganizationDetailsModal
        isOpen={detailsOpen}
        loading={detailsLoading}
        error={detailsError}
        organization={selectedOrganization}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
