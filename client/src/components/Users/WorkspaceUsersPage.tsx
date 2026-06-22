import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import PageHeader from "../Reusable/PageHeader";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import Button from "../Reusable/Button";
import Avatar from "../Reusable/Avatar";
import { prettyDate } from "../../utils/date";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { User, UserService } from "../../service/userService";
import { OrganizationService, RoleRow } from "../../service/organizationService";
import { usePermissions } from "../../context/PermissionContext";
import { buildOrganizationPath } from "../../utils/tenantRouting";

export default function WorkspaceUsersPage() {
  const { organizationId } = useParams();
  const { canOrg } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [workspaceRoles, setWorkspaceRoles] = useState<RoleRow[]>([]);

  const canManageMembers =
    canOrg("organization.members.invite") ||
    canOrg("organization.members.update") ||
    canOrg("organization.members.remove");

  const orgUsersPath =
    organizationId && /^[a-f\d]{24}$/i.test(organizationId)
      ? buildOrganizationPath(organizationId, "settings/users")
      : null;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await UserService.listUsers({
        page,
        limit: pageSize,
        sortBy: "createdAt",
        sortOrder: "desc",
        workspaceRoleId: roleFilter || undefined,
        search: searchQuery.trim() || undefined,
      });
      const list = response?.users || [];
      const meta = response?.pagination;
      setUsers(list);
      setTotal(typeof meta?.total === "number" ? meta.total : list.length);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await OrganizationService.listWorkspaceRoles();
        if (!cancelled) setWorkspaceRoles(res.data?.roles || []);
      } catch {
        if (!cancelled) setWorkspaceRoles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        render: (role: string) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold text-text">
            {role}
          </span>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        render: (value: string) => (
          <span className="text-sm text-card-text">{value ? prettyDate(value) : "-"}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workspace Members"
        description="View who has access to this workspace and their workspace role. Add, edit, or remove users from Organization Settings → Users."
        actions={
          canManageMembers && orgUsersPath ? (
            <Link to={orgUsersPath}>
              <Button variant="primary">Manage in Organization Settings</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-2">
        <Input
          name="searchWorkspaceUsers"
          label="Search members"
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
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { label: "All roles", value: "" },
            ...workspaceRoles.map((role) => ({ label: role.name, value: role._id })),
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
    </div>
  );
}
