import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiEdit2, FiPlus, FiTrash2, FiUpload } from "react-icons/fi";
import PageHeader from "../Reusable/PageHeader";
import Button from "../Reusable/Button";
import DataTable from "../Reusable/DataTable";
import Modal from "../Reusable/Modal";
import Input from "../Reusable/Inputs/Input";
import TextArea from "../Reusable/Inputs/TextArea";
import IconButton from "../Reusable/IconButton";
import ListFilterPanel, { type FilterFieldConfig } from "../Reusable/ListFilterPanel";
import BulkActionBar from "../Reusable/BulkActionBar";
import BulkImportWizard from "../Reusable/BulkImportWizard";
import { prettyDate } from "../../utils/date";
import { showSuccessToast, showWarningToast } from "../../utils/errorHandler";
import { Lead, LeadService } from "../../service/leadService";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSION_TOOLTIPS } from "../../utils/permissionUi";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { useRowSelection } from "../../hooks/useRowSelection";
import type { ListQueryParams } from "../../types/listQuery";

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

const LEAD_FILTER_FIELDS: FilterFieldConfig[] = [
  { type: "search", key: "search", label: "Search", placeholder: "Name, email, phone..." },
  { type: "text", key: "source", label: "Source", placeholder: "Website, Referral..." },
  { type: "text", key: "company", label: "Company", placeholder: "Company name" },
  { type: "date", key: "createdFrom", label: "Created From" },
  { type: "date", key: "createdTo", label: "Created To" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyLeadForm: LeadFormData = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  source: "",
  notes: "",
};

const LEAD_INITIAL_FILTERS = {
  search: "",
  source: "",
  company: "",
  createdFrom: "",
  createdTo: "",
};

async function fetchLeadsList(params: ListQueryParams) {
  const res = await LeadService.listLeads(params);
  return { items: res.leads, pagination: res.pagination };
}

const leadRowKey = (row: Lead) => row._id;

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

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isBulkOpen, setBulkOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const list = usePaginatedList<Lead>({
    fetchFn: fetchLeadsList,
    initialFilters: LEAD_INITIAL_FILTERS,
  });

  const selection = useRowSelection<Lead>({
    rowKey: leadRowKey,
    rows: list.data,
  });

  const filterValues = useMemo(
    () => ({
      search: String(list.filters.search ?? ""),
      source: String(list.filters.source ?? ""),
      company: String(list.filters.company ?? ""),
      createdFrom: String(list.filters.createdFrom ?? ""),
      createdTo: String(list.filters.createdTo ?? ""),
    }),
    [list.filters],
  );

  const handleDelete = async () => {
    if (!leadToDelete) return;
    setActionLoading(true);
    try {
      await LeadService.deleteLead(leadToDelete._id);
      showSuccessToast("Lead deleted successfully");
      setDeleteConfirmOpen(false);
      setLeadToDelete(null);
      await list.refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selection.selectedKeys.length) return;
    setActionLoading(true);
    try {
      await LeadService.bulkDeleteLeads(selection.selectedKeys);
      showSuccessToast(`${selection.selectedKeys.length} lead(s) deleted successfully`);
      selection.clear();
      setBulkDeleteConfirmOpen(false);
      await list.refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveSingleLead = useCallback(
    async (lead: Lead) => {
      setActionLoading(true);
      try {
        const res = await LeadService.moveLeadToClient(lead._id);
        showSuccessToast(`${lead.fullName} moved to client`);
        if (res.skippedCount > 0) {
          showWarningToast(`${res.skippedCount} lead(s) skipped`);
        }
        await list.refetch();
      } finally {
        setActionLoading(false);
      }
    },
    [list],
  );

  const handleBulkMoveToClients = async () => {
    if (!selection.selectedKeys.length) return;
    setActionLoading(true);
    try {
      const res = await LeadService.bulkMoveLeadsToClients(selection.selectedKeys);
      showSuccessToast(`${res.movedCount} lead(s) moved to client`);
      if (res.skippedCount > 0) {
        showWarningToast(`${res.skippedCount} lead(s) skipped`);
      }
      selection.clear();
      await list.refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadSampleTemplate = useCallback(async () => {
    setDownloadingSample(true);
    try {
      await LeadService.downloadLeadsImportTemplate();
    } finally {
      setDownloadingSample(false);
    }
  }, []);

  const busy = list.loading || actionLoading;

  const columns = useMemo(
    () => [
      { title: "Full Name", dataIndex: "fullName", sortable: true },
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
        sortable: true,
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
              disabled={busy || !canLeadsWrite}
              disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.moveLeadToClient : undefined}
            >
              Make Client
            </Button>
          </div>
        ),
      },
    ],
    [busy, canLeadsWrite, handleMoveSingleLead],
  );

  return (
    <div className="mx-auto space-y-6 p-2 md:p-6">
      <PageHeader
        title="Leads"
        description="Manage your leads and import them from spreadsheets."
        actions={
          <>
            <Button variant="secondary" onClick={handleDownloadSampleTemplate} disabled={downloadingSample}>
              <span className="inline-flex items-center gap-2">
                <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">
                  {downloadingSample ? "Preparing…" : "Sample leads format (XLSX)"}
                </span>
                <span className="sm:hidden">{downloadingSample ? "…" : "Sample"}</span>
              </span>
            </Button>
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
          </>
        }
      />

      <ListFilterPanel
        fields={LEAD_FILTER_FIELDS}
        values={filterValues}
        onChange={(key, value) => list.setFilter(key as keyof typeof filterValues, value)}
        onClear={list.clearFilters}
      />

      <BulkActionBar selectedCount={selection.selectedCount} itemLabel="lead">
        <Button
          variant="secondary"
          onClick={handleBulkMoveToClients}
          disabled={busy || !canLeadsWrite}
          disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.moveLeadToClient : undefined}
        >
          Make Clients
        </Button>
        <Button
          variant="danger"
          onClick={() => setBulkDeleteConfirmOpen(true)}
          disabled={busy || !canLeadsWrite}
          disabledTooltip={!canLeadsWrite ? PERMISSION_TOOLTIPS.bulkDeleteLeads : undefined}
        >
          Delete Selected
        </Button>
      </BulkActionBar>

      <DataTable
        loading={list.loading}
        data={list.data}
        columns={columns}
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        rowKey={(row) => row._id}
        rowSelection={{
          selectedKeys: selection.selectedKeys,
          onToggle: selection.toggle,
          onToggleAllVisible: selection.toggleAllVisible,
          allVisibleSelected: selection.allVisibleSelected,
          someVisibleSelected: selection.someVisibleSelected,
          disabled: !canLeadsWrite,
          disabledTooltip: !canLeadsWrite ? PERMISSION_TOOLTIPS.leadBulkSelection : undefined,
        }}
        sort={{
          sortBy: list.sortBy,
          sortOrder: list.sortOrder,
          onSort: list.setSort,
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
          await list.refetch();
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
          await list.refetch();
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
        loading={busy}
      />

      <DeleteSelectedLeadsModal
        isOpen={bulkDeleteConfirmOpen}
        count={selection.selectedCount}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        loading={busy}
      />

      <BulkImportWizard
        isOpen={isBulkOpen}
        title="Bulk Upload Leads"
        onClose={() => setBulkOpen(false)}
        onImported={async () => {
          setBulkOpen(false);
          await list.refetch();
        }}
        targetFields={[...LEAD_FIELDS]}
        fieldLabels={FIELD_LABELS}
        requiredFields={["fullName"]}
        onPreview={LeadService.bulkPreview}
        onImport={async (rows, mapping) =>
          LeadService.bulkImport({ rows, mapping: mapping as Record<LeadField, string> })
        }
        importButtonLabel="Import Leads"
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
