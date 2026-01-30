import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiFileText } from "react-icons/fi";
import StatusBadge from "../Reusable/StatusBadge";
import Button from "../Reusable/Button";
import Surface from "../Reusable/Surface";

type MasterField = {
  _id: string;
  key: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
};

type ValidationError = {
  rule: string;
  message: string;
  severity: "error" | "warning";
};

type FieldValidation = {
  validated: boolean;
  passed: boolean;
  errors: ValidationError[];
  validated_at?: string | null;
};

type FieldOccurrence = {
  snippet: string;
  page: number | null;
  line_hint: string | null;
  document_name?: string;
  document_id?: string;
  extracted_at?: string;
};

type SubmissionField = {
  key: string;
  value?: { raw: any; normalized?: any };
  confidence?: "high" | "medium" | "low";
  conflicts?: Array<{ raw: any }>;
  notes?: string;
  source?: {
    type: "extraction" | "manual";
    document_name?: string;
    extracted_at?: string;
  };
  is_reviewed?: boolean;
  validation?: FieldValidation;
  occurrences?: FieldOccurrence[];
};

type ExtractedFieldRowProps = {
  masterField: MasterField;
  submissionField?: SubmissionField;
  current: any;
  isManual: boolean;
  confidence?: "high" | "medium" | "low";
  conflictsCount: number;
  isMissing: boolean;
  isReview: boolean;
  hasValidationErrors: boolean;
  onValueChange: (value: any) => void;
  onSave: () => void;
  onAccept?: () => void;
  onRevert?: () => void;
  isBusy: boolean;
  showAccept: boolean;
  showRevert: boolean;
};

const ExtractedFieldRow: React.FC<ExtractedFieldRowProps> = ({
  masterField,
  submissionField,
  current,
  isManual,
  confidence,
  conflictsCount,
  isMissing,
  isReview,
  hasValidationErrors,
  onValueChange,
  onSave,
  onAccept,
  onRevert,
  isBusy,
  showAccept,
  showRevert,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullSnippet, setShowFullSnippet] = useState(false);

  const inputFor = (type: MasterField["type"], value: any, onChange: (v: any) => void) => {
    const base =
      "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-text " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow";

    if (type === "boolean") {
      return (
        <select
          className={base}
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : v === "true");
          }}
        >
          <option value="">Select</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    if (type === "date") {
      return (
        <input
          type="date"
          className={base}
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    }

    if (type === "number") {
      return (
        <input
          type="number"
          className={base}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    }

    return (
      <input
        type="text"
        className={base}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        placeholder="Enter value…"
      />
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const truncateSnippet = (text: string, maxLines: number = 2) => {
    const lines = text.split("\n");
    if (lines.length <= maxLines) return text;
    return lines.slice(0, maxLines).join("\n");
  };

  const hasEvidence = submissionField?.occurrences && submissionField.occurrences.length > 0;
  const hasTraceability = submissionField?.source?.document_name || submissionField?.source?.extracted_at;

  return (
    <Surface variant="soft" className="p-2 rounded-lg">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-3 p-3 items-start">
        {/* Left: Field Key + Description + Badges (all together) */}
        <div className="col-span-12 md:col-span-6 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="text-sm font-bold text-text break-words">{masterField.key}</div>
                {hasEvidence && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-shrink-0 p-1 text-card-text hover:text-text transition-colors"
                    aria-label={isExpanded ? "Collapse evidence" : "Expand evidence"}
                  >
                    {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {masterField.description && (
                <div className="text-xs text-card-text line-clamp-1 mb-2">{masterField.description}</div>
              )}
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {masterField.required ? (
                  <StatusBadge tone="warning">Required</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Optional</StatusBadge>
                )}

                {isMissing ? (
                  <StatusBadge tone="danger">Missing</StatusBadge>
                ) : isReview ? (
                  <StatusBadge tone="warning">Needs Review</StatusBadge>
                ) : (
                  <StatusBadge tone="success">OK</StatusBadge>
                )}

                {isManual && <StatusBadge tone="success">Manual</StatusBadge>}

                {confidence && (
                  <StatusBadge
                    tone={confidence === "high" ? "success" : confidence === "medium" ? "warning" : "danger"}
                  >
                    {confidence}
                  </StatusBadge>
                )}

                {conflictsCount > 0 && <StatusBadge tone="warning">{conflictsCount} conflict(s)</StatusBadge>}

                {submissionField?.validation?.validated && submissionField.validation.passed && (
                  <StatusBadge tone="success">Validated ✓</StatusBadge>
                )}

                {hasValidationErrors && (
                  <StatusBadge tone="danger">Validation Failed</StatusBadge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Input + Actions (together in one column, flex-row) */}
        <div className="col-span-12 md:col-span-6 flex flex-row items-center gap-2">
          <div className="flex-1">{inputFor(masterField.type, current, onValueChange)}</div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {showAccept && onAccept && (
              <Button variant="secondary" type="button" disabled={isBusy} onClick={onAccept} className="text-xs px-2 py-1">
                Accept
              </Button>
            )}
            {showRevert && onRevert && (
              <Button variant="secondary" type="button" disabled={isBusy} onClick={onRevert} className="text-xs px-2 py-1">
                Revert
              </Button>
            )}
            <Button variant="primary" type="button" disabled={isBusy} onClick={onSave} isLoading={isBusy} className="text-xs px-2 py-1">
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary Meta Row */}
      {hasTraceability && (
        <div className="px-3 pb-2 text-xs text-card-text border-t border-card-border pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {submissionField?.source?.document_name && (
              <>
                <span className="font-medium">From:</span>
                <span>{submissionField.source.document_name}</span>
              </>
            )}
            {submissionField?.source?.extracted_at && (
              <>
                {submissionField?.source?.document_name && <span>•</span>}
                <span className="font-medium">Extracted:</span>
                <span>{formatDate(submissionField.source.extracted_at)}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Details Section */}
      {isExpanded && (
        <div className="border-t border-card-border bg-card-hover">
          {/* Validation Errors */}
          {hasValidationErrors && submissionField?.validation?.errors && (
            <div className="p-3 border-b border-card-border">
              <div className="text-xs font-semibold text-danger mb-2">Validation Errors</div>
              <ul className="space-y-1.5">
                {submissionField.validation.errors.map((error: ValidationError, idx: number) => (
                  <li key={idx} className="text-xs">
                    <div className="font-medium text-text">{error.rule}</div>
                    <div className="text-card-text">{error.message}</div>
                    {error.severity === "warning" && (
                      <div className="mt-0.5 text-warning">Warning</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conflicts */}
          {conflictsCount > 0 && submissionField?.conflicts && (
            <div className="p-3 border-b border-card-border">
              <div className="text-xs font-semibold text-warning-text mb-2">Conflicting Values</div>
              <ul className="ml-4 list-disc text-xs text-text">
                {submissionField.conflicts.map((c: { raw: any }, idx: number) => (
                  <li key={idx}>{String(c.raw)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Traceability Block */}
          {hasTraceability && (
            <div className="p-3 border-b border-card-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-card-text mb-2">
                <FiFileText className="h-3 w-3" />
                Traceability
              </div>
              <div className="space-y-1 text-xs">
                {submissionField?.source?.document_name && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">Document:</span>
                    <span className="text-card-text">{submissionField.source.document_name}</span>
                  </div>
                )}
                {submissionField?.source?.extracted_at && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">Extracted:</span>
                    <span className="text-card-text">{formatDate(submissionField.source.extracted_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evidence Snippets */}
          {hasEvidence && submissionField?.occurrences && (
            <div className="p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-card-text mb-2">
                <FiFileText className="h-3 w-3" />
                Source Evidence
              </div>
              <div className="space-y-2">
                {submissionField.occurrences.slice(0, 2).map((occ: FieldOccurrence, idx: number) => {
                  const snippetText = showFullSnippet ? occ.snippet : truncateSnippet(occ.snippet, 2);
                  const isTruncated = occ.snippet.split("\n").length > 2;

                  return (
                    <div key={idx} className="rounded border border-card-border bg-background p-2">
                      <div className="text-xs italic text-text mb-1.5 whitespace-pre-line">
                        "{snippetText}"
                      </div>
                      {isTruncated && !showFullSnippet && (
                        <button
                          type="button"
                          onClick={() => setShowFullSnippet(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Show more
                        </button>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-card-text mt-1.5">
                        {occ.page != null && (
                          <span>
                            <span className="font-medium">Page:</span> {occ.page}
                          </span>
                        )}
                        {occ.line_hint && (
                          <span>
                            <span className="font-medium">Line:</span> {occ.line_hint}
                          </span>
                        )}
                        {occ.document_name && (
                          <span className="truncate max-w-[200px]">
                            <span className="font-medium">From:</span> {occ.document_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {submissionField.occurrences.length > 2 && (
                  <div className="text-xs text-card-text">
                    +{submissionField.occurrences.length - 2} more occurrence(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
};

export default ExtractedFieldRow;

