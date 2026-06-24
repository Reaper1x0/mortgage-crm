import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FiExternalLink, FiPlus } from "react-icons/fi";
import PageHeader from "../Reusable/PageHeader";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Button from "../Reusable/Button";
import Modal from "../Reusable/Modal";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { WorkspaceService, OrganizationWorkspaceSummary } from "../../service/workspaceService";
import { buildWorkspacePath } from "../../utils/tenantRouting";

type WorkspaceRow = OrganizationWorkspaceSummary & { workspaceId: string };

export default function OrganizationWorkspacesSettings() {
  const navigate = useNavigate();
  const { organizationId } = useParams();
  const { organizations, refreshWorkspaces, setActiveOrganizationId, setActiveWorkspaceId } = useAuth();
  const { canOrg, effective } = usePermissions();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  const canCreateWorkspace =
    Boolean(effective?.isOrgOwner) || canOrg("organization.workspaces.create");

  const orgMembership = useMemo(
    () => organizations.find((o) => o.organizationId === organizationId) || null,
    [organizations, organizationId]
  );

  const allRows = useMemo<WorkspaceRow[]>(
    () => (orgMembership?.workspaces || []).map((w) => ({ ...w, workspaceId: w.workspaceId })),
    [orgMembership]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        String(row.role || "").toLowerCase().includes(q)
    );
  }, [allRows, searchQuery]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      await refreshWorkspaces();
    } finally {
      setLoading(false);
    }
  }, [refreshWorkspaces]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const handleOpenWorkspace = useCallback(
    (workspaceId: string) => {
      if (!organizationId) return;
      setActiveOrganizationId(organizationId);
      setActiveWorkspaceId(workspaceId);
      navigate(buildWorkspacePath(organizationId, workspaceId, "dashboard"));
    },
    [navigate, organizationId, setActiveOrganizationId, setActiveWorkspaceId]
  );

  const handleCreateWorkspace = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2 || !organizationId) return;

    setCreating(true);
    try {
      const res = await WorkspaceService.create(trimmed, organizationId);
      const wid = res.data?.workspace?._id;
      await refreshWorkspaces();
      setCreateOpen(false);
      setNewName("");
      if (wid) {
        handleOpenWorkspace(String(wid));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Workspace",
        dataIndex: "name",
        render: (_: unknown, row: WorkspaceRow) => (
          <div>
            <div className="font-semibold text-text">{row.name}</div>
            <div className="text-xs text-card-text">{row.slug}</div>
          </div>
        ),
      },
      {
        title: "Your role",
        dataIndex: "role",
        render: (role: string) => (
          <span className="inline-flex rounded-full border border-card-border px-2.5 py-1 text-xs font-semibold text-text">
            {role || "—"}
          </span>
        ),
      },
      {
        title: "",
        dataIndex: "workspaceId",
        render: (_: unknown, row: WorkspaceRow) => (
          <Button variant="secondary" onClick={() => handleOpenWorkspace(row.workspaceId)}>
            <span className="inline-flex items-center gap-2">
              Open <FiExternalLink className="h-4 w-4" />
            </span>
          </Button>
        ),
      },
    ],
    [handleOpenWorkspace]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workspaces"
        description="Workspaces in this organization that you can access. Open a workspace or create a new one."
        actions={
          canCreateWorkspace ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <FiPlus className="h-4 w-4" />
                Create workspace
              </span>
            </Button>
          ) : null
        }
      />

      <div className="rounded-2xl border border-card-border bg-card p-4">
        <Input
          name="searchWorkspaces"
          label="Search workspaces"
          placeholder="Search by name, slug, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <DataTable
        loading={loading}
        data={pagedRows}
        columns={columns}
        page={page}
        pageSize={pageSize}
        total={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />

      <Modal isOpen={createOpen} onClose={() => !creating && setCreateOpen(false)}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">New workspace</h2>
            <p className="mt-1 text-sm text-card-text">
              Create a workspace in {orgMembership?.name || "this organization"}. You will be switched to it after creation.
            </p>
          </div>
          {!canCreateWorkspace ? (
            <p className="rounded-xl border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning">
              You do not have permission to create workspaces in this organization.
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
              onClick={handleCreateWorkspace}
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
