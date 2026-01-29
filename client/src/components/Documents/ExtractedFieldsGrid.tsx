import React from "react";
import type { FieldItem } from "../../types/extraction.types";

type Props = {
  fields: FieldItem[];
  emptyText?: string;
};

const requiresReview = (field: FieldItem): boolean => {
  if (!field.value) return true;
  if (field.confidence === "low") return true;
  if (field.conflicts?.length > 0) return true;
  // Also require review if validation failed
  if (field.validation?.validated && !field.validation.passed) return true;
  return false;
};

const ExtractedFieldsGrid: React.FC<Props> = ({ fields, emptyText = "No fields for this document." }) => {
  if (!fields?.length) {
    return <p className="text-sm text-text">{emptyText}</p>;
  }

  return (
    <div className="grid gap-4">
      {fields.map((field) => {
        const needReview = requiresReview(field);
        const hasValidationErrors = field.validation?.validated && field.validation.errors?.length > 0;

        const valueRaw =
          field.value?.raw !== undefined && field.value?.raw !== null
            ? String(field.value.raw)
            : "—";

        const valueNorm =
          field.value?.normalized !== undefined && field.value?.normalized !== null
            ? String(field.value.normalized)
            : "—";

        return (
          <div
            key={field.key}
            className={`rounded-lg border bg-card p-4 ${
              needReview || hasValidationErrors
                ? "border-warning-border"
                : "border-card-border"
            }`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text break-words">
                  {field.key}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    label={`Confidence: ${field.confidence}`}
                    type={
                      field.confidence === "high"
                        ? "success"
                        : field.confidence === "medium"
                        ? "warning"
                        : "danger"
                    }
                  />
                  {needReview && <Badge label="Review" type="warning" />}
                  {field.validation?.validated && (
                    <Badge
                      label={field.validation.passed ? "Validated ✓" : "Validation Failed"}
                      type={field.validation.passed ? "success" : "danger"}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {hasValidationErrors && (
              <div className="mb-3 rounded-md border border-danger-border bg-danger/10 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                  Validation Errors
                </div>
                <ul className="space-y-1.5">
                  {field?.validation?.errors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-danger">•</span>
                      <div className="flex-1">
                        <div className="font-medium text-text">
                          {error.rule}
                        </div>
                        <div className="text-xs text-card-text">{error.message}</div>
                        {error.severity === "warning" && (
                          <div className="mt-0.5 text-xs text-warning">Warning</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Values */}
            <div className="mt-2 flex flex-wrap gap-4">
              <div className="mt-2 min-w-[180px] flex-1">
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-card-text">
                  Raw value
                </div>
                <div className="text-sm text-text break-words">{valueRaw}</div>
              </div>

              <div className="mt-2 min-w-[180px] flex-1">
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-card-text">
                  Normalized
                </div>
                <div className="text-sm text-text break-words">{valueNorm}</div>
              </div>
            </div>

            {/* Traceability */}
            {field.traceability && (
              <div className="mt-3 rounded-md border border-card-border bg-card-hover p-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-card-text">
                  Source Traceability
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">Document:</span>
                    <span className="text-card-text">{field.traceability.document_name || "Unknown"}</span>
                  </div>
                  {field.traceability.extracted_at && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">Extracted:</span>
                      <span className="text-card-text">
                        {new Date(field.traceability.extracted_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">Method:</span>
                    <span className="text-card-text capitalize">{field.traceability.extraction_method || "openai"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Conflicts */}
            {field.conflicts?.length > 0 && (
              <div className="mt-3">
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-card-text">
                  Conflicting values
                </div>
                <ul className="ml-4 list-disc text-xs text-text">
                  {field.conflicts.map((c, idx) => (
                    <li key={idx}>{String(c.raw)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Occurrences with Enhanced Traceability */}
            {field.occurrences?.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-card-text">
                  Source Evidence
                </div>
                <div className="space-y-2">
                  {field.occurrences.map((occ, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-card-border bg-card-hover p-2.5"
                    >
                      <div className="mb-1.5 text-xs italic text-text">
                        "{occ.snippet}"
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-card-text">
                        {occ.page != null && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Page:</span>
                            <span>{occ.page}</span>
                          </span>
                        )}
                        {occ.line_hint && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Line:</span>
                            <span>{occ.line_hint}</span>
                          </span>
                        )}
                        {occ.document_name && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">From:</span>
                            <span className="truncate max-w-[200px]">{occ.document_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {field.notes && field.notes.trim() && (
              <div className="mt-3">
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-card-text">
                  Notes
                </div>
                <div className="mt-1 rounded-md bg-card-hover px-2 py-2 text-xs text-card-text">
                  {field.notes}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Badge: React.FC<{
  label: string;
  type?: "success" | "warning" | "danger";
}> = ({ label, type = "success" }) => {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border";
  const stylesByType = {
    success: "bg-success text-success-text border-success-border",
    warning: "bg-warning text-warning-text border-warning-border",
    danger: "bg-danger text-danger-text border-danger-border",
  };
  return <span className={`${base} ${stylesByType[type]}`}>{label}</span>;
};

export default ExtractedFieldsGrid;
