import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiUpload } from "react-icons/fi";
import PageHeader from "../Reusable/PageHeader";
import Button from "../Reusable/Button";
import DataTable from "../Reusable/DataTable";
import Modal from "../Reusable/Modal";
import Input from "../Reusable/Inputs/Input";
import TextArea from "../Reusable/Inputs/TextArea";
import IconButton from "../Reusable/IconButton";
import Select from "../Reusable/Inputs/Select";
import Checkbox from "../Reusable/Checkbox";
import { prettyDate } from "../../utils/date";
import { showSuccessToast, showWarningToast } from "../../utils/errorHandler";
import { Lead, LeadService } from "../../service/leadService";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSION_TOOLTIPS } from "../../utils/permissionUi";

type LeadFormData = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  notes: string;
};

const LEAD_FIELDS = ["fullName", "email", "phone", "company", "source", "notes"] as const;
type LeadField = (typeof LEAD_FIELDS)[number];

const FIELD_LABELS: Record<LeadField, string> = {
  fullName: "Full Name (Required)",
  email: "Email",
  phone: "Phone",
  company: "Company",
  source: "Source",
  notes: "Notes",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyLeadForm: LeadFormData = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  source: "",
  notes: "",
};

const getLeadPayload = (formData: LeadFormData) => ({
  fullName: formData.fullName.trim(),
  email: formData.email.trim(),
  phone: formData.phone.trim(),
  company: formData.company.trim(),
  source: formData.source.trim(),
  notes: formData.notes.trim(),
});

export default function LeadsPage() {
  const { canWorkspace } = usePermissions();
  const canLeadsWrite = canWorkspace("workspace.leads.write");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isBulkOpen, setBulkOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const fetchLeads = useCallback(
    async (p = page, ps = pageSize) => {
      setLoading(true);
      try {
        const params: {
          page: number;
          limit: number;
          sortBy: string;
          sortOrder: "asc" | "desc";
          search?: string;
          source?: string;
          company?: string;
          createdFrom?: string;
          createdTo?: string;
        } = {
          page: p,
          limit: ps,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (sourceFilter.trim()) params.source = sourceFilter.trim();
        if (companyFilter.trim()) params.company = companyFilter.trim();
        if (createdFrom) params.createdFrom = createdFrom;
        if (createdTo) params.createdTo = createdTo;

        const res = await LeadService.listLeads(params);
        const list = res?.leads || [];
        const meta = res?.pagination;
        setLeads(list);
        setSelectedLeadIds((prev) => prev.filter((id) => list.some((lead) => lead._id === id)));
        setTotal(typeof meta?.total === "number" ? meta.total : list.length);
        if (typeof meta?.page === "number") setPage(meta.page);
        if (typeof meta?.limit === "number") setPageSize(meta.limit);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchQuery, sourceFilter, companyFilter, createdFrom, createdTo]
  );

  useEffect(() => {
    fetchLeads(page, pageSize);
  }, [page, pageSize, fetchLeads]);

  const handleDelete = async () => {
    if (!leadToDelete) return;
    setLoading(true);
    try {
      await LeadService.deleteLead(leadToDelete._id);
      showSuccessToast("Lead deleted successfully");
      setDeleteConfirmOpen(false);
      setLeadToDelete(null);
      await fetchLeads(page, pageSize);
    } finally {
      setLoading(false);
    }
  };

  const toggleLeadSelection = (leadId: string, checked: boolean) => {
    setSelectedLeadIds((prev) => {
      if (checked) {
        if (prev.includes(leadId)) return prev;
        return [...prev, leadId];
      }
      return prev.filter((id) => id !== leadId);
    });
  };

  const allVisibleSelected = leads.length > 0 && leads.every((lead) => selectedLeadIds.includes(lead._id));

  const toggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const visibleIds = leads.map((lead) => lead._id);
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }
    const visibleIdSet = new Set(leads.map((lead) => lead._id));
    setSelectedLeadIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
  };

  const handleBulkDelete = async () => {
    if (!selectedLeadIds.length) return;
    setLoading(true);
    try {
      await LeadService.bulkDeleteLeads(selectedLeadIds);
      showSuccessToast(`${selectedLeadIds.length} lead(s) deleted successfully`);
      setSelectedLeadIds([]);
      setBulkDeleteConfirmOpen(false);
      await fetchLeads(page, pageSize);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSingleLead = useCallback(
    async (lead: Lead) => {
      setLoading(true);
      try {
        const res = await LeadService.moveLeadToClient(lead._id);
        showSuccessToast(`${lead.fullName} moved to client`);
        if (res.skippedCount > 0) {
          showWarningToast(`${res.skippedCount} lead(s) skipped`);
        }
        await fetchLeads(page, pageSize);
      } finally {
        setLoading(false);
      }
    },
    [fetchLeads, page, pageSize]
  );

  const handleBulkMoveToClients = async () => {
    if (!selectedLeadIds.length) return;
    setLoading(true);
    try {
      const res = await LeadService.bulkMoveLeadsToClients(selectedLeadIds);
      showSuccessToast(`${res.movedCount} lead(s) moved to client`);
      if (res.skippedCount > 0) {
        showWarningToast(`${res.skippedCount} lead(s) skipped`);
      }
      setSelectedLeadIds([]);
      await fetchLeads(page, pageSize);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allVisibleSelected}
              onChange={(e) => toggleSelectAllVisible(e.target.checked)}
              size="sm"
              disabled={!canLeadsWrite}
              title={!canLeadsWrite ? PERMISSION_TOOLTIPS.leadBulkSelection : undefined}
            />
          </div>
        ),
        dataIndex: "select",
        render: (_: unknown, row: Lead) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectedLeadIds.includes(row._id)}
              onChange={(e) => toggleLeadSelection(row._id, e.target.checked)}
              size="sm"
              disabled={!canLeadsWrite}
              title={!canLeadsWrite ? PERMISSION_TOOLTIPS.leadBulkSelection : undefined}
            />
          </div>
        ),
      },
      { title: "Full Name", dataIndex: "fullName" },
      { title: "Email", dataIndex: "email", render: (v: string) => v || "-" },
      { title: "Phone", dataIndex: "phone", render: (v: string) => v || "-" },
      { title: "Company", dataIndex: "company", render: (v: string) => v || "-" },
      { title: "Source", dataIndex: "source", render: (v: string) => v || "-" },
      {
        title: "Used As Client",
        dataIndex: "usedAsClient",
        render: (_: unknown, row: Lead) => (row.usedAsClient ? `Yes (${row.clientCount || 0})` : "No"),
      },
      {
        title: "Created At",
        dataIndex: "createdAt",
        render: (v: string) => <span className="text-sm text-card-text">{v ? prettyDate(v) : "-"}</span>,
      },
      {
        title: "Actions",
        dataIndex: "actions",
        render: (_: unknown, row: Lead) => (
          <div className="flex gap-2">
            <IconButton
              icon={FiEdit2 as never}
              size="sm"
              outline
              fillBg
              hoverable
              title="Edit lead"
              onClick={() => {
                setSelectedLead(row);
                setEditOpen(true);
              }}
              disabled={!canLeadsWrite}
              disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.editLead : undefined}
            />
            <IconButton
              icon={FiTrash2 as never}
              size="sm"
              outline
              fillBg
              hoverable
              title="Delete lead"
              onClick={() => {
                setLeadToDelete(row);
                setDeleteConfirmOpen(true);
              }}
              disabled={!canLeadsWrite}
              disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.deleteLead : undefined}
            />
            <Button
              variant="secondary"
              onClick={() => handleMoveSingleLead(row)}
              disabled={loading || !canLeadsWrite}
              disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.moveLeadToClient : undefined}
            >
              Make Client
            </Button>
          </div>
        ),
      },
    ],
    [allVisibleSelected, selectedLeadIds, canLeadsWrite, loading, handleMoveSingleLead]
  );

  return (
    <div className="mx-auto space-y-6 p-2 md:p-6">
      <PageHeader
        title="Leads"
        description="Manage your leads and import them from spreadsheets."
        right={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setBulkOpen(true)}
              disabled={!canLeadsWrite}
              disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.bulkLeads : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <FiUpload className="h-4 w-4 shrink-0" aria-hidden />
                Bulk Upload
              </span>
            </Button>
            <Button
              variant="primary"
              onClick={() => setCreateOpen(true)}
              disabled={!canLeadsWrite}
              disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.addLead : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                Add Lead
              </span>
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-card-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Search"
            name="leadSearch"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Name, email, phone..."
          />
          <Input
            label="Source"
            name="sourceFilter"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Website, Referral..."
          />
          <Input
            label="Company"
            name="companyFilter"
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Company name"
          />
          <Input
            label="Created From"
            name="createdFrom"
            type="date"
            value={createdFrom}
            onChange={(e) => {
              setCreatedFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Created To"
            name="createdTo"
            type="date"
            value={createdTo}
            onChange={(e) => {
              setCreatedTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="mt-3">
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery("");
              setSourceFilter("");
              setCompanyFilter("");
              setCreatedFrom("");
              setCreatedTo("");
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {selectedLeadIds.length > 0 && (
        <div className="rounded-2xl border border-card-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-card-text">
              <span className="font-semibold text-text">{selectedLeadIds.length}</span> lead(s) selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleBulkMoveToClients}
                disabled={loading || !canLeadsWrite}
                disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.moveLeadToClient : undefined}
              >
                Make Clients
              </Button>
              <Button
                variant="danger"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                disabled={loading || !canLeadsWrite}
                disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.bulkDeleteLeads : undefined}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        loading={loading}
        data={leads}
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

      <LeadFormModal
        isOpen={isCreateOpen}
        title="Add Lead"
        submitLabel="Create Lead"
        initialData={emptyLeadForm}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await LeadService.createLead(payload);
          showSuccessToast("Lead created successfully");
          setCreateOpen(false);
          await fetchLeads(page, pageSize);
        }}
      />

      <LeadFormModal
        isOpen={isEditOpen}
        title="Edit Lead"
        submitLabel="Save Changes"
        initialData={{
          fullName: selectedLead?.fullName || "",
          email: selectedLead?.email || "",
          phone: selectedLead?.phone || "",
          company: selectedLead?.company || "",
          source: selectedLead?.source || "",
          notes: selectedLead?.notes || "",
        }}
        onClose={() => {
          setEditOpen(false);
          setSelectedLead(null);
        }}
        onSubmit={async (payload) => {
          if (!selectedLead) return;
          await LeadService.updateLead(selectedLead._id, payload);
          showSuccessToast("Lead updated successfully");
          setEditOpen(false);
          setSelectedLead(null);
          await fetchLeads(page, pageSize);
        }}
      />

      <DeleteLeadModal
        isOpen={deleteConfirmOpen}
        lead={leadToDelete}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setLeadToDelete(null);
        }}
        onConfirm={handleDelete}
        loading={loading}
      />

      <DeleteSelectedLeadsModal
        isOpen={bulkDeleteConfirmOpen}
        count={selectedLeadIds.length}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        loading={loading}
      />

      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setBulkOpen(false)}
        onImported={async () => {
          setBulkOpen(false);
          await fetchLeads(page, pageSize);
        }}
      />
    </div>
  );
}

function DeleteSelectedLeadsModal({
  isOpen,
  count,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal isOpen={isOpen && count > 0} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Confirm Bulk Delete</h2>
      <p className="mt-3 text-sm text-card-text">
        Are you sure you want to delete <span className="font-semibold text-text">{count}</span> selected lead(s)?
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : "Delete Selected"}
        </Button>
      </div>
    </Modal>
  );
}

function LeadFormModal({
  isOpen,
  title,
  submitLabel,
  initialData,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  initialData: LeadFormData;
  onClose: () => void;
  onSubmit: (payload: LeadFormData) => Promise<void>;
}) {
  const [formData, setFormData] = useState<LeadFormData>(initialData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = getLeadPayload(formData);
    if (!payload.fullName) {
      showWarningToast("Full name is required");
      return;
    }
    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
      showWarningToast("Please enter a valid email");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(payload);
      setFormData(emptyLeadForm);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="Optional"
        />
        <Input
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          placeholder="Optional"
        />
        <Input
          label="Company"
          name="company"
          value={formData.company}
          onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
          placeholder="Optional"
        />
        <Input
          label="Source"
          name="source"
          value={formData.source}
          onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
          placeholder="Optional"
        />
        <TextArea
          label="Notes"
          name="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Optional"
          rows={3}
        />
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteLeadModal({
  isOpen,
  lead,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal isOpen={isOpen && !!lead} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Confirm Delete</h2>
      <p className="mt-3 text-sm text-card-text">
        Are you sure you want to delete lead <span className="font-semibold text-text">{lead?.fullName}</span>?
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : "Delete Lead"}
        </Button>
      </div>
    </Modal>
  );
}

function BulkUploadModal({
  isOpen,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<LeadField, string>>({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    source: "",
    notes: "",
  });
  const [result, setResult] = useState<{
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    skippedReasons: Array<{ row: number; reason: string }>;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFile(null);
      setColumns([]);
      setRows([]);
      setPreviewRows([]);
      setMapping({ fullName: "", email: "", phone: "", company: "", source: "", notes: "" });
      setResult(null);
      setProcessing(false);
    }
  }, [isOpen]);

  const parseFile = async () => {
    if (!file) {
      showWarningToast("Please select a CSV or XLSX file");
      return;
    }
    setProcessing(true);
    try {
      const data = await LeadService.bulkPreview(file);
      if (!data.columns.length) {
        showWarningToast("No columns detected in the uploaded file");
        return;
      }
      setColumns(data.columns);
      setRows(data.rows || []);
      setPreviewRows(data.previewRows || []);
      setStep(2);
    } finally {
      setProcessing(false);
    }
  };

  const proceedToMapping = () => {
    if (!columns.length) {
      showWarningToast("No columns available for mapping");
      return;
    }
    setStep(3);
  };

  const runImport = async () => {
    if (!mapping.fullName) {
      showWarningToast("Please map Full Name");
      return;
    }
    setProcessing(true);
    try {
      const importResult = await LeadService.bulkImport({ rows, mapping });
      setResult({
        totalRows: importResult.totalRows,
        importedRows: importResult.importedRows,
        skippedRows: importResult.skippedRows,
        skippedReasons: importResult.skippedReasons || [],
      });
      showSuccessToast("Leads import completed");
      setStep(5);
      await onImported();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">Bulk Upload Leads</h2>
      <p className="mt-1 text-sm text-card-text">Step {step} of 5</p>

      {step === 1 && (
        <div className="mt-4 space-y-4">
          <Input
            label="Spreadsheet File"
            name="bulkFile"
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={parseFile} disabled={processing}>
              {processing ? "Parsing..." : "Continue"}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-text">Detected Columns</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {columns.map((column) => (
                <span key={column} className="rounded-full border border-card-border px-3 py-1 text-xs text-card-text">
                  {column}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Preview Rows</h3>
            <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-card-border p-2 text-xs text-card-text">
              {previewRows.length ? (
                previewRows.map((row, index) => (
                  <pre key={index} className="mb-2 whitespace-pre-wrap">
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ))
              ) : (
                <p>No row preview available.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={proceedToMapping}>
              Next: Map Columns
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4 space-y-4">
          {LEAD_FIELDS.map((field) => (
            <Select
              key={field}
              label={FIELD_LABELS[field]}
              name={`map-${field}`}
              value={mapping[field]}
              onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
              options={[
                { label: field === "fullName" ? "Select required column" : "Do not map", value: "" },
                ...columns.map((column) => ({ label: column, value: column })),
              ]}
            />
          ))}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(4)}>
              Review Import
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-card-border p-3">
            <h3 className="font-semibold text-text">Import Summary</h3>
            <p className="mt-1 text-sm text-card-text">Rows ready for import: {rows.length}</p>
            <p className="mt-1 text-sm text-card-text">Required mapping: {mapping.fullName || "Not mapped"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button variant="primary" onClick={runImport} disabled={processing}>
              {processing ? "Importing..." : "Import Leads"}
            </Button>
          </div>
        </div>
      )}

      {step === 5 && result && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-card-border p-3 text-sm">
            <p className="text-card-text">
              Total rows: <span className="font-semibold text-text">{result.totalRows}</span>
            </p>
            <p className="text-card-text">
              Imported rows: <span className="font-semibold text-success-text">{result.importedRows}</span>
            </p>
            <p className="text-card-text">
              Skipped rows: <span className="font-semibold text-warning-text">{result.skippedRows}</span>
            </p>
          </div>
          {result.skippedReasons.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-xl border border-card-border p-3 text-xs text-card-text">
              {result.skippedReasons.map((item, idx) => (
                <p key={`${item.row}-${idx}`}>
                  Row {item.row}: {item.reason}
                </p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
