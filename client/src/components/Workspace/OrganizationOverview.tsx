import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  FiArrowRight,
  FiCreditCard,
  FiExternalLink,
  FiGrid,
  FiPlus,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import Button from "../Reusable/Button";
import Card from "../Reusable/Card";
import Modal from "../Reusable/Modal";
import Input from "../Reusable/Inputs/Input";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { useBillingAccess } from "../../context/BillingAccessContext";
import { OrganizationService } from "../../service/organizationService";
import { WorkspaceService } from "../../service/workspaceService";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";
import { BILLING_TOOLTIPS } from "../../utils/billingUi";
import { cn } from "../../utils/cn";

function formatSubscriptionStatus(status: string | null, loading: boolean) {
  if (loading) return "…";
  if (!status) return "None";
  return status.replace(/_/g, " ");
}

export default function OrganizationOverview() {
  const navigate = useNavigate();
  const { organizationId = "" } = useParams();
  const {
    organizations,
    refreshWorkspaces,
    setActiveOrganizationId,
    setActiveWorkspaceId,
  } = useAuth();
  const { canOrg, effective } = usePermissions();
  const billing = useBillingAccess();

  const [membersLoading, setMembersLoading] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const orgMembership = useMemo(
    () => organizations.find((o) => o.organizationId === organizationId) || null,
    [organizations, organizationId],
  );

  const workspaces = orgMembership?.workspaces || [];
  const canReadMembers = Boolean(effective?.isOrgOwner) || canOrg("organization.members.read");
  const canCreateWorkspacePerm =
    Boolean(effective?.isOrgOwner) || canOrg("organization.workspaces.create");
  const canCreateWorkspace = canCreateWorkspacePerm && !billing.isPaidBlocked;
  const canEditOrg =
    Boolean(effective?.isOrgOwner) || canOrg("organization.organization.read");

  const createWorkspaceTooltip = !canCreateWorkspacePerm
    ? "You don't have permission to create workspaces."
    : billing.paidActionTooltip(BILLING_TOOLTIPS.createWorkspace);

  useEffect(() => {
    if (!organizationId || !canReadMembers) {
      setMemberCount(null);
      return;
    }

    let cancelled = false;
    setMembersLoading(true);
    void OrganizationService.listMembers({ page: 1, limit: 1 })
      .then((res) => {
        if (cancelled) return;
        setMemberCount(res.data?.pagination?.total ?? res.data?.users?.length ?? 0);
      })
      .catch(() => {
        if (!cancelled) setMemberCount(null);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, canReadMembers]);

  const openWorkspace = useCallback(
    (workspaceId: string) => {
      if (!organizationId) return;
      setActiveOrganizationId(organizationId);
      setActiveWorkspaceId(workspaceId);
      navigate(buildWorkspacePath(organizationId, workspaceId, "dashboard"));
    },
    [navigate, organizationId, setActiveOrganizationId, setActiveWorkspaceId],
  );

  const handleCreateWorkspace = async () => {
    const trimmed = newName.trim();
    if (!organizationId || !canCreateWorkspace || trimmed.length < 2) return;

    setCreating(true);
    try {
      const res = await WorkspaceService.create(trimmed, organizationId);
      const wid = res.data?.workspace?._id;
      await refreshWorkspaces();
      setCreateOpen(false);
      setNewName("");
      if (wid) openWorkspace(String(wid));
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const orgName = orgMembership?.name || "Organization";
  const yourRole =
    orgMembership?.isOrgOwner
      ? "Owner"
      : orgMembership?.organizationRole || "Member";

  return (
    <div className="space-y-6">
      <PageHeader
        title={orgName}
        description="Organization overview — open a workspace or manage settings."
        actions={
          <div className="flex flex-wrap gap-2">
            {canEditOrg ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(buildOrganizationPath(organizationId, "settings/organization"))
                }
              >
                <span className="inline-flex items-center gap-2">
                  <FiSettings className="h-4 w-4" />
                  Edit org details
                </span>
              </Button>
            ) : null}
            {canCreateWorkspacePerm ? (
              <Button
                variant="primary"
                onClick={() => setCreateOpen(true)}
                disabled={!canCreateWorkspace}
                disabledTooltip={createWorkspaceTooltip}
              >
                <span className="inline-flex items-center gap-2">
                  <FiPlus className="h-4 w-4" />
                  New workspace
                </span>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Workspaces"
          value={workspaces.length}
          subtitle="In this organization"
          icon={<FiGrid className="h-4 w-4" aria-hidden />}
          iconClassName="text-primary"
        />
        <StatCard
          title="Members"
          loading={membersLoading}
          value={canReadMembers ? (memberCount ?? "—") : "—"}
          subtitle={canReadMembers ? "Organization members" : "No access to member list"}
          icon={<FiUsers className="h-4 w-4" aria-hidden />}
          iconClassName="text-info"
        />
        <StatCard
          title="Your role"
          value={yourRole}
          subtitle="Organization access level"
          icon={<FiUsers className="h-4 w-4" aria-hidden />}
          iconClassName="text-accent"
        />
        <StatCard
          title="Subscription"
          loading={billing.loading}
          value={formatSubscriptionStatus(billing.status, billing.loading)}
          subtitle={
            billing.isPaidBlocked
              ? "Product access blocked"
              : billing.hasSubscriptionRecord
                ? "Billing record on file"
                : "No subscription yet"
          }
          icon={<FiCreditCard className="h-4 w-4" aria-hidden />}
          iconClassName={billing.isPaidBlocked ? "text-warning" : "text-success"}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Workspaces</h2>
            <p className="mt-0.5 text-sm text-card-text">
              Jump into a workspace to manage clients, documents, and templates.
            </p>
          </div>
          <Link
            to={buildOrganizationPath(organizationId, "settings/workspaces")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Manage workspaces <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <Card className="!p-8">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FiGrid className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">No workspaces yet</h3>
              <p className="mt-1 text-sm text-card-text">
                Create a workspace to start processing mortgage submissions.
              </p>
              {canCreateWorkspacePerm ? (
                <div className="mt-5">
                  <Button
                    variant="primary"
                    onClick={() => setCreateOpen(true)}
                    disabled={!canCreateWorkspace}
                    disabledTooltip={createWorkspaceTooltip}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiPlus className="h-4 w-4" />
                      Create workspace
                    </span>
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((ws) => (
              <button
                key={ws.workspaceId}
                type="button"
                onClick={() => openWorkspace(ws.workspaceId)}
                className={cn(
                  "group rounded-xl border border-card-border bg-card p-5 text-left shadow-sm shadow-card-shadow",
                  "transition hover:border-primary/40 hover:bg-card-hover focus:outline-none focus:ring-2 focus:ring-primary-shadow",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {(ws.name || "W").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="rounded-full border border-card-border px-2.5 py-1 text-[11px] font-semibold text-card-text">
                    {ws.role || "—"}
                  </span>
                </div>
                <div className="mt-4 min-w-0">
                  <div className="truncate text-base font-semibold text-text">{ws.name}</div>
                  <div className="mt-0.5 truncate text-xs text-card-text">{ws.slug}</div>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Open workspace
                  <FiExternalLink className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={createOpen} onClose={() => !creating && setCreateOpen(false)}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">New workspace</h2>
            <p className="mt-1 text-sm text-card-text">
              Create a workspace in {orgName}. You will open it after creation.
            </p>
          </div>
          {!canCreateWorkspace ? (
            <p className="rounded-xl border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning">
              {createWorkspaceTooltip || "You cannot create a workspace right now."}
            </p>
          ) : null}
          <Input
            name="workspaceName"
            label="Workspace name"
            placeholder="e.g. Lahore office"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreateWorkspace()}
              isLoading={creating}
              disabled={creating || newName.trim().length < 2 || !canCreateWorkspace}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
