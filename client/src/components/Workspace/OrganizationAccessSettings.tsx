/**
 * Roles management page
 *
 * Owners and admins with `organization.rbac.manage` can:
 *  - Create, edit, delete custom organization roles (with direct permission assignment)
 *  - Create, edit, delete custom workspace roles (with direct permission assignment)
 *
 * The built-in "Owner" system role is read-only and cannot be changed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router";
import { FiEdit2, FiLayers, FiPlus, FiShield, FiTrash2 } from "react-icons/fi";
import PageHeader from "../Reusable/PageHeader";
import Button from "../Reusable/Button";
import Modal from "../Reusable/Modal";
import Input from "../Reusable/Inputs/Input";
import Checkbox from "../Reusable/Checkbox";
import IconButton from "../Reusable/IconButton";
import Callout from "../Reusable/Callout";
import StatCard from "../Reusable/StatCard";
import Segmented from "../Reusable/Segmented";
import Surface from "../Reusable/Surface";
import DataTable from "../Reusable/DataTable";
import StateHandler from "../Reusable/StateHandler";
import StatusBadge from "../Reusable/StatusBadge";
import { OrganizationService, RoleRow, RolePayload } from "../../service/organizationService";
import { usePermissions } from "../../context/PermissionContext";
import { cn } from "../../utils/cn";
import { extractErrorMessage, showWarningToast } from "../../utils/errorHandler";

const ORG_PERMISSIONS = [
  { key: "organization.organization.read", label: "View organization profile" },
  { key: "organization.organization.update", label: "Update organization profile & branding" },
  { key: "organization.billing.read", label: "View billing" },
  { key: "organization.billing.manage", label: "Manage billing & subscriptions" },
  { key: "organization.members.read", label: "View organization members" },
  { key: "organization.members.invite", label: "Invite or add members" },
  { key: "organization.members.update", label: "Update member roles & workspace access" },
  { key: "organization.members.remove", label: "Remove organization members" },
  { key: "organization.members.promote_admin", label: "Assign or change admin-level roles" },
  { key: "organization.rbac.manage", label: "Manage roles" },
  { key: "organization.workspaces.create", label: "Create workspaces" },
];

const WS_PERMISSIONS = [
  { key: "workspace.workspace.read", label: "View workspace" },
  { key: "workspace.workspace.update", label: "Update workspace settings & branding" },
  { key: "workspace.dashboard.read", label: "View dashboard" },
  { key: "workspace.submissions.read", label: "View submissions" },
  { key: "workspace.submissions.write", label: "Create / update submissions" },
  { key: "workspace.submissions.manage", label: "Delete submissions / manage extraction" },
  { key: "workspace.templates.read", label: "View templates" },
  { key: "workspace.templates.write", label: "Edit template content" },
  { key: "workspace.templates.manage", label: "Create / delete templates" },
  { key: "workspace.masterfields.read", label: "View master fields" },
  { key: "workspace.masterfields.write", label: "Manage master fields" },
  { key: "workspace.leads.read", label: "View leads" },
  { key: "workspace.leads.write", label: "Manage leads" },
  { key: "workspace.extraction.run", label: "Run extraction jobs" },
  { key: "workspace.audit.read", label: "View audit trail" },
  { key: "workspace.users.read", label: "View workspace members" },
  { key: "workspace.users.manage", label: "Manage workspace members" },
];

function rolePermissions(role: RoleRow): string[] {
  return Array.isArray(role.permissions) ? role.permissions : [];
}

/* ── Role editor (inside Modal) ─────────────────────────────────────────── */

interface RoleEditorModalProps {
  isOpen: boolean;
  scope: "organization" | "workspace";
  role: RoleRow | null;
  onClose: () => void;
  onSaved: () => void;
}

function RoleEditorModal({ isOpen, scope, role, onClose, onSaved }: RoleEditorModalProps) {
  const catalog = scope === "organization" ? ORG_PERMISSIONS : WS_PERMISSIONS;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setSelected(new Set(role ? rolePermissions(role) : []));
    setError(null);
  }, [isOpen, role, scope]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectAll = () => setSelected(new Set(catalog.map((p) => p.key)));
  const clearAll = () => setSelected(new Set());

  const save = async () => {
    if (!name.trim()) return setError("Name is required");
    setSaving(true);
    setError(null);
    const payload: RolePayload = {
      name: name.trim(),
      description: description.trim(),
      permissions: Array.from(selected),
    };
    try {
      if (role) {
        if (scope === "organization") {
          await OrganizationService.updateOrganizationRole(role._id, payload);
        } else {
          await OrganizationService.updateWorkspaceRoleTemplate(role._id, payload);
        }
      } else if (scope === "organization") {
        await OrganizationService.createOrganizationRole(payload);
      } else {
        await OrganizationService.createWorkspaceRole(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const title = role
    ? `Edit ${scope === "organization" ? "organization" : "workspace"} role`
    : `New ${scope === "organization" ? "organization" : "workspace"} role`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="md:max-w-3xl xl:max-w-4xl"
      disableDefaultContentPadding
      contentClassName="max-h-[min(85vh,720px)] p-0"
    >
      <div className="border-b border-card-border px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6 sm:pr-14">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Roles</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-text sm:text-xl">
          <FiShield className="shrink-0 text-primary" aria-hidden />
          {title}
        </h2>
        <p className="mt-2 text-sm text-card-text">
          {scope === "organization"
            ? "These permissions apply across the organization (billing, members, workspaces)."
            : "These permissions apply only inside workspaces where this role is assigned."}
        </p>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6 sm:pr-14">
        <Input
          name="roleName"
          label="Role name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Compliance lead"
          autoComplete="off"
        />

        <Input
          name="roleDescription"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short note for other admins"
        />

        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-text">Permissions</span>
              <p className="mt-0.5 text-xs text-card-text">
                {selected.size} of {catalog.length} selected
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="link" className="!px-2 !py-0 text-xs" onClick={selectAll}>
                Select all
              </Button>
              <Button type="button" variant="link" className="!px-2 !py-0 text-xs" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>
          <div className="grid max-h-[min(46vh,420px)] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {catalog.map((p) => (
              <div
                key={p.key}
                role="button"
                tabIndex={0}
                className="rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                onClick={() => toggle(p.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(p.key);
                  }
                }}
              >
                <Surface
                  variant="soft"
                  className={cn(
                    "cursor-pointer p-3 transition-colors hover:border-primary-border/40",
                    selected.has(p.key) ? "border-primary-border bg-primary-muted ring-1 ring-primary-border" : ""
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 pt-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        name={`perm-${p.key}`}
                        checked={selected.has(p.key)}
                        onChange={() => toggle(p.key)}
                        size="sm"
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-medium text-text">{p.label}</span>
                      <span className="mt-0.5 block font-mono text-[10px] leading-tight text-card-text/90">{p.key}</span>
                    </div>
                  </div>
                </Surface>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <Callout tone="danger" title="Could not save">
            {error}
          </Callout>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-card-border bg-background/95 px-5 py-4 backdrop-blur-sm sm:px-6 sm:pr-14">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void save()} isLoading={saving} disabled={saving}>
          {role ? "Save changes" : "Create role"}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Roles panel (table + empty) ───────────────────────────────────────── */

function RolesPanel({
  scope,
  roles,
  loading,
  onCreate,
  onEdit,
  onDelete,
}: {
  scope: "organization" | "workspace";
  roles: RoleRow[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (r: RoleRow) => void;
  onDelete: (r: RoleRow) => void;
}) {
  const emptyCopy =
    scope === "organization"
      ? "No custom organization roles yet. Create one to delegate billing, members, or workspace creation without full owner access."
      : "No workspace roles yet. Create templates (e.g. Processor, Underwriter) and assign them on the Users page per workspace.";

  const columns = useMemo(
    () => [
      {
        key: "name",
        title: "Name",
        dataIndex: "name" as const,
        className: "!whitespace-normal max-w-[200px]",
      },
      {
        key: "slug",
        title: "Slug",
        dataIndex: "slug" as const,
        render: (v: string) => <span className="font-mono text-xs text-card-text">{v}</span>,
      },
      {
        key: "perms",
        title: "Permissions",
        render: (_: unknown, row: RoleRow) => (
          <span className="tabular-nums text-card-text">{rolePermissions(row).length}</span>
        ),
      },
      {
        key: "kind",
        title: "Kind",
        render: (_: unknown, row: RoleRow) => (
          <StatusBadge tone={row.kind === "system" ? "primary" : "neutral"}>
            {row.kind}
          </StatusBadge>
        ),
      },
      {
        key: "actions",
        title: <span className="block text-right w-full pr-1">Actions</span>,
        thClassName: "text-right",
        className: "text-right",
        render: (_: unknown, row: RoleRow) =>
          row.kind !== "system" ? (
            <div className="inline-flex justify-end gap-1">
              <IconButton
                icon={FiEdit2}
                size="sm"
                title="Edit role"
                aria-label="Edit role"
                className="group"
                onClick={() => onEdit(row)}
              />
              <IconButton
                icon={FiTrash2}
                size="sm"
                title="Delete role"
                aria-label="Delete role"
                className="group text-danger-text hover:border-danger-border"
                onClick={() => onDelete(row)}
              />
            </div>
          ) : (
            <span className="text-xs text-card-text">Built-in</span>
          ),
      },
    ],
    [onEdit, onDelete]
  );

  return (
    <Surface className="overflow-hidden shadow-sm">
      <div className="flex flex-col gap-4 border-b border-card-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary">
            {scope === "organization" ? <FiShield size={18} /> : <FiLayers size={18} />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">
              {scope === "organization" ? "Organization roles" : "Workspace roles"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-card-text">
              {scope === "organization"
                ? "Org-wide: profile, billing, members, RBAC, and creating workspaces."
                : "Per workspace: submissions, templates, leads, extraction, audit, and workspace users."}
            </p>
          </div>
        </div>
        <Button onClick={onCreate} className="shrink-0 self-start sm:self-center">
          <FiPlus className="mr-2 inline" />
          New role
        </Button>
      </div>

      <div className="p-2 sm:p-4">
        <StateHandler loading={loading}>
          {!loading && roles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-card-border bg-background-muted px-6 py-12 text-center">
              <p className="mx-auto max-w-md text-sm text-card-text">{emptyCopy}</p>
              <Button className="mt-6" onClick={onCreate}>
                <FiPlus className="mr-2 inline" />
                Create first role
              </Button>
            </div>
          ) : !loading ? (
            <DataTable<RoleRow> columns={columns} data={roles} />
          ) : null}
        </StateHandler>
      </div>
    </Surface>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

type Tab = "organization" | "workspace";

export default function OrganizationAccessSettings() {
  const { organizationId } = useParams();
  const { canOrg, loading: permLoading, refreshPermissions } = usePermissions();

  const [orgRoles, setOrgRoles] = useState<RoleRow[]>([]);
  const [wsRoles, setWsRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("organization");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorScope, setEditorScope] = useState<Tab>("organization");
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);

  const [deletingRole, setDeletingRole] = useState<(RoleRow & { scope: Tab }) | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [o, w] = await Promise.all([
        OrganizationService.listOrganizationRoles(),
        OrganizationService.listWorkspaceRoles(),
      ]);
      setOrgRoles(o.data?.roles ?? []);
      setWsRoles(w.data?.roles ?? []);
    } catch (e) {
      showWarningToast(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRolesChanged = useCallback(async () => {
    await loadRoles();
    await refreshPermissions();
  }, [loadRoles, refreshPermissions]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const stats = useMemo(
    () => ({
      org: orgRoles.length,
      ws: wsRoles.length,
      customOrg: orgRoles.filter((r) => r.kind !== "system").length,
      customWs: wsRoles.filter((r) => r.kind !== "system").length,
    }),
    [orgRoles, wsRoles]
  );

  const openCreate = (scope: Tab) => {
    setEditorScope(scope);
    setTab(scope);
    setEditingRole(null);
    setEditorOpen(true);
  };

  const openEdit = (role: RoleRow, scope: Tab) => {
    setEditorScope(scope);
    setTab(scope);
    setEditingRole(role);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRole) return;
    setDeleteLoading(true);
    try {
      if (deletingRole.scope === "organization") {
        await OrganizationService.deleteOrganizationRole(deletingRole._id);
      } else {
        await OrganizationService.deleteWorkspaceRole(deletingRole._id);
      }
      setDeletingRole(null);
      void handleRolesChanged();
    } catch (e) {
      showWarningToast(extractErrorMessage(e));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (
    !permLoading &&
    !canOrg("organization.rbac.manage") &&
    organizationId &&
    !loading
  ) {
    return <Navigate to={`/${organizationId}/settings/organization`} replace />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <PageHeader
        title="Roles & permissions"
        description="Define organization and workspace roles by choosing exact API permissions. Assign roles to people from Organization → Users."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="Org roles" value={stats.org} loading={loading} icon={<FiShield className="h-5 w-5" />} />
        <StatCard title="Workspace roles" value={stats.ws} loading={loading} icon={<FiLayers className="h-5 w-5" />} />
        <StatCard title="Custom (org)" value={stats.customOrg} loading={loading} />
        <StatCard title="Custom (ws)" value={stats.customWs} loading={loading} />
      </div>

      <Surface variant="soft" className="p-1.5 shadow-none">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          className="!grid-cols-1 sm:!grid-cols-2"
          options={[
            {
              key: "organization",
              label: "Organization roles",
              description: "Billing, members, workspaces, RBAC",
              icon: <FiShield className="h-5 w-5 text-primary" />,
            },
            {
              key: "workspace",
              label: "Workspace roles",
              description: "Submissions, templates, leads, users",
              icon: <FiLayers className="h-5 w-5 text-primary" />,
            },
          ]}
        />
      </Surface>

      {tab === "organization" ? (
        <RolesPanel
          scope="organization"
          roles={orgRoles}
          loading={loading}
          onCreate={() => openCreate("organization")}
          onEdit={(r) => openEdit(r, "organization")}
          onDelete={(r) => setDeletingRole({ ...r, scope: "organization" })}
        />
      ) : (
        <RolesPanel
          scope="workspace"
          roles={wsRoles}
          loading={loading}
          onCreate={() => openCreate("workspace")}
          onEdit={(r) => openEdit(r, "workspace")}
          onDelete={(r) => setDeletingRole({ ...r, scope: "workspace" })}
        />
      )}

      <RoleEditorModal
        isOpen={editorOpen}
        scope={editorScope}
        role={editingRole}
        onClose={() => setEditorOpen(false)}
        onSaved={handleRolesChanged}
      />

      <Modal
        isOpen={Boolean(deletingRole)}
        onClose={() => !deleteLoading && setDeletingRole(null)}
        containerClassName="max-w-md"
        showCloseButton={!deleteLoading}
      >
        <div className="pr-2 sm:pr-4">
          <h2 className="text-lg font-semibold text-text">Delete role?</h2>
          <Callout tone="warning" className="mt-4" title="This action is permanent">
            Remove <span className="font-semibold text-text">{deletingRole?.name}</span>? The role must not be assigned
            to any member.
          </Callout>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeletingRole(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} isLoading={deleteLoading} disabled={deleteLoading}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
