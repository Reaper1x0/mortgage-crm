import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router";
import Button from "../../components/Reusable/Button";
import Modal from "../../components/Reusable/Modal";
import Input from "../../components/Reusable/Inputs/Input";
import DataTable from "../../components/Reusable/DataTable";
import { TemplateService } from "../../service/templateService";
import { TemplateDoc } from "../../types/template.types";
import { prettyDate } from "../../utils/date";
import PageHeader from "../Reusable/PageHeader";
import { showWarningToast, showSuccessToast } from "../../utils/errorHandler";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSION_TOOLTIPS } from "../../utils/permissionUi";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { canWorkspace, canAnyWorkspace } = usePermissions();
  const canManageTemplates = canWorkspace("workspace.templates.manage");
  const canOpenTemplateManage = canAnyWorkspace(["workspace.templates.manage", "workspace.templates.write"]);
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const [isCreateOpen, setCreateOpen] = useState(false);

  // ✅ pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const fetchTemplates = useCallback(
    async (p = page, ps = pageSize) => {
      setLoading(true);
      try {
        const res = await TemplateService.listTemplates({
          page: p,
          limit: ps,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        const list: TemplateDoc[] = res?.templates || [];
        const meta = res?.pagination;

        setTemplates(list);
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
    [page, pageSize],
  );

  useEffect(() => {
    fetchTemplates(page, pageSize);
  }, [page, pageSize, fetchTemplates]);

  const columns = useMemo(
    () => [
      { title: "Name", dataIndex: "name" },
      { title: "Pages", dataIndex: "pageCount" },
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
        render: (_: any, row: TemplateDoc) => (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`${row._id}/manage`)}
              disabled={!canOpenTemplateManage}
              disabledTooltip={!canOpenTemplateManage ? PERMISSION_TOOLTIPS.manageTemplate : undefined}
            >
              Manage
            </Button>
          </div>
        ),
      },
    ],
    [navigate, canOpenTemplateManage],
  );

  return (
    <div className="mx-auto space-y-6 p-2 md:p-6">
      <PageHeader
        title="Templates"
        description="Create templates and manage field placements on PDFs."
        right={
          <Button
            variant="primary"
            onClick={() => setCreateOpen(true)}
            disabled={!canManageTemplates}
            disabledTooltip={!canManageTemplates ? PERMISSION_TOOLTIPS.createTemplate : undefined}
          >
            <span className="inline-flex items-center gap-2">
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              Create Template
            </span>
          </Button>
        }
      />

      {/* ✅ Paginated table */}
      <DataTable
        loading={loading}
        data={templates}
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

      <CreateTemplateModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          // refresh current page (or setPage(1) if you prefer)
          await fetchTemplates(page, pageSize);
        }}
      />
    </div>
  );
}

function CreateTemplateModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      showWarningToast("Enter template name");
      return;
    }
    if (!file) {
      showWarningToast("Select a PDF file");
      return;
    }

    setSaving(true);
    try {
      await TemplateService.createTemplate(name.trim(), file);
      showSuccessToast("Template created successfully");
      await onCreated();
      setName("");
      setFile(null);
    } catch (err: any) {
      // Error toast is handled automatically by centralized error handler
      console.error("Template creation error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Create Template</h2>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input
          label="Template Name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="space-y-1">
          <label className="text-sm text-card-text">PDF File</label>
          <input
            type="file"
            accept="application/pdf"
            className="w-full text-sm text-text"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

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
