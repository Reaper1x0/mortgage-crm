import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SubmissionService } from "../../service/submissionService";
import Button from "../Reusable/Button";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Modal from "../Reusable/Modal";
import { prettyDate } from "../../utils/date";
import { FiEdit2 } from "react-icons/fi";
import { useNavigate } from "react-router";
import { Submission } from "../../types/extraction.types";
import PageHeader from "../Reusable/PageHeader";

const getRowId = (row: Submission) => row._id || "";

const SubmissionsPage: React.FC = () => {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ✅ pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  // create modal
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [submissionName, setSubmissionName] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // edit modal (name only)
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editRow, setEditRow] = useState<Submission | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");

  const navigate = useNavigate();

  const fetchSubmissions = useCallback(
    async (p = page, ps = pageSize) => {
      setLoading(true);
      try {
        const data = await SubmissionService.getAllSubmissions({
          page: p,
          limit: ps,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        const list: Submission[] = data?.submissions || [];
        const meta = data?.pagination;

        setRows(list);
        setTotal(typeof meta?.total === "number" ? meta.total : list.length);

        // ✅ if backend clamps page and returns different page, optionally sync:
        if (typeof meta?.page === "number") setPage(meta.page);
        if (typeof meta?.limit === "number") setPageSize(meta.limit);
      } catch (e: any) {
        console.error(e);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    fetchSubmissions(page, pageSize);
  }, [page, pageSize, fetchSubmissions]);

  /* -------------------- Create -------------------- */
  const openCreate = () => {
    setSubmissionName("");
    setError("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (saving) return;
    setCreateOpen(false);
  };

  const handleCreate = async () => {
    const name = submissionName.trim();
    if (!name) {
      setError("Submission name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await SubmissionService.createSubmission({ submission_name: name });

      // ✅ refresh current page (or go back to page 1 if you prefer)
      await fetchSubmissions(page, pageSize);

      setCreateOpen(false);
      setSubmissionName("");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to create submission.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- Edit (name only) -------------------- */
  const openEdit = useCallback((row: Submission) => {
    setEditRow(row);
    setEditName(row.submission_name || "");
    setEditError("");
    setEditOpen(true);
  }, []);

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditRow(null);
    setEditName("");
    setEditError("");
  };

  const handleEditSave = async () => {
    const id = editRow ? getRowId(editRow) : "";
    const name = editName.trim();

    if (!id) {
      setEditError("Invalid submission selected.");
      return;
    }
    if (!name) {
      setEditError("Submission name is required.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      await SubmissionService.updateSubmission(id, { submission_name: name });
      await fetchSubmissions(page, pageSize);
      closeEdit();
    } catch (e: any) {
      console.error(e);
      setEditError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to update submission.",
      );
    } finally {
      setEditSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Submission Name",
        dataIndex: "submission_name",
        key: "submission_name",
        render: (value: any) => value || "-",
      },
      {
        title: "Legal Name",
        dataIndex: "legal_name",
        key: "legal_name",
        render: (value: any) => value || "-",
      },
      {
        title: "Documents",
        dataIndex: "documents",
        key: "documents",
        render: (_: any, row: Submission) =>
          Array.isArray(row.documents) ? row.documents.length : 0,
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (value: any) => (value ? prettyDate(value) : "-"),
      },
      {
        title: "Actions",
        dataIndex: "",
        key: "actions",
        render: (_: any, row: Submission) => (
          <div className="inline-flex items-center gap-2">
            <Button variant="secondary" onClick={() => openEdit(row)}>
              <span className="inline-flex items-center gap-2">
                <FiEdit2 />
                Edit
              </span>
            </Button>
            <Button variant="secondary" onClick={() => navigate(`${row._id}`)}>
              Manage
            </Button>
          </div>
        ),
      },
    ],
    [openEdit, navigate],
  );

  return (
    <div className="space-y-4 p-2 md:p-6">
      <PageHeader
        title="Submissions"
        description="Manage submissions Burhan and view uploaded document sets."
        right={
          <Button variant="primary" onClick={openCreate}>
            + Create Submission
          </Button>
        }
      />

      {/* ✅ Table with pagination */}
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
      />

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={closeCreate}>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text">
              Create Submission
            </h3>
            <p className="text-sm text-text/70">
              Enter a submission name to create a new record.
            </p>
          </div>

          <Input
            name="submission_name"
            label="Submission Name"
            placeholder="e.g. Vendor Batch - January"
            value={submissionName}
            onChange={(e) => setSubmissionName(e.target.value)}
            error={error || undefined}
            disabled={saving}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeCreate} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} isLoading={saving}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal (name only) */}
      <Modal isOpen={editOpen} onClose={closeEdit}>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Edit Submission</h3>
            <p className="text-sm text-text/70">
              Update only the submission name.
            </p>
          </div>

          <Input
            name="edit_submission_name"
            label="Submission Name"
            placeholder="e.g. Vendor Batch - January"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            error={editError || undefined}
            disabled={editSaving}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={closeEdit}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSave}
              isLoading={editSaving}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubmissionsPage;
