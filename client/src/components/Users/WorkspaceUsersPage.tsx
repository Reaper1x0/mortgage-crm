import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../Reusable/PageHeader";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import Button from "../Reusable/Button";
import Modal from "../Reusable/Modal";
import Avatar from "../Reusable/Avatar";
import IconButton from "../Reusable/IconButton";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { prettyDate } from "../../utils/date";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { extractErrorMessage, showSuccessToast, showWarningToast } from "../../utils/errorHandler";
import { User, UserService } from "../../service/userService";
import { useAuth } from "../../context/AuthContext";
import Callout from "../Reusable/Callout";

type WorkspaceRole = "Admin" | "Agent" | "Viewer";

interface WorkspaceRoleStats {
  adminCount: number;
  agentCount: number;
  viewerCount: number;
}

interface WorkspaceUserPermissions {
  canManageUsers: boolean;
  canManageAdmins: boolean;
}

const defaultRoleStats: WorkspaceRoleStats = { adminCount: 0, agentCount: 0, viewerCount: 0 };
const defaultPermissions: WorkspaceUserPermissions = { canManageUsers: false, canManageAdmins: false };

export default function WorkspaceUsersPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | "">("");
  const [permissions, setPermissions] = useState<WorkspaceUserPermissions>(defaultPermissions);
  const [roleStats, setRoleStats] = useState<WorkspaceRoleStats>(defaultRoleStats);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await UserService.listUsers({
        page,
        limit: pageSize,
        sortBy: "createdAt",
        sortOrder: "desc",
        role: roleFilter || undefined,
        search: searchQuery.trim() || undefined,
      });
      const list = response?.users || [];
      const meta = response?.pagination;
      setUsers(list);
      setRoleStats(response?.roleStats || defaultRoleStats);
      setPermissions(response?.permissions || defaultPermissions);
      setTotal(typeof meta?.total === "number" ? meta.total : list.length);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const canDeleteUser = useCallback(
    (target: User) => {
      if (!permissions.canManageUsers) return false;
      if (String(target._id) === String(authUser?._id)) return false;
      if (target.role === "Admin") {
        if (!permissions.canManageAdmins) return false;
        if (roleStats.adminCount <= 1) return false;
      }
      return true;
    },
    [authUser?._id, permissions, roleStats.adminCount]
  );

  const canEditUser = useCallback(
    (target: User) => {
      if (!permissions.canManageUsers) return false;
      if (target.role === "Admin" && !permissions.canManageAdmins) return false;
      return true;
    },
    [permissions]
  );

  const columns = useMemo(
    () => [
      {
        title: "User",
        dataIndex: "fullName",
        render: (_: unknown, row: User) => (
          <div className="flex items-center gap-3">
            <Avatar user={normalizeUserForAvatar(row)} size="sm" />
            <div>
              <div className="font-semibold text-text">{row.fullName || "-"}</div>
              <div className="text-xs text-card-text">{row.username || "-"}</div>
            </div>
          </div>
        ),
      },
      { title: "Email", dataIndex: "email" },
      {
        title: "Workspace Role",
        dataIndex: "role",
        render: (role: WorkspaceRole) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold text-text">
            {role}
          </span>
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
        render: (_: unknown, row: User) => (
          <div className="flex items-center gap-2">
            <IconButton
              icon={FiEdit2 as any}
              size="sm"
              outline
              fillBg
              hoverable
              title="Edit workspace role"
              onClick={() => setEditingUser(row)}
              disabled={!canEditUser(row)}
            />
            <IconButton
              icon={FiTrash2 as any}
              size="sm"
              outline
              fillBg
              hoverable
              title="Remove from workspace"
              onClick={() => setDeleteUser(row)}
              disabled={!canDeleteUser(row)}
            />
          </div>
        ),
      },
    ],
    [canDeleteUser, canEditUser]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workspace Users"
        description="Manage workspace membership and roles with consistent role-based controls."
        right={
          permissions.canManageUsers ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Add User
            </Button>
          ) : undefined
        }
      />

      {!permissions.canManageUsers && (
        <Callout tone="warning" title="Read-only access">
          You can view workspace users, but only authorized roles can manage membership and roles.
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-3">
        <Input
          name="searchWorkspaceUsers"
          label="Search users"
          placeholder="Search by name, username, email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
        <Select
          name="workspaceRoleFilter"
          label="Workspace role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as WorkspaceRole | "");
            setPage(1);
          }}
          options={[
            { label: "All roles", value: "" },
            { label: "Admin", value: "Admin" },
            { label: "Agent", value: "Agent" },
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

      <CreateWorkspaceUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        canAssignAdmin={permissions.canManageAdmins}
        onCreated={async () => {
          setCreateOpen(false);
          await fetchUsers();
          showSuccessToast("Workspace user added successfully.");
        }}
      />

      <EditWorkspaceUserModal
        isOpen={!!editingUser}
        user={editingUser}
        canAssignAdmin={permissions.canManageAdmins}
        roleStats={roleStats}
        onClose={() => setEditingUser(null)}
        onUpdated={async () => {
          setEditingUser(null);
          await fetchUsers();
        }}
      />

      <RemoveWorkspaceUserModal
        isOpen={!!deleteUser}
        user={deleteUser}
        canDelete={deleteUser ? canDeleteUser(deleteUser) : false}
        onClose={() => setDeleteUser(null)}
        onRemoved={async () => {
          setDeleteUser(null);
          await fetchUsers();
        }}
      />
    </div>
  );
}

function CreateWorkspaceUserModal({
  isOpen,
  onClose,
  canAssignAdmin,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  canAssignAdmin: boolean;
  onCreated: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "Viewer" as WorkspaceRole,
  });

  const roleOptions = [
    ...(canAssignAdmin ? [{ label: "Admin", value: "Admin" }] : []),
    { label: "Agent", value: "Agent" },
    { label: "Viewer", value: "Viewer" },
  ];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim()) {
      showWarningToast("Full name, username, and email are required.");
      return;
    }
    if (!form.password.trim() || form.password.length < 8) {
      showWarningToast("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await UserService.createUser(form);
      await onCreated();
      setForm({ fullName: "", username: "", email: "", password: "", role: "Viewer" });
    } catch (error) {
      showWarningToast(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <h2 className="text-xl font-semibold text-text">Add Workspace User</h2>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <Input label="Full Name" name="fullName" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
          <Input label="Username" name="username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input label="Password" name="password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <Select
            name="role"
            label="Workspace Role"
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as WorkspaceRole }))}
            options={roleOptions}
          />
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add User"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

function EditWorkspaceUserModal({
  isOpen,
  user,
  canAssignAdmin,
  roleStats,
  onClose,
  onUpdated,
}: {
  isOpen: boolean;
  user: User | null;
  canAssignAdmin: boolean;
  roleStats: WorkspaceRoleStats;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<WorkspaceRole>("Viewer");

  useEffect(() => {
    if (user) setRole((user.role as WorkspaceRole) || "Viewer");
  }, [user]);

  if (!user) return null;

  const roleOptions = [
    ...(canAssignAdmin ? [{ label: "Admin", value: "Admin" }] : []),
    { label: "Agent", value: "Agent" },
    { label: "Viewer", value: "Viewer" },
  ];
  const disableRoleChange = user.role === "Admin" && !canAssignAdmin;
  const adminDowngradeBlocked = user.role === "Admin" && roleStats.adminCount <= 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <h2 className="text-xl font-semibold text-text">Manage Workspace Role</h2>
        <p className="mt-1 text-sm text-card-text">
          {user.fullName} ({user.email})
        </p>
        <div className="mt-4 space-y-4">
          <Select
            name="workspaceRole"
            label="Workspace Role"
            value={role}
            disabled={disableRoleChange}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            options={roleOptions}
          />
          {adminDowngradeBlocked && (
            <p className="text-sm text-warning-text">At least one workspace admin must remain.</p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={saving || adminDowngradeBlocked || disableRoleChange || role === user.role}
              onClick={async () => {
                setSaving(true);
                try {
                  await UserService.updateUser(user._id, { role });
                  showSuccessToast("Workspace role updated.");
                  await onUpdated();
                } catch (error) {
                  showWarningToast(extractErrorMessage(error));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
    </Modal>
  );
}

function RemoveWorkspaceUserModal({
  isOpen,
  user,
  canDelete,
  onClose,
  onRemoved,
}: {
  isOpen: boolean;
  user: User | null;
  canDelete: boolean;
  onClose: () => void;
  onRemoved: () => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);
  if (!user) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <h2 className="text-xl font-semibold text-text">Remove Workspace User</h2>
        <p className="mt-3 text-sm text-card-text">
          Remove <span className="font-semibold text-text">{user.fullName}</span> from this workspace?
        </p>
        {!canDelete && (
          <p className="mt-2 text-sm text-warning-text">
            This user cannot be removed due to workspace role protection rules.
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
                await UserService.deleteUser(user._id);
                showSuccessToast("Workspace user removed.");
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
