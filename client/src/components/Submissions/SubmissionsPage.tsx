import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SubmissionService } from "../../service/submissionService";
import Button from "../Reusable/Button";
import DataTable from "../Reusable/DataTable";
import Input from "../Reusable/Inputs/Input";
import Modal from "../Reusable/Modal";
import { prettyDate } from "../../utils/date";
import { FiEdit2, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router";
import { Submission } from "../../types/extraction.types";
import PageHeader from "../Reusable/PageHeader";
import { showWarningToast, showSuccessToast } from "../../utils/errorHandler";
import { Lead, LeadService } from "../../service/leadService";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSION_TOOLTIPS } from "../../utils/permissionUi";

const getRowId = (row: Submission) => row._id || "";

const SubmissionsPage: React.FC = () => {
  const { canWorkspace } = usePermissions();
  const canCreateClient = canWorkspace("workspace.submissions.manage");
  const canEditClient = canWorkspace("workspace.submissions.write");
  const canOpenClientDetail = canWorkspace("workspace.submissions.read");
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ✅ pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  // create modal
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [submissionName, setSubmissionName] = useState<string>("");
  const [createMode, setCreateMode] = useState<"manual" | "lead">("manual");
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // edit modal (name only)
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editRow, setEditRow] = useState<Submission | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editSaving, setEditSaving] = useState<boolean>(false);

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
    setCreateMode("manual");
    setSelectedLeadId("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (saving) return;
    setCreateOpen(false);
  };

  const handleCreate = async () => {
    const payload: Record<string, any> = {};
    if (createMode === "lead") {
      if (!selectedLeadId) {
        showWarningToast("Select a lead to create a client.");
        return;
      }
      payload.sourceLead = selectedLeadId;
      const lead = availableLeads.find((item) => item._id === selectedLeadId);
      if (lead?.fullName) payload.submission_name = lead.fullName;
    } else {
      const name = submissionName.trim();
      if (!name) {
        showWarningToast("Client name is required.");
        return;
      }
      payload.submission_name = name;
    }

    setSaving(true);

    try {
      await SubmissionService.createSubmission(payload);
      showSuccessToast("Client created successfully");

      // ✅ refresh current page (or go back to page 1 if you prefer)
      await fetchSubmissions(page, pageSize);

      setCreateOpen(false);
      setSubmissionName("");
      setCreateMode("manual");
      setSelectedLeadId("");
    } catch (e: any) {
      // Error toast is handled automatically by centralized error handler
      console.error("Create submission error:", e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchLeadsForCreate = async () => {
      if (!createOpen || !canCreateClient) return;
      try {
        const data = await LeadService.listLeads({
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        setAvailableLeads(data?.leads || []);
      } catch {
        setAvailableLeads([]);
      }
    };
    void fetchLeadsForCreate();
  }, [createOpen, canCreateClient]);

  /* -------------------- Edit (name only) -------------------- */
  const openEdit = useCallback((row: Submission) => {
    setEditRow(row);
    setEditName(row.submission_name || "");
    setEditOpen(true);
  }, []);

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditRow(null);
    setEditName("");
  };

  const handleEditSave = async () => {
    const id = editRow ? getRowId(editRow) : "";
    const name = editName.trim();

    if (!id) {
      showWarningToast("Invalid submission selected.");
      return;
    }
    if (!name) {
      showWarningToast("Client name is required.");
      return;
    }

    setEditSaving(true);

    try {
      await SubmissionService.updateSubmission(id, { submission_name: name });
      showSuccessToast("Client updated successfully");
      await fetchSubmissions(page, pageSize);
      closeEdit();
    } catch (e: any) {
      // Error toast is handled automatically by centralized error handler
      console.error("Update submission error:", e);
    } finally {
      setEditSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Client Name",
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
        title: "Lead Source",
        dataIndex: "sourceLead",
        key: "sourceLead",
        render: (_: any, row: Submission) => row?.sourceLead?.fullName || "-",
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
            <Button
              variant="secondary"
              onClick={() => openEdit(row)}
              disabled={!canEditClient}
              disabledTooltip={!canEditClient ? PERMISSION_TOOLTIPS.editClient : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
                Edit
              </span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`${row._id}`)}
              disabled={!canOpenClientDetail}
              disabledTooltip={!canOpenClientDetail ? PERMISSION_TOOLTIPS.manageClient : undefined}
            >
              Manage
            </Button>
          </div>
        ),
      },
    ],
    [openEdit, navigate, canEditClient, canOpenClientDetail],
  );

  return (
    <div className="space-y-4 p-2 md:p-6">
      <PageHeader
        title="Clients"
        description="Manage clients and continue extraction/document workflows."
        right={
          <Button
            variant="primary"
            onClick={openCreate}
            disabled={!canCreateClient}
            disabledTooltip={!canCreateClient ? PERMISSION_TOOLTIPS.addClient : undefined}
          >
            <span className="inline-flex items-center gap-2">
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              New Client
            </span>
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
            <h3 className="text-lg font-semibold text-text">Create Client</h3>
            <p className="text-sm text-text/70">
              Create a client manually or from an existing lead.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Client Creation Mode</label>
            <div className="flex gap-2">
              <Button
                variant={createMode === "manual" ? "primary" : "secondary"}
                onClick={() => setCreateMode("manual")}
                disabled={saving}
              >
                Manual
              </Button>
              <Button
                variant={createMode === "lead" ? "primary" : "secondary"}
                onClick={() => setCreateMode("lead")}
                disabled={saving}
              >
                From Lead
              </Button>
            </div>
          </div>

          {createMode === "manual" ? (
            <Input
              name="submission_name"
              label="Client Name"
              placeholder="e.g. John Smith"
              value={submissionName}
              onChange={(e) => setSubmissionName(e.target.value)}
              disabled={saving}
              required
            />
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">Select Lead</label>
              <select
                className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-sm text-text"
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                disabled={saving}
              >
                <option value="">Choose a lead</option>
                {availableLeads.map((lead) => (
                  <option key={lead._id} value={lead._id}>
                    {lead.fullName}{lead.usedAsClient ? " (already used)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            <h3 className="text-lg font-semibold text-text">Edit Client</h3>
            <p className="text-sm text-text/70">
              Update only the client name.
            </p>
          </div>

          <Input
            name="edit_submission_name"
            label="Client Name"
            placeholder="e.g. John Smith"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={editSaving}
            required
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
