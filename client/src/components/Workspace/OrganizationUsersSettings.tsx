import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../Reusable/PageHeader";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import Button from "../Reusable/Button";
import Modal from "../Reusable/Modal";
import Avatar from "../Reusable/Avatar";
import IconButton from "../Reusable/IconButton";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { extractErrorMessage, showSuccessToast, showWarningToast } from "../../utils/errorHandler";
import { prettyDate } from "../../utils/date";
import {
  OrganizationMemberUser,
  OrganizationRoleStats,
  OrganizationService,
  OrganizationWorkspaceSummary,
  RoleRow,
} from "../../service/organizationService";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSION_TOOLTIPS } from "../../utils/permissionUi";
import Callout from "../Reusable/Callout";

type OrgRole = "Owner" | "Admin" | "Member" | "Viewer";

function roleOptionLabel(role: RoleRow): string {
  if (role.kind === "system") {
    return `${role.name} (system)`;
  }
  return role.name;
}

export default function OrganizationUsersSettings() {
  const { workspaces, activeOrganizationId } = useAuth();
  const { canOrg } = usePermissions();
  const [users, setUsers] = useState<OrganizationMemberUser[]>([]);
  const [orgWorkspaces, setOrgWorkspaces] = useState<OrganizationWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [orgRoleFilter, setOrgRoleFilter] = useState<OrgRole | "">("");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMemberUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<OrganizationMemberUser | null>(null);
  const [roleStats, setRoleStats] = useState<OrganizationRoleStats>({
    ownerCount: 0,
    adminCount: 0,
    memberCount: 0,
    viewerCount: 0,
  });

  const myOrgRole = useMemo<OrgRole | null>(() => {
    if (!activeOrganizationId) return null;
    const orgWorkspace = workspaces.find((w) => w.organization?.organizationId === activeOrganizationId);
    return orgWorkspace?.organizationRole || null;
  }, [activeOrganizationId, workspaces]);
  const canAddMember = useMemo(
    () => canOrg("organization.members.invite") || myOrgRole === "Owner" || myOrgRole === "Admin",
    [canOrg, myOrgRole]
  );
  const canUpdateMember = useMemo(
    () => canOrg("organization.members.update") || myOrgRole === "Owner" || myOrgRole === "Admin",
    [canOrg, myOrgRole]
  );
  const canRemoveOrgMember = useMemo(
    () => canOrg("organization.members.remove") || myOrgRole === "Owner" || myOrgRole === "Admin",
    [canOrg, myOrgRole]
  );

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await OrganizationService.listMembers({
        page,
        limit: pageSize,
        sortBy: "createdAt",
        sortOrder: "desc",
        role: orgRoleFilter || undefined,
        search: searchQuery.trim() || undefined,
      });
      const raw = response.data?.users || [];
      const workspaceList = response.data?.workspaces || [];
      const meta = response.data?.pagination;
      setUsers(raw);
      setOrgWorkspaces(workspaceList);
      setRoleStats(
        response.data?.roleStats || {
          ownerCount: 0,
          adminCount: 0,
          memberCount: 0,
          viewerCount: 0,
        }
      );
      setTotal(typeof meta?.total === "number" ? meta.total : raw.length);
    } finally {
      setLoading(false);
    }
  }, [orgRoleFilter, page, pageSize, searchQuery]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const columns = useMemo(
    () => [
      {
        title: "User",
        dataIndex: "fullName",
        render: (_: unknown, row: OrganizationMemberUser) => (
          <div className="flex items-center gap-3">
            <Avatar user={normalizeUserForAvatar(row as any)} size="sm" />
            <div>
              <div className="font-semibold text-text">{row.fullName || "-"}</div>
              <div className="text-xs text-card-text">{row.username || "-"}</div>
            </div>
          </div>
        ),
      },
      { title: "Email", dataIndex: "email" },
      {
        title: "Org Role",
        dataIndex: "organizationRole",
        render: (role: OrgRole) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold text-text">
            {role}
          </span>
        ),
      },
      {
        title: "Workspace Access",
        dataIndex: "workspaceMemberships",
        render: (value: OrganizationMemberUser["workspaceMemberships"]) => (
          <span className="text-sm text-card-text">{Array.isArray(value) ? value.length : 0} workspace(s)</span>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        render: (value: string) => <span className="text-sm text-card-text">{value ? prettyDate(value) : "-"}</span>,
      },
      {
        title: "Actions",
        dataIndex: "actions",
        render: (_: unknown, row: OrganizationMemberUser) => {
          const ownerRow = row.organizationRole === "Owner" || row.isOrgOwner;
          const editDisabled = !canUpdateMember || ownerRow;
          const editTooltip = ownerRow
            ? PERMISSION_TOOLTIPS.editOrgOwner
            : !canUpdateMember
              ? PERMISSION_TOOLTIPS.editUser
              : undefined;
          const deleteAllowedByRules = canDeleteUser(myOrgRole, row.organizationRole, roleStats, row.isOrgOwner);
          const deleteDisabled = !canRemoveOrgMember || !deleteAllowedByRules;
          const deleteTooltip = !canRemoveOrgMember
            ? PERMISSION_TOOLTIPS.removeUser
            : !deleteAllowedByRules
              ? PERMISSION_TOOLTIPS.removeOrgMemberProtected
              : undefined;
          return (
            <div className="flex items-center gap-2">
              <IconButton
                icon={FiEdit2 as any}
                size="sm"
                outline
                fillBg
                hoverable
                title="Manage access"
                onClick={() => setEditingUser(row)}
                disabled={editDisabled}
                disabledTooltip={editDisabled ? editTooltip : undefined}
              />
              <IconButton
                icon={FiTrash2 as any}
                size="sm"
                outline
                fillBg
                hoverable
                title="Remove user"
                onClick={() => setDeleteUser(row)}
                disabled={deleteDisabled}
                disabledTooltip={deleteDisabled ? deleteTooltip : undefined}
              />
            </div>
          );
        },
      },
    ],
    [canRemoveOrgMember, canUpdateMember, myOrgRole, roleStats]
  );

  useEffect(() => {
    setEditingUser((prev) => {
      if (!prev) return prev;
      const next = users.find((u) => u._id === prev._id);
      return next || prev;
    });
  }, [users]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization Users"
        description="Manage organization members, workspace access, and roles with centralized controls."
        right={
          <Button
            variant="primary"
            onClick={() => setCreateOpen(true)}
            disabled={!canAddMember}
            disabledTooltip={!canAddMember ? PERMISSION_TOOLTIPS.addUser : undefined}
          >
            <span className="inline-flex items-center gap-2">
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              Add User
            </span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-3">
        <Input
          name="searchOrgUsers"
          label="Search users"
          placeholder="Search by name, username, email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
        <Select
          name="orgRoleFilter"
          label="Organization role"
          value={orgRoleFilter}
          onChange={(e) => {
            setOrgRoleFilter(e.target.value as OrgRole | "");
            setPage(1);
          }}
          options={[
            { label: "All roles", value: "" },
            { label: "Owner", value: "Owner" },
            { label: "Admin", value: "Admin" },
            { label: "Member", value: "Member" },
            { label: "Viewer", value: "Viewer" },
          ]}
        />
      </div>

      <DataTable
        loading={loading}
        data={users}
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

      <AddOrganizationMemberModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        workspaces={orgWorkspaces}
        onCreated={async () => {
          setCreateOpen(false);
          await fetchMembers();
          showSuccessToast("Organization user added successfully.");
        }}
      />

      <ManageOrganizationMemberModal
        isOpen={!!editingUser}
        user={editingUser}
        myOrgRole={myOrgRole}
        roleStats={roleStats}
        workspaces={orgWorkspaces}
        onClose={() => setEditingUser(null)}
        onUpdated={async () => {
          await fetchMembers();
        }}
      />

      <RemoveOrganizationMemberModal
        isOpen={!!deleteUser}
        user={deleteUser}
        myOrgRole={myOrgRole}
        roleStats={roleStats}
        onClose={() => setDeleteUser(null)}
        onRemoved={async () => {
          setDeleteUser(null);
          await fetchMembers();
        }}
      />
    </div>
  );
}

function canDeleteUser(
  myRole: OrgRole | null,
  targetRole: OrgRole,
  stats: OrganizationRoleStats,
  targetIsOwner?: boolean
) {
  if (!myRole) return false;
  if (targetIsOwner || targetRole === "Owner") return false;
  if (myRole !== "Owner" && myRole !== "Admin") return false;
  if (targetRole === "Admin") {
    if (myRole !== "Owner") return false;
    if (stats.adminCount <= 1) return false;
  }
  return true;
}

function AddOrganizationMemberModal({
  isOpen,
  onClose,
  workspaces,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaces: OrganizationWorkspaceSummary[];
  onCreated: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [orgRoles, setOrgRoles] = useState<RoleRow[]>([]);
  const [wsRoles, setWsRoles] = useState<RoleRow[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    organizationRoleId: "",
  });
  const [workspaceRoles, setWorkspaceRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setRolesLoading(true);
    (async () => {
      try {
        const [orgRes, wsRes] = await Promise.all([
          OrganizationService.listOrganizationRoles(),
          OrganizationService.listWorkspaceRoles(),
        ]);
        if (cancelled) return;
        const org = orgRes.data?.roles || [];
        const ws = wsRes.data?.roles || [];
        setOrgRoles(org);
        setWsRoles(ws);
        const assignable = org.filter((r) => r.slug !== "owner");
        setForm((prev) => ({
          ...prev,
          organizationRoleId: prev.organizationRoleId || assignable[0]?._id || "",
        }));
      } catch (error) {
        showWarningToast(extractErrorMessage(error));
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setForm({ fullName: "", username: "", email: "", password: "", organizationRoleId: "" });
      setWorkspaceRoles({});
      setOrgRoles([]);
      setWsRoles([]);
    }
  }, [isOpen]);

  const orgRoleOptions = orgRoles
    .filter((r) => r.slug !== "owner")
    .map((r) => ({ label: roleOptionLabel(r), value: r._id }));

  const wsRoleOptions = wsRoles.map((r) => ({
    label: roleOptionLabel(r),
    value: r._id,
  }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim()) {
      showWarningToast("Full name, username, and email are required.");
      return;
    }
    if (!form.organizationRoleId) {
      showWarningToast("Select an organization role.");
      return;
    }
    if (form.password && form.password.length < 8) {
      showWarningToast("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      await OrganizationService.addMember({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        organizationRoleId: form.organizationRoleId,
        workspaceRoles: Object.entries(workspaceRoles)
          .filter(([, workspaceRoleId]) => Boolean(workspaceRoleId))
          .map(([workspaceId, workspaceRoleId]) => ({
            workspaceId,
            workspaceRoleId,
          })),
      });
      await onCreated();
      setForm({ fullName: "", username: "", email: "", password: "", organizationRoleId: "" });
      setWorkspaceRoles({});
    } catch (error) {
      showWarningToast(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Add Organization User</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input
          label="Full Name"
          name="fullName"
          value={form.fullName}
          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
        />
        <Input
          label="Username"
          name="username"
          value={form.username}
          onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        <Input
          label="Password (new users)"
          name="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="Required if user does not already exist"
        />
        {rolesLoading ? (
          <p className="text-sm text-card-text">Loading roles…</p>
        ) : orgRoleOptions.length === 0 ? (
          <Callout tone="warning" title="No assignable organization roles">
            Create organization roles under Access &amp; roles before inviting users.
          </Callout>
        ) : (
          <Select
            label="Organization role"
            name="organizationRoleId"
            value={form.organizationRoleId}
            onChange={(e) => setForm((p) => ({ ...p, organizationRoleId: e.target.value }))}
            options={[{ label: "Select a role", value: "" }, ...orgRoleOptions]}
          />
        )}

        <div className="space-y-3 rounded-xl border border-card-border p-3">
          <p className="text-sm font-medium text-text">Workspace access</p>
          {workspaces.length === 0 ? (
            <p className="text-sm text-card-text">No workspaces in this organization yet.</p>
          ) : wsRoleOptions.length === 0 ? (
            <Callout tone="warning" title="No workspace roles">
              Create workspace roles under Access &amp; roles before assigning workspace access.
            </Callout>
          ) : (
            workspaces.map((workspace) => {
              const selected = workspaceRoles[workspace.workspaceId] || "";
              return (
                <div key={workspace.workspaceId} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm text-text">{workspace.name}</span>
                  <Select
                    name={`workspaceRole-${workspace.workspaceId}`}
                    value={selected}
                    onChange={(e) => {
                      const value = e.target.value;
                      setWorkspaceRoles((prev) => {
                        const next = { ...prev };
                        if (!value) delete next[workspace.workspaceId];
                        else next[workspace.workspaceId] = value;
                        return next;
                      });
                    }}
                    options={[{ label: "No access", value: "" }, ...wsRoleOptions]}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving || rolesLoading || orgRoleOptions.length === 0}>
            {saving ? "Adding..." : "Add User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ManageOrganizationMemberModal({
  isOpen,
  user,
  myOrgRole,
  roleStats,
  workspaces,
  onClose,
  onUpdated,
}: {
  isOpen: boolean;
  user: OrganizationMemberUser | null;
  myOrgRole: OrgRole | null;
  roleStats: OrganizationRoleStats;
  workspaces: OrganizationWorkspaceSummary[];
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [savingOrgRole, setSavingOrgRole] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [orgRoles, setOrgRoles] = useState<RoleRow[]>([]);
  const [wsRoles, setWsRoles] = useState<RoleRow[]>([]);
  const [workspaceRoles, setWorkspaceRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setRolesLoading(true);
    (async () => {
      try {
        const [orgRes, wsRes] = await Promise.all([
          OrganizationService.listOrganizationRoles(),
          OrganizationService.listWorkspaceRoles(),
        ]);
        if (cancelled) return;
        setOrgRoles(orgRes.data?.roles || []);
        setWsRoles(wsRes.data?.roles || []);
      } catch (error) {
        showWarningToast(extractErrorMessage(error));
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!user) return;
    const map: Record<string, string> = {};
    (user.workspaceMemberships || []).forEach((entry) => {
      if (entry.workspaceRoleId) map[entry.workspaceId] = entry.workspaceRoleId;
    });
    setWorkspaceRoles(map);
  }, [user]);

  if (!user) return null;

  const orgRoleSelectOptions = orgRoles
    .filter((r) => r.slug !== "owner")
    .map((r) => ({ label: roleOptionLabel(r), value: r._id }));

  const wsRoleSelectOptions = wsRoles.map((r) => ({
    label: roleOptionLabel(r),
    value: r._id,
  }));

  const orgRoleValue = user.organizationRoleId || "";

  const updateOrgRole = async (organizationRoleId: string) => {
    if (!myOrgRole || !organizationRoleId || organizationRoleId === orgRoleValue) return;
    setSavingOrgRole(true);
    try {
      await OrganizationService.updateMemberRole(user._id, { organizationRoleId });
      showSuccessToast("Organization role updated.");
      await onUpdated();
    } catch (error) {
      showWarningToast(extractErrorMessage(error));
    } finally {
      setSavingOrgRole(false);
    }
  };

  const upsertWorkspaceRole = async (workspaceId: string, workspaceRoleId: string | "") => {
    try {
      if (!workspaceRoleId) {
        await OrganizationService.removeWorkspaceAccess(user._id, workspaceId);
        showSuccessToast("Workspace access removed.");
        await onUpdated();
        return;
      }
      await OrganizationService.updateMemberWorkspaceRole(user._id, workspaceId, { workspaceRoleId });
      showSuccessToast("Workspace role updated.");
      await onUpdated();
    } catch (error) {
      showWarningToast(extractErrorMessage(error));
    }
  };

  const canEditOrgRole = user.organizationRole !== "Owner";
  const canEditAdminRole = myOrgRole === "Owner";
  const orgOptionsForSelect = orgRoleSelectOptions.filter((option) => {
    const row = orgRoles.find((r) => r._id === option.value);
    if (!row) return false;
    if (option.value === orgRoleValue) return true;
    if (row.slug === "admin") return myOrgRole === "Owner";
    return true;
  });

  const disableOrgRoleDropdown =
    savingOrgRole ||
    !canEditOrgRole ||
    rolesLoading ||
    orgRoles.filter((r) => r.slug !== "owner").length === 0 ||
    (user.organizationRole === "Admin" && !canEditAdminRole) ||
    (user.organizationRole === "Admin" && roleStats.adminCount <= 1);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Manage user access</h2>
      <p className="mt-1 text-sm text-card-text">
        {user.fullName} ({user.email})
      </p>

      <div className="mt-4 space-y-4">
        {rolesLoading ? (
          <p className="text-sm text-card-text">Loading roles…</p>
        ) : (
          <Select
            name="organizationRoleId"
            label="Organization role"
            value={orgRoleValue}
            onChange={(e) => void updateOrgRole(e.target.value)}
            options={[{ label: "Select a role", value: "" }, ...orgOptionsForSelect]}
            disabled={disableOrgRoleDropdown}
          />
        )}

        <div className="space-y-3 rounded-xl border border-card-border p-3">
          <p className="text-sm font-medium text-text">Workspace access</p>
          {wsRoleSelectOptions.length === 0 ? (
            <Callout tone="warning" title="No workspace roles">
              Create workspace roles under Access &amp; roles before assigning access.
            </Callout>
          ) : (
            workspaces.map((workspace) => {
              const selected = workspaceRoles[workspace.workspaceId] || "";
              return (
                <div key={workspace.workspaceId} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm text-text">{workspace.name}</span>
                  <Select
                    name={`workspaceRole-${workspace.workspaceId}`}
                    value={selected}
                    onChange={(e) => {
                      const value = e.target.value;
                      const prev = workspaceRoles[workspace.workspaceId] || "";
                      if (value === prev) return;
                      setWorkspaceRoles((prev) => ({ ...prev, [workspace.workspaceId]: value }));
                      void upsertWorkspaceRole(workspace.workspaceId, value);
                    }}
                    options={[{ label: "No access", value: "" }, ...wsRoleSelectOptions]}
                    disabled={rolesLoading}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

function RemoveOrganizationMemberModal({
  isOpen,
  user,
  myOrgRole,
  roleStats,
  onClose,
  onRemoved,
}: {
  isOpen: boolean;
  user: OrganizationMemberUser | null;
  myOrgRole: OrgRole | null;
  roleStats: OrganizationRoleStats;
  onClose: () => void;
  onRemoved: () => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);
  if (!user) return null;
  const canDelete = canDeleteUser(myOrgRole, user.organizationRole, roleStats, user.isOrgOwner);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <h2 className="text-xl font-semibold text-text">Remove Organization User</h2>
        <p className="mt-3 text-sm text-card-text">
          Remove <span className="font-semibold text-text">{user.fullName}</span> from this organization and all linked
          workspaces?
        </p>
        {!canDelete && (
          <p className="mt-2 text-sm text-warning-text">
            This user cannot be removed due to role protection rules.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={removing}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={removing || !canDelete}
            onClick={async () => {
              setRemoving(true);
              try {
                await OrganizationService.removeMember(user._id);
                showSuccessToast("Organization member removed.");
                await onRemoved();
              } catch (error) {
                showWarningToast(extractErrorMessage(error));
              } finally {
                setRemoving(false);
              }
            }}
          >
            {removing ? "Removing..." : "Remove User"}
          </Button>
        </div>
    </Modal>
  );
}
