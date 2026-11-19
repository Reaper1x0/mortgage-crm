import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCreditCard,
  FiExternalLink,
  FiEye,
  FiGrid,
  FiHash,
} from "react-icons/fi";
import { RiBuildingLine } from "react-icons/ri";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import {
  SuperAdminOrganizationDetails,
  SuperAdminOrganizationRow,
  SuperAdminOrganizationsSummary,
  SuperAdminService,
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

type OrganizationPreview = {
  name: string;
  slug?: string | null;
  updatedAt?: string | null;
  subscriptionStatus?: string | null;
  planName?: string | null;
};

const formatAddress = (org?: SuperAdminOrganizationDetails | null) => {
  const address = org?.address;
  if (!address) return "—";

  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "—";
};

function OrganizationDetailsModal({
  isOpen,
  loading,
  error,
  organization,
  preview,
  onClose,
}: {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  organization: SuperAdminOrganizationDetails | null;
  preview: OrganizationPreview | null;
  onClose: () => void;
}) {
  const subscription = organization?.subscription;
  const title = organization?.name || preview?.name || "Organization details";
  const slug = organization?.slug || preview?.slug || "—";
  const updatedAt = organization?.updatedAt || preview?.updatedAt;
  const status = subscription?.status || preview?.subscriptionStatus || null;
  const planName =
    subscription?.plan?.name ||
    subscription?.planSnapshot?.name ||
    preview?.planName ||
    "—";

  return (
    <DetailModalShell
      isOpen={isOpen}
      onClose={onClose}
      loading={loading}
      loadingLabel="Loading organization…"
      error={error}
      header={
        <DetailModalHeader
          initials={getInitials(title, "OR")}
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
                <FiCalendar className="h-3.5 w-3.5" />
                Updated {prettyDate(updatedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <FiCreditCard className="h-3.5 w-3.5" />
                {planName}
              </span>
            </>
          }
        />
      }
    >
      {organization ? (
        <div className="space-y-5">
          <MetricStrip
            items={[
              {
                label: "Workspaces",
                value:
                  organization.counts?.workspaces ??
                  organization.workspaceCount ??
                  0,
              },
              {
                label: "Org members",
                value:
                  organization.counts?.organizationMembers ??
                  organization.orgMemberCount ??
                  0,
              },
              {
                label: "Workspace seats",
                value:
                  organization.counts?.workspaceSeats ??
                  organization.workspaceSeatCount ??
                  0,
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <DetailSection title="Business profile">
              <FieldList
                fields={[
                  { label: "Legal name", value: organization.legalName },
                  { label: "Industry", value: organization.industry },
                  { label: "Company size", value: organization.size },
                  { label: "Contact email", value: organization.contactEmail },
                  { label: "Phone", value: organization.phone },
                  {
                    label: "Website",
                    value: organization.website ? (
                      <a
                        href={organization.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 break-all text-primary hover:underline"
                      >
                        {organization.website}
                        <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Address", value: formatAddress(organization) },
                  { label: "Timezone", value: organization.settings?.timezone },
                  { label: "Currency", value: organization.settings?.currency },
                ]}
              />
            </DetailSection>

            <DetailSection title="Subscription & billing">
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
          </div>

          <DetailSection title="Recent workspaces">
            {organization.recentWorkspaces?.length ? (
              <DetailList>
                {organization.recentWorkspaces.map((workspace) => (
                  <div
                    key={workspace._id}
                    className="flex flex-col justify-between gap-2 px-3.5 py-2.5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text">
                        {workspace.name}
                      </div>
                      <div className="text-xs text-card-text">{workspace.slug}</div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-card-text">
                      <span>{workspace.memberCount || 0} members</span>
                      <span>{workspace.adminCount || 0} admins</span>
                      <span>Updated {prettyDate(workspace.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </DetailList>
            ) : (
              <EmptyState text="No workspaces found for this organization." />
            )}
          </DetailSection>

          <DetailSection title="Organization members">
            {organization.membersPreview?.length ? (
              <DetailList>
                {organization.membersPreview.map((member) => (
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
              <EmptyState text="No organization members found." />
            )}
          </DetailSection>
        </div>
      ) : null}
    </DetailModalShell>
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
  const [organizationPreview, setOrganizationPreview] =
    useState<OrganizationPreview | null>(null);

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

  const openDetails = useCallback(async (row: SuperAdminOrganizationRow) => {
    setOrganizationPreview({
      name: row.name,
      slug: row.slug,
      updatedAt: row.updatedAt,
      subscriptionStatus: row.subscription?.status || null,
      planName: row.subscription?.planSnapshot?.name || null,
    });
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedOrganization(null);

    try {
      const details = await SuperAdminService.getOrganizationDetails(row._id);
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
        title="Organizations"
        description="Enterprise organization intelligence: subscription posture, capacity footprint, and tenant health."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Organizations"
          value={summary.totalOrganizations}
          hint={`${summary.avgWorkspacesPerOrganization} avg workspaces per org`}
          icon={<RiBuildingLine className="h-4 w-4" />}
          iconClassName="text-primary"
          loading={loading}
        />
        <StatCard
          title="Subscription Coverage"
          value={summary.activeSubscriptions + summary.trialingSubscriptions}
          hint={`${summary.activeSubscriptions} active / ${summary.trialingSubscriptions} trialing`}
          icon={<FiCreditCard className="h-4 w-4" />}
          iconClassName="text-success"
          loading={loading}
        />
        <StatCard
          title="At Risk / Uncovered"
          value={summary.pastDueOrIncomplete + summary.noSubscription}
          hint={`${summary.pastDueOrIncomplete} at risk / ${summary.noSubscription} no subscription`}
          icon={<FiAlertTriangle className="h-4 w-4" />}
          iconClassName="text-warning"
          loading={loading}
        />
        <StatCard
          title="Workspace Footprint"
          value={summary.totalWorkspaces}
          hint={`${summary.totalOrgMembers} org members / ${summary.totalWorkspaceSeats} workspace seats`}
          icon={<FiGrid className="h-4 w-4" />}
          iconClassName="text-info"
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
        preview={organizationPreview}
        onClose={() => {
          setDetailsOpen(false);
          setOrganizationPreview(null);
          setSelectedOrganization(null);
          setDetailsError(null);
        }}
      />
    </div>
  );
}
