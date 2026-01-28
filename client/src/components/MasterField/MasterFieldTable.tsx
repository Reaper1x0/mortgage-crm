// src/components/MasterFields/MasterFieldTable.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import Modal from "../Reusable/Modal";
import { MasterFieldService } from "../../service/masterFieldService";
import Button from "../Reusable/Button";
import DataTable from "../Reusable/DataTable";
import Checkbox from "../Reusable/Checkbox";
import Input from "../Reusable/Inputs/Input";
import Select from "../Reusable/Inputs/Select";
import { AppDispatch } from "../../redux/store";
import { addToast } from "../../redux/slices/toasterSlice";
import {
  FiCheckCircle,
  FiXCircle,
  FiCopy,
  FiEdit,
  FiTrash,
} from "react-icons/fi";
import IconButton from "../Reusable/IconButton";
import { CgClose } from "react-icons/cg";
import PageHeader from "../Reusable/PageHeader";

interface MasterField {
  key: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
  validation_rules: string[];
}

const emptyField: MasterField = {
  key: "",
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

  const [fields, setFields] = useState<MasterField[]>([]);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [deletedModalOpen, setDeletedModalOpen] = useState(false);

  const [selectedField, setSelectedField] = useState<MasterField | null>(null);
  const [selectedFieldsForDeletion, setSelectedFieldsForDeletion] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [ruleDraft, setRuleDraft] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      dispatch(
        addToast({
          message,
          type,
          duration: 3000,
          position: "top-right",
        }),
      );
    },
    [dispatch],
  );

  const fetchFields = useCallback(
    async (p: number, ps: number) => {
      setLoading(true);
      try {
        const response = await MasterFieldService.getAllFields({
          page: p,
          limit: ps,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        const list: MasterField[] = response?.fields || [];
        const meta = response?.pagination;

        setFields(list);
        setTotal(typeof meta?.total === "number" ? meta.total : list.length);

        if (typeof meta?.totalPages === "number" && p > meta.totalPages) {
          setPage(Math.max(1, meta.totalPages));
          return;
        }

        if (typeof meta?.page === "number") setPage(meta.page);
        if (typeof meta?.limit === "number") setPageSize(meta.limit);
      } catch (error) {
        console.error("Error fetching fields:", error);
        setFields([]);
        setTotal(0);
        // Error toast is handled automatically by centralized error handler
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchFields(page, pageSize);
  }, [page, pageSize, fetchFields]);

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
      validation_rules: Array.isArray(row.validation_rules)
        ? row.validation_rules
        : [],
    });
    setRuleDraft("");
    setEditModalOpen(true);
  }, []);

  const handleAddField = useCallback(
    async (newField: MasterField) => {
      setLoading(true);
      try {
        await MasterFieldService.createField(newField);
        toast("Field created successfully.", "success");
        closeAddEdit();
        await fetchFields(page, pageSize);
      } catch (error) {
        console.error("Error adding field:", error);
        // Error toast is handled automatically by centralized error handler
      } finally {
        setLoading(false);
      }
    },
    [closeAddEdit, fetchFields, page, pageSize, toast],
  );

  const handleEditField = useCallback(
    async (updatedField: MasterField) => {
      setLoading(true);
      try {
        await MasterFieldService.updateField(updatedField.key, updatedField);
        toast("Field updated successfully.", "success");
        closeAddEdit();
        await fetchFields(page, pageSize);
      } catch (error) {
        console.error("Error editing field:", error);
        // Error toast is handled automatically by centralized error handler
      } finally {
        setLoading(false);
      }
    },
    [closeAddEdit, fetchFields, page, pageSize, toast],
  );

  const handleDeleteField = useCallback(
    async (key: string) => {
      setLoading(true);
      try {
        await MasterFieldService.deleteField(key);
        toast("Field deleted.", "success");
        setSelectedFieldsForDeletion((prev) => prev.filter((k) => k !== key));
        await fetchFields(page, pageSize);
      } catch (error) {
        console.error("Error deleting field:", error);
        // Error toast is handled automatically by centralized error handler
      } finally {
        setLoading(false);
      }
    },
    [fetchFields, page, pageSize, toast],
  );

  const handleDeleteMultipleFields = useCallback(async () => {
    setLoading(true);
    try {
      await MasterFieldService.deleteMultipleFields(selectedFieldsForDeletion);
      toast("Selected fields deleted.", "success");
      setSelectedFieldsForDeletion([]);
      setDeletedModalOpen(false);
      await fetchFields(page, pageSize);
    } catch (error) {
      console.error("Error deleting multiple fields:", error);
      // Error toast is handled automatically by centralized error handler
    } finally {
      setLoading(false);
    }
  }, [fetchFields, page, pageSize, selectedFieldsForDeletion, toast]);

  const onCopyFieldJson = useCallback(
    async (row: MasterField) => {
      const json = JSON.stringify(row, null, 2);
      const ok = await copyToClipboard(json);
      if (!ok) {
        toast("Copy failed. Please try again.", "error");
        return;
      }
      toast("Field JSON copied to clipboard!", "success");
    },
    [toast],
  );

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
        title: "Select",
        dataIndex: "select",
        render: (_: any, row: MasterField) => (
          <Checkbox
            checked={selectedFieldsForDeletion.includes(row.key)}
            onChange={(e: any) => {
              if (e.target.checked) {
                setSelectedFieldsForDeletion((prev) => [...prev, row.key]);
              } else {
                setSelectedFieldsForDeletion((prev) =>
                  prev.filter((k) => k !== row.key),
                );
              }
            }}
          />
        ),
      },
      {
        title: "Key",
        dataIndex: "key",
        key: "key",
        render: (value: any) => (
          <span className="truncate block max-w-xs">{value}</span>
        ),
      },
      { title: "Type", dataIndex: "type" },
      {
        title: "Required",
        dataIndex: "required",
        render: (_: any, row: MasterField) => {
          const isReq = !!row.required;
          return (
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                "border",
                isReq
                  ? "bg-danger border-danger-border text-danger-text"
                  : "bg-success border-success-border text-success-text",
              ].join(" ")}
            >
              {isReq ? (
                <FiXCircle className="h-3.5 w-3.5" />
              ) : (
                <FiCheckCircle className="h-3.5 w-3.5" />
              )}
              {isReq ? "Required" : "Optional"}
            </span>
          );
        },
      },
      {
        title: "Validation Rules",
        dataIndex: "validation_rules",
        key: "validation_rules",
        render: (value: String[]) => (
          <span className="truncate block max-w-xs text-center">
            {value.length}
          </span>
        ),
      },
      {
        title: "Actions",
        dataIndex: "actions",
        render: (_: any, row: MasterField) => (
          <div className="flex items-center gap-2">
            <IconButton
              icon={FiCopy as any}
              size="sm"
              outline
              fillBg
              hoverable
              title="Copy JSON"
              onClick={() => onCopyFieldJson(row)}
            />
            <IconButton
              icon={FiEdit as any}
              size="sm"
              outline
              fillBg
              hoverable
              title="Edit"
              onClick={() => openEdit(row)}
            />
            <IconButton
              icon={FiTrash as any}
              size="sm"
              outline
              fillBg
              hoverable
              title="Delete"
              onClick={() => handleDeleteField(row.key)}
            />
          </div>
        ),
      },
    ],
    [handleDeleteField, onCopyFieldJson, openEdit, selectedFieldsForDeletion],
  );

  return (
    <div className="mx-auto space-y-6 p-2 md:p-6">
      <PageHeader
        title="Manage Master Fields"
        description="Define your master schema keys and validation rules for mapping and form population."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={openAdd}>
              Add New Field
            </Button>
            {selectedFieldsForDeletion.length > 0 && (
              <Button
                variant="danger"
                onClick={() => setDeletedModalOpen(true)}
              >
                Delete Selected
              </Button>
            )}
          </div>
        }
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={fields}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p: number) => setPage(p)}
        onPageSizeChange={(ps: number) => {
          setPageSize(ps);
          setPage(1);
        }}
      />

      {/* Add/Edit Modal */}
      <Modal isOpen={isAddModalOpen || isEditModalOpen} onClose={closeAddEdit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-text">
              {isEditModalOpen ? "Edit" : "Add"} Field
            </h2>
            <p className="mt-1 text-sm text-card-text">
              Configure the schema key, type, and validation rules.
            </p>
          </div>

          {selectedField && (
            <IconButton
              icon={FiCopy as any}
              size="md"
              outline
              fillBg
              hoverable
              title="Copy field JSON"
              onClick={() => onCopyFieldJson(selectedField)}
              disabled={!selectedField.key && !isAddModalOpen}
            />
          )}
        </div>

        <div className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedField) return;

              const payload: MasterField = {
                ...selectedField,
                key: selectedField.key.trim(),
                description: selectedField.description.trim(),
                validation_rules: (selectedField.validation_rules || [])
                  .map((x) => x.trim())
                  .filter(Boolean),
              };

              if (isEditModalOpen) handleEditField(payload);
              else handleAddField(payload);
            }}
          >
            <div className="space-y-5">
              <Input
                label="Key"
                name="key"
                value={selectedField?.key || ""}
                onChange={(e: any) =>
                  setSelectedField({
                    ...(selectedField || emptyField),
                    key: e.target.value,
                  })
                }
                required
                disabled={isEditModalOpen}
              />

              <Select
                label="Type"
                name="type"
                value={selectedField?.type || "string"}
                onChange={(e: any) =>
                  setSelectedField({
                    ...(selectedField || emptyField),
                    type: e.target.value,
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
                  onChange={(e: any) =>
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
                onChange={(e: any) =>
                  setSelectedField({
                    ...(selectedField || emptyField),
                    description: e.target.value,
                  })
                }
                required
              />

              {/* Validation Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-text">
                    Validation Rules
                  </label>
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
                        title={r}
                      >
                        <span className="max-w-[260px] truncate">{r}</span>
                        <IconButton
                          type="button"
                          icon={CgClose as any}
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
                      onChange={(e: any) => setRuleDraft(e.target.value)}
                      onKeyDown={(e: any) => {
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

                <p className="text-xs text-card-text">
                  Tip: Press <span className="font-mono">Enter</span> to add a
                  rule quickly.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={closeAddEdit}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {isEditModalOpen ? "Save Changes" : "Add Field"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={deletedModalOpen}
        onClose={() => setDeletedModalOpen(false)}
      >
        <h2 className="text-2xl font-extrabold text-text">Confirm Delete</h2>
        <p className="mt-3 text-sm text-card-text">
          Are you sure you want to delete the{" "}
          <span className="font-semibold text-text">
            {selectedFieldsForDeletion.length}
          </span>{" "}
          selected fields?
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setDeletedModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteMultipleFields}
            disabled={loading}
          >
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MasterFieldTable;
