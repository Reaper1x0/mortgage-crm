import React, { useCallback, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiXCircle,
} from "react-icons/fi";
import { CgClose } from "react-icons/cg";
import Modal from "../Reusable/Modal";
import { MasterField, MasterFieldService } from "../../service/masterFieldService";
import Button from "../Reusable/Button";
import DataTable from "../Reusable/DataTable";
import Checkbox from "../Reusable/Checkbox";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import ListFilterPanel, { type FilterFieldConfig } from "../Reusable/ListFilterPanel";
import BulkActionBar from "../Reusable/BulkActionBar";
import BulkImportWizard from "../Reusable/BulkImportWizard";
import { AppDispatch } from "../../redux/store";
import { addToast } from "../../redux/slices/toasterSlice";
import IconButton from "../Reusable/IconButton";
import StatusBadge from "../Reusable/StatusBadge";
import PageHeader from "../Reusable/PageHeader";
import { usePermissions } from "../../context/PermissionContext";
import { PERMISSION_TOOLTIPS } from "../../utils/permissionUi";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { useRowSelection } from "../../hooks/useRowSelection";
import { prettyDate } from "../../utils/date";

const MASTER_FIELD_IMPORT_FIELDS = ["key", "label", "type", "required", "description", "validation_rules"] as const;

const IMPORT_FIELD_LABELS: Record<(typeof MASTER_FIELD_IMPORT_FIELDS)[number], string> = {
  key: "Key (Required)",
  label: "Label",
  type: "Type (Required)",
  required: "Required (true/false)",
  description: "Description",
  validation_rules: "Validation Rules (pipe-separated)",
};

const FILTER_FIELDS: FilterFieldConfig[] = [
  { type: "search", key: "search", label: "Search", placeholder: "Key, label, description..." },
  {
    type: "select",
    key: "type",
    label: "Type",
    options: [
      { label: "All types", value: "" },
      { label: "String", value: "string" },
      { label: "Number", value: "number" },
      { label: "Date", value: "date" },
      { label: "Boolean", value: "boolean" },
      { label: "Array", value: "array" },
      { label: "Object", value: "object" },
    ],
  },
  {
    type: "select",
    key: "required",
    label: "Required",
    options: [
      { label: "All", value: "" },
      { label: "Required", value: "true" },
      { label: "Optional", value: "false" },
    ],
  },
  { type: "date", key: "createdFrom", label: "Created From" },
  { type: "date", key: "createdTo", label: "Created To" },
];

const MASTER_FIELD_INITIAL_FILTERS = {
  search: "",
  type: "",
  required: "",
  createdFrom: "",
  createdTo: "",
};

const masterFieldRowKey = (row: MasterField) => row.key;

const emptyField: MasterField = {
  key: "",
  label: "",
  type: "string",
  required: false,
  description: "",
  validation_rules: [],
};

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

const MasterFieldTable: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { canWorkspace } = usePermissions();
  const canMasterFieldsWrite = canWorkspace("workspace.masterfields.write");

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isBulkOpen, setBulkOpen] = useState(false);
  const [deletedModalOpen, setDeletedModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<MasterField | null>(null);
  const [downloadingSample, setDownloadingSample] = useState(false);

  const [selectedField, setSelectedField] = useState<MasterField | null>(null);
  const [ruleDraft, setRuleDraft] = useState("");

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      dispatch(addToast({ message, type, duration: 3000, position: "top-right" }));
    },
    [dispatch],
  );

  const list = usePaginatedList<MasterField>({
    fetchFn: MasterFieldService.getAllFields,
    initialFilters: MASTER_FIELD_INITIAL_FILTERS,
  });

  const selection = useRowSelection<MasterField>({
    rowKey: masterFieldRowKey,
    rows: list.data,
  });

  const filterValues = useMemo(
    () => ({
      search: String(list.filters.search ?? ""),
      type: String(list.filters.type ?? ""),
      required: String(list.filters.required ?? ""),
      createdFrom: String(list.filters.createdFrom ?? ""),
      createdTo: String(list.filters.createdTo ?? ""),
    }),
    [list.filters],
  );

  const closeAddEdit = useCallback(() => {
    setAddModalOpen(false);
    setEditModalOpen(false);
    setSelectedField(null);
    setRuleDraft("");
  }, []);

  const openAdd = useCallback(() => {
    setSelectedField({ ...emptyField });
    setRuleDraft("");
    setAddModalOpen(true);
  }, []);

  const openEdit = useCallback((row: MasterField) => {
    setSelectedField({
      ...row,
      validation_rules: Array.isArray(row.validation_rules) ? row.validation_rules : [],
    });
    setRuleDraft("");
    setEditModalOpen(true);
  }, []);

  const handleAddField = useCallback(
    async (newField: MasterField) => {
      try {
        await MasterFieldService.createField(newField);
        toast("Field created successfully.", "success");
        closeAddEdit();
        await list.refetch();
      } catch (error) {
        console.error("Error adding field:", error);
      }
    },
    [closeAddEdit, list, toast],
  );

  const handleEditField = useCallback(
    async (updatedField: MasterField) => {
      try {
        await MasterFieldService.updateField(updatedField.key, updatedField);
        toast("Field updated successfully.", "success");
        closeAddEdit();
        await list.refetch();
      } catch (error) {
        console.error("Error editing field:", error);
      }
    },
    [closeAddEdit, list, toast],
  );

  const handleDeleteField = useCallback(async () => {
    if (!fieldToDelete) return;
    try {
      await MasterFieldService.deleteField(fieldToDelete.key);
      toast("Field deleted.", "success");
      setDeleteConfirmOpen(false);
      setFieldToDelete(null);
      selection.setSelectedKeys((prev) => prev.filter((k) => k !== fieldToDelete.key));
      await list.refetch();
    } catch (error) {
      console.error("Error deleting field:", error);
    }
  }, [fieldToDelete, list, selection, toast]);

  const handleDeleteMultipleFields = useCallback(async () => {
    try {
      await MasterFieldService.deleteMultipleFields(selection.selectedKeys);
      toast("Selected fields deleted.", "success");
      selection.clear();
      setDeletedModalOpen(false);
      await list.refetch();
    } catch (error) {
      console.error("Error deleting multiple fields:", error);
    }
  }, [list, selection, toast]);

  const onCopyFieldJson = useCallback(
    async (row: MasterField) => {
      const ok = await copyToClipboard(JSON.stringify(row, null, 2));
      toast(ok ? "Field JSON copied to clipboard!" : "Copy failed. Please try again.", ok ? "success" : "error");
    },
    [toast],
  );

  const handleDownloadSample = useCallback(async () => {
    setDownloadingSample(true);
    try {
      const blob = await MasterFieldService.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "master-fields-import-template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingSample(false);
    }
  }, []);

  const addRule = useCallback(() => {
    const r = ruleDraft.trim();
    if (!r || !selectedField) return;
    const exists = (selectedField.validation_rules || []).some(
      (x) => x.trim().toLowerCase() === r.toLowerCase(),
    );
    if (exists) {
      toast("This rule already exists.", "info");
      return;
    }
    setSelectedField({
      ...selectedField,
      validation_rules: [...(selectedField.validation_rules || []), r],
    });
    setRuleDraft("");
  }, [ruleDraft, selectedField, toast]);

  const removeRule = useCallback(
    (idx: number) => {
      if (!selectedField) return;
      const next = [...(selectedField.validation_rules || [])];
      next.splice(idx, 1);
      setSelectedField({ ...selectedField, validation_rules: next });
    },
    [selectedField],
  );

  const clearRules = useCallback(() => {
    if (!selectedField) return;
    setSelectedField({ ...selectedField, validation_rules: [] });
    setRuleDraft("");
  }, [selectedField]);

  const columns = useMemo(
    () => [
      {
        title: "Key",
        dataIndex: "key",
        key: "key",
        sortable: true,
        render: (value: string) => <span className="block max-w-xs truncate">{value}</span>,
      },
      {
        title: "Label",
        dataIndex: "label",
        key: "label",
        sortable: true,
        render: (value: string, row: MasterField) => (
          <span className="block max-w-xs truncate">{value || row.key}</span>
        ),
      },
      { title: "Type", dataIndex: "type", key: "type", sortable: true },
      {
        title: "Required",
        dataIndex: "required",
        key: "required",
        sortable: true,
        render: (_: unknown, row: MasterField) => {
          const isReq = !!row.required;
          return (
            <StatusBadge tone={isReq ? "danger" : "success"}>
              {isReq ? <FiXCircle className="h-3.5 w-3.5" /> : <FiCheckCircle className="h-3.5 w-3.5" />}
              {isReq ? "Required" : "Optional"}
            </StatusBadge>
          );
        },
      },
      {
        title: "Validation Rules",
        dataIndex: "validation_rules",
        key: "validation_rules",
        render: (value: string[]) => (
          <span className="block max-w-xs truncate text-center">{value?.length ?? 0}</span>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        sortable: true,
        render: (value: string) => (value ? prettyDate(value) : "-"),
      },
      {
        title: "Actions",
        dataIndex: "actions",
        render: (_: unknown, row: MasterField) => (
          <div className="flex items-center gap-2">
            <IconButton
              icon={FiCopy as never}
              size="sm"
              outline
              fillBg
              hoverable
              title="Copy JSON"
              onClick={() => onCopyFieldJson(row)}
            />
            <IconButton
              icon={FiEdit2 as never}
              size="sm"
              outline
              fillBg
              hoverable
              title="Edit field"
              onClick={() => openEdit(row)}
              disabled={!canMasterFieldsWrite}
              disabledTooltip={!canMasterFieldsWrite ? PERMISSION_TOOLTIPS.editMasterField : undefined}
            />
            <IconButton
              icon={FiTrash2 as never}
              size="sm"
              outline
              fillBg
              hoverable
              title="Delete field"
              onClick={() => {
                setFieldToDelete(row);
                setDeleteConfirmOpen(true);
              }}
              disabled={!canMasterFieldsWrite}
              disabledTooltip={!canMasterFieldsWrite ? PERMISSION_TOOLTIPS.deleteMasterField : undefined}
            />
          </div>
        ),
      },
    ],
    [canMasterFieldsWrite, onCopyFieldJson, openEdit],
  );

  return (
    <div className="mx-auto space-y-6 p-2 md:p-6">
      <PageHeader
        title="Manage Master Fields"
        description="Define your master schema keys and validation rules for mapping and form population."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleDownloadSample}
              disabled={downloadingSample}
            >
              <span className="inline-flex items-center gap-2">
                <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
                Sample Template
              </span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => setBulkOpen(true)}
              disabled={!canMasterFieldsWrite}
              disabledTooltip={!canMasterFieldsWrite ? PERMISSION_TOOLTIPS.bulkMasterFields : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <FiUpload className="h-4 w-4 shrink-0" aria-hidden />
                Bulk Upload
              </span>
            </Button>
            <Button
              variant="primary"
              onClick={openAdd}
              disabled={!canMasterFieldsWrite}
              disabledTooltip={!canMasterFieldsWrite ? PERMISSION_TOOLTIPS.addMasterField : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                Add New Field
              </span>
            </Button>
          </>
        }
      />

      <ListFilterPanel
        fields={FILTER_FIELDS}
        values={filterValues}
        onChange={(key, value) => list.setFilter(key as keyof typeof filterValues, value)}
        onClear={list.clearFilters}
      />

      <BulkActionBar selectedCount={selection.selectedCount} itemLabel="field">
        <Button
          variant="danger"
          onClick={() => setDeletedModalOpen(true)}
          disabled={!canMasterFieldsWrite}
          disabledTooltip={!canMasterFieldsWrite ? PERMISSION_TOOLTIPS.deleteMasterFieldsBulk : undefined}
        >
          Delete Selected
        </Button>
      </BulkActionBar>

      <DataTable
        columns={columns}
        data={list.data}
        loading={list.loading}
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        rowKey={(row) => row.key}
        rowSelection={{
          selectedKeys: selection.selectedKeys,
          onToggle: selection.toggle,
          onToggleAllVisible: selection.toggleAllVisible,
          allVisibleSelected: selection.allVisibleSelected,
          someVisibleSelected: selection.someVisibleSelected,
          disabled: !canMasterFieldsWrite,
          disabledTooltip: !canMasterFieldsWrite ? PERMISSION_TOOLTIPS.masterFieldBulkSelection : undefined,
        }}
        sort={{
          sortBy: list.sortBy,
          sortOrder: list.sortOrder,
          onSort: list.setSort,
        }}
      />

      <BulkImportWizard
        isOpen={isBulkOpen}
        title="Bulk Upload Master Fields"
        onClose={() => setBulkOpen(false)}
        onImported={async () => {
          await list.refetch();
        }}
        targetFields={[...MASTER_FIELD_IMPORT_FIELDS]}
        fieldLabels={IMPORT_FIELD_LABELS}
        requiredFields={["key", "type"]}
        onPreview={MasterFieldService.bulkPreview}
        onImport={async (rows, mapping) =>
          MasterFieldService.bulkImport({ rows, mapping })
        }
        importButtonLabel="Import Fields"
      />

      <Modal isOpen={isAddModalOpen || isEditModalOpen} onClose={closeAddEdit}>
        <PageHeader
          variant="section"
          title={`${isEditModalOpen ? "Edit" : "Add"} field`}
          description="Configure the schema key, type, and validation rules."
        />

        <div className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedField) return;
              const payload: MasterField = {
                ...selectedField,
                key: selectedField.key.trim(),
                label: selectedField.label.trim(),
                description: selectedField.description.trim(),
                validation_rules: (selectedField.validation_rules || [])
                  .map((x) => x.trim())
                  .filter(Boolean),
              };
              if (isEditModalOpen) void handleEditField(payload);
              else void handleAddField(payload);
            }}
          >
            <div className="space-y-5">
              <Input
                label="Key"
                name="key"
                value={selectedField?.key || ""}
                onChange={(e) =>
                  setSelectedField({ ...(selectedField || emptyField), key: e.target.value })
                }
                required
                disabled={isEditModalOpen}
              />
              <Input
                label="Label"
                name="label"
                value={selectedField?.label || ""}
                onChange={(e) =>
                  setSelectedField({ ...(selectedField || emptyField), label: e.target.value })
                }
                required
              />
              <Select
                label="Type"
                name="type"
                value={selectedField?.type || "string"}
                onChange={(e) =>
                  setSelectedField({
                    ...(selectedField || emptyField),
                    type: e.target.value as MasterField["type"],
                  })
                }
                options={[
                  { label: "String", value: "string" },
                  { label: "Number", value: "number" },
                  { label: "Date", value: "date" },
                  { label: "Boolean", value: "boolean" },
                  { label: "Array", value: "array" },
                  { label: "Object", value: "object" },
                ]}
                required
              />
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={!!selectedField?.required}
                  onChange={(e) =>
                    setSelectedField({
                      ...(selectedField || emptyField),
                      required: !!e.target.checked,
                    })
                  }
                />
                <span className="text-sm text-text">Required</span>
              </div>
              <Input
                label="Description"
                name="description"
                value={selectedField?.description || ""}
                onChange={(e) =>
                  setSelectedField({
                    ...(selectedField || emptyField),
                    description: e.target.value,
                  })
                }
                required
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-text">Validation Rules</label>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={clearRules}
                    disabled={!selectedField?.validation_rules?.length}
                  >
                    Clear
                  </Button>
                </div>
                {(selectedField?.validation_rules || []).length ? (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-card-border bg-background p-3">
                    {(selectedField?.validation_rules || []).map((r, idx) => (
                      <span
                        key={`${selectedField?.key || "new"}-rule-${idx}`}
                        className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card px-3 py-1 text-xs text-text"
                      >
                        <span className="max-w-[260px] truncate">{r}</span>
                        <IconButton
                          type="button"
                          icon={CgClose as never}
                          hoverable
                          size="sm"
                          outline
                          fillBg={false}
                          onClick={() => removeRule(idx)}
                          aria-label="Remove rule"
                          title="Remove"
                        />
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-card-border bg-background p-3 text-sm text-card-text">
                    No validation rules added yet.
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Input
                      label=""
                      name="ruleDraft"
                      value={ruleDraft}
                      placeholder="Add a validation rule..."
                      onChange={(e) => setRuleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRule();
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={addRule}
                    disabled={!ruleDraft.trim()}
                    className="sm:w-40"
                  >
                    Add Rule
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={closeAddEdit}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={list.loading}>
                  {isEditModalOpen ? "Save Changes" : "Add Field"}
                </Button>
                {selectedField && isEditModalOpen ? (
                  <Button
                    variant="secondary"
                    type="button"
                    className="ml-auto"
                    onClick={() => onCopyFieldJson(selectedField)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FiCopy className="h-4 w-4" />
                      Copy JSON
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={deleteConfirmOpen && !!fieldToDelete} onClose={() => setDeleteConfirmOpen(false)}>
        <h2 className="text-xl font-semibold text-text">Confirm Delete</h2>
        <p className="mt-3 text-sm text-card-text">
          Are you sure you want to delete field{" "}
          <span className="font-semibold text-text">{fieldToDelete?.key}</span>?
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteField} disabled={list.loading}>
            Delete Field
          </Button>
        </div>
      </Modal>

      <Modal isOpen={deletedModalOpen} onClose={() => setDeletedModalOpen(false)}>
        <PageHeader
          variant="section"
          title="Confirm delete"
          description={
            <>
              Are you sure you want to delete the{" "}
              <span className="font-semibold text-text">{selection.selectedCount}</span> selected
              fields?
            </>
          }
        />
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setDeletedModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteMultipleFields} disabled={list.loading}>
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MasterFieldTable;
