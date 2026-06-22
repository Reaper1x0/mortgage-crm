import { useEffect, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import Select from "./Inputs/Select";
import FileUploadZone from "./Inputs/FileUploadZone";
import { showSuccessToast, showWarningToast } from "../../utils/errorHandler";
import type { BulkImportPreview, BulkImportResult } from "../../types/listQuery";

type BulkImportWizardProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onImported: () => Promise<void>;
  targetFields: string[];
  fieldLabels: Record<string, string>;
  requiredFields: string[];
  onPreview: (file: File) => Promise<BulkImportPreview>;
  onImport: (
    rows: Record<string, unknown>[],
    mapping: Record<string, string>,
  ) => Promise<BulkImportResult>;
  importButtonLabel?: string;
};

export default function BulkImportWizard({
  isOpen,
  title,
  onClose,
  onImported,
  targetFields,
  fieldLabels,
  requiredFields,
  onPreview,
  onImport,
  importButtonLabel = "Import",
}: BulkImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFile(null);
      setColumns([]);
      setRows([]);
      setPreviewRows([]);
      setMapping(Object.fromEntries(targetFields.map((field) => [field, ""])));
      setResult(null);
      setProcessing(false);
    }
  }, [isOpen, targetFields]);

  const parseFile = async () => {
    if (!file) {
      showWarningToast("Please select a CSV or XLSX file");
      return;
    }
    setProcessing(true);
    try {
      const data = await onPreview(file);
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

  const runImport = async () => {
    const missingRequired = requiredFields.filter((field) => !mapping[field]);
    if (missingRequired.length) {
      showWarningToast(`Please map: ${missingRequired.map((f) => fieldLabels[f] || f).join(", ")}`);
      return;
    }

    setProcessing(true);
    try {
      const importResult = await onImport(rows, mapping);
      setResult(importResult);
      showSuccessToast("Import completed");
      setStep(5);
      await onImported();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <p className="mt-1 text-sm text-card-text">Step {step} of 5</p>

      {step === 1 && (
        <div className="mt-4 space-y-4">
          <FileUploadZone
            label="Spreadsheet File"
            name="bulkFile"
            accept=".csv,.xlsx"
            hint="CSV or Excel (.xlsx) — columns will be mapped in the next step"
            selectedFileName={file?.name ?? null}
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
            <Button variant="primary" onClick={() => setStep(3)}>
              Next: Map Columns
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4 space-y-4">
          {targetFields.map((field) => (
            <Select
              key={field}
              label={fieldLabels[field] || field}
              name={`map-${field}`}
              value={mapping[field] || ""}
              onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
              options={[
                {
                  label: requiredFields.includes(field) ? "Select required column" : "Do not map",
                  value: "",
                },
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
            {requiredFields.map((field) => (
              <p key={field} className="mt-1 text-sm text-card-text">
                {fieldLabels[field] || field}: {mapping[field] || "Not mapped"}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button variant="primary" onClick={runImport} disabled={processing}>
              {processing ? "Importing..." : importButtonLabel}
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
