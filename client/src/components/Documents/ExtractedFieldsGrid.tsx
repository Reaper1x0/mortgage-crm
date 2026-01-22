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
            className={`rounded-lg border bg-card p-3 ${
              needReview ? "border-warning-border" : "border-card-border"
            }`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text break-words">
                  {field.key}
                </div>

                <div className="mt-1 flex flex-wrap gap-1.5">
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
                </div>
              </div>
            </div>

            {/* Values */}
            <div className="mt-1.5 flex flex-wrap gap-4">
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

            {/* Conflicts */}
            {field.conflicts?.length > 0 && (
              <div className="mt-2">
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

            {/* Occurrences */}
            {field.occurrences?.length > 0 && (
              <div className="mt-2">
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-card-text">
                  Occurrences
                </div>
                <ul className="ml-4 list-disc text-xs text-text">
                  {field.occurrences.map((occ, idx) => (
                    <li key={idx}>
                      <div className="text-xs italic text-text">“{occ.snippet}”</div>
                      <div className="text-[11px] text-card-text">
                        {occ.page != null && <span>Page {occ.page}</span>}
                        {occ.line_hint && (
                          <span>{occ.page != null ? " · " : ""}Line: {occ.line_hint}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {field.notes && field.notes.trim() && (
              <div className="mt-2">
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
