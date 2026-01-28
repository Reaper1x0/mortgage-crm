import React, { useEffect, useState, useCallback, useMemo } from "react";
import Button from "../Reusable/Button";
import Modal from "../Reusable/Modal";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import DataTable from "../Reusable/DataTable";
import { UserService, User } from "../../service/userService";
import { prettyDate } from "../../utils/date";
import PageHeader from "../Reusable/PageHeader";
import { showWarningToast, showSuccessToast } from "../../utils/errorHandler";
import IconButton from "../Reusable/IconButton";
import { FiEdit, FiTrash } from "react-icons/fi";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  // Filter state
  const [roleFilter, setRoleFilter] = useState<"Admin" | "Agent" | "Viewer" | "">("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchUsers = useCallback(
    async (p = page, ps = pageSize) => {
      setLoading(true);
      try {
        const params: any = {
          page: p,
          limit: ps,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (roleFilter) params.role = roleFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await UserService.listUsers(params);

        const list: User[] = res?.users || [];
        const meta = res?.pagination;

        setUsers(list);
        setTotal(typeof meta?.total === "number" ? meta.total : list.length);

        // If backend clamps page/limit, keep UI in sync
        if (typeof meta?.page === "number") setPage(meta.page);
        if (typeof meta?.limit === "number") setPageSize(meta.limit);

        // If deletes/creates change page count and you're out of range, snap back
        if (typeof meta?.totalPages === "number" && p > meta.totalPages) {
          setPage(Math.max(1, meta.totalPages));
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, roleFilter, searchQuery],
  );

  useEffect(() => {
    fetchUsers(page, pageSize);
  }, [page, pageSize, fetchUsers]);

  const handleDelete = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await UserService.deleteUser(userToDelete._id);
      showSuccessToast("User deleted successfully");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsers(page, pageSize);
    } catch (err: any) {
      // Error toast is handled automatically by centralized error handler
      console.error("Delete user error:", err);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      { title: "Full Name", dataIndex: "fullName" },
      { title: "Username", dataIndex: "username" },
      { title: "Email", dataIndex: "email" },
      {
        title: "Role",
        dataIndex: "role",
        render: (role: string) => (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
              role === "Admin"
                ? "bg-danger border-danger-border text-danger-text"
                : role === "Agent"
                ? "bg-primary border-primary-border text-primary-text"
                : "bg-info border-info-border text-info-text"
            }`}
          >
            {role}
          </span>
        ),
      },
      {
        title: "Email Verified",
        dataIndex: "isEmailVerified",
        render: (verified: boolean) => (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
              verified
                ? "bg-success border-success-border text-success-text"
                : "bg-warning border-warning-border text-warning-text"
            }`}
          >
            {verified ? "Verified" : "Not Verified"}
          </span>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        render: (v: any) => (
          <span className="text-sm text-card-text">
            {v ? prettyDate(v) : "-"}
          </span>
        ),
      },
      {
        title: "Actions",
        dataIndex: "actions",
        render: (_: any, row: User) => (
          <div className="flex gap-2">
            <IconButton
              icon={FiEdit as any}
              size="sm"
              outline
              fillBg
              hoverable
              title="Edit"
              onClick={() => {
                setSelectedUser(row);
                setEditOpen(true);
              }}
            />
            <IconButton
              icon={FiTrash as any}
              size="sm"
              outline
              fillBg
              hoverable
              title="Delete"
              onClick={() => {
                setUserToDelete(row);
                setDeleteConfirmOpen(true);
              }}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto space-y-6 p-2 md:p-6">
      <PageHeader
        title="User Management"
        description="Manage users, roles, and permissions."
        right={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create User
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-2xl border border-card-border bg-card p-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Search"
            name="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or username..."
          />
        </div>
        <div className="w-[200px]">
          <Select
            label="Role"
            name="role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as any);
              setPage(1);
            }}
            options={[
              { label: "All Roles", value: "" },
              { label: "Admin", value: "Admin" },
              { label: "Agent", value: "Agent" },
              { label: "Viewer", value: "Viewer" },
            ]}
          />
        </div>
      </div>

      {/* Paginated table */}
      <DataTable
        loading={loading}
        data={users}
        columns={columns}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
      />

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await fetchUsers(page, pageSize);
        }}
      />

      <EditUserModal
        isOpen={isEditOpen}
        user={selectedUser}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
        }}
        onUpdated={async () => {
          setEditOpen(false);
          setSelectedUser(null);
          await fetchUsers(page, pageSize);
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        user={userToDelete}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}

function CreateUserModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "Viewer" as "Admin" | "Agent" | "Viewer",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showWarningToast("Enter full name");
      return;
    }
    if (!formData.username.trim()) {
      showWarningToast("Enter username");
      return;
    }
    if (!formData.email.trim()) {
      showWarningToast("Enter email");
      return;
    }
    if (!formData.password.trim() || formData.password.length < 8) {
      showWarningToast("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      await UserService.createUser(formData);
      showSuccessToast("User created successfully");
      setFormData({
        fullName: "",
        username: "",
        email: "",
        password: "",
        role: "Viewer",
      });
      await onCreated();
    } catch (err: any) {
      // Error toast is handled automatically by centralized error handler
      console.error("Create user error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Create User</h2>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={(e) =>
            setFormData({ ...formData, fullName: e.target.value })
          }
          required
        />

        <Input
          label="Username"
          name="username"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
          minLength={8}
        />

        <Select
          label="Role"
          name="role"
          value={formData.role}
          onChange={(e) =>
            setFormData({
              ...formData,
              role: e.target.value as "Admin" | "Agent" | "Viewer",
            })
          }
          options={[
            { label: "Admin", value: "Admin" },
            { label: "Agent", value: "Agent" },
            { label: "Viewer", value: "Viewer" },
          ]}
        />

        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  isOpen,
  user,
  onClose,
  onUpdated,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "Viewer" as "Admin" | "Agent" | "Viewer",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        username: user.username || "",
        email: user.email || "",
        password: "",
        role: user.role || "Viewer",
      });
    }
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!formData.fullName.trim()) {
      showWarningToast("Enter full name");
      return;
    }
    if (!formData.username.trim()) {
      showWarningToast("Enter username");
      return;
    }
    if (!formData.email.trim()) {
      showWarningToast("Enter email");
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        role: formData.role,
      };
      // Only include password if provided
      if (formData.password.trim() && formData.password.length >= 8) {
        updateData.password = formData.password;
      }

      await UserService.updateUser(user._id, updateData);
      showSuccessToast("User updated successfully");
      await onUpdated();
    } catch (err: any) {
      // Error toast is handled automatically by centralized error handler
      console.error("Update user error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen && !!user} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Edit User</h2>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={(e) =>
            setFormData({ ...formData, fullName: e.target.value })
          }
          required
        />

        <Input
          label="Username"
          name="username"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <Input
          label="Password (leave blank to keep current)"
          name="password"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          minLength={8}
        />

        <Select
          label="Role"
          name="role"
          value={formData.role}
          onChange={(e) =>
            setFormData({
              ...formData,
              role: e.target.value as "Admin" | "Agent" | "Viewer",
            })
          }
          options={[
            { label: "Admin", value: "Admin" },
            { label: "Agent", value: "Agent" },
            { label: "Viewer", value: "Viewer" },
          ]}
        />

        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirmModal({
  isOpen,
  user,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal isOpen={isOpen && !!user} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Confirm Delete</h2>
      <p className="mt-3 text-sm text-card-text">
        Are you sure you want to delete user{" "}
        <span className="font-semibold text-text">
          {user?.fullName} ({user?.email})
        </span>
        ? This action cannot be undone.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : "Delete User"}
        </Button>
      </div>
    </Modal>
  );
}

