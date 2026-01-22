import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import Button from "../../components/Reusable/Button";
import Modal from "../../components/Reusable/Modal";
import Input from "../../components/Reusable/Inputs/Input";
import DataTable from "../../components/Reusable/DataTable";
import { TemplateService } from "../../service/templateService";
import { TemplateDoc } from "../../types/template.types";
import { prettyDate } from "../../utils/date";
import PageHeader from "../Reusable/PageHeader";

export default function TemplatesPage() {
  const navigate = useNavigate();
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
            >
              Manage
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="mx-auto space-y-6 p-2 md:p-6">
      <PageHeader
        title="Templates"
        description="Create templates and manage field placements on PDFs."
        right={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create Template
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
    if (!name.trim()) return alert("Enter template name");
    if (!file) return alert("Select a PDF file");

    setSaving(true);
    try {
      await TemplateService.createTemplate(name.trim(), file);
      await onCreated();
      setName("");
      setFile(null);
    } catch (err: any) {
      alert(err?.message || "Failed to create template");
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
