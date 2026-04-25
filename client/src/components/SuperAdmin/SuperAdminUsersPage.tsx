import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import PageHeader from "../Reusable/PageHeader";
import Avatar from "../Reusable/Avatar";
import { prettyDate } from "../../utils/date";
import { User, UserService } from "../../service/userService";
import { normalizeUserForAvatar } from "../../utils/userUtils";

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"superAdmin" | "user" | "">("");
  const [orgRoleFilter, setOrgRoleFilter] = useState<"Owner" | "Admin" | "Member" | "Viewer" | "">("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await UserService.listSystemUsers({
        page,
        limit: pageSize,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: searchQuery.trim() || undefined,
        role: roleFilter || undefined,
        orgRole: orgRoleFilter || undefined,
      });
      const list = response?.users || [];
      const pagination = response?.pagination;
      setUsers(list);
      setTotal(typeof pagination?.total === "number" ? pagination.total : list.length);
    } finally {
      setLoading(false);
    }
  }, [orgRoleFilter, page, pageSize, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns = useMemo(
    () => [
      {
        title: "User",
        dataIndex: "fullName",
        render: (_: any, row: User) => (
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
        title: "System Role",
        dataIndex: "role",
        render: (role: User["role"]) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold text-text">
            {role}
          </span>
        ),
      },
      {
        title: "Primary Org Role",
        dataIndex: "primaryOrganizationRole",
        render: (role: User["primaryOrganizationRole"]) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold text-text">
            {role || "-"}
          </span>
        ),
      },
      {
        title: "Organizations",
        dataIndex: "organizationCount",
        render: (count: number) => <span>{typeof count === "number" ? count : 0}</span>,
      },
      {
        title: "Workspaces",
        dataIndex: "workspaceCount",
        render: (count: number) => <span>{typeof count === "number" ? count : 0}</span>,
      },
      {
        title: "Email Verified",
        dataIndex: "isEmailVerified",
        render: (verified: boolean) => (
          <span className="text-sm text-card-text">{verified ? "Yes" : "No"}</span>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        render: (date: string) => <span className="text-sm text-card-text">{date ? prettyDate(date) : "-"}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="All System Users"
        description="System-level visibility across organizations, workspaces, and user roles."
      />

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-3">
        <Input
          name="searchUsers"
          label="Search users"
          placeholder="Search by name, username, email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
        <Select
          name="roleFilter"
          label="System role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as "superAdmin" | "user" | "");
            setPage(1);
          }}
          options={[
            { label: "All roles", value: "" },
            { label: "superAdmin", value: "superAdmin" },
            { label: "user", value: "user" },
          ]}
        />
        <Select
          name="orgRoleFilter"
          label="Organization role"
          value={orgRoleFilter}
          onChange={(e) => {
            setOrgRoleFilter(e.target.value as "Owner" | "Admin" | "Member" | "Viewer" | "");
            setPage(1);
          }}
          options={[
            { label: "All org roles", value: "" },
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
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />
    </div>
  );
}
