import { useMemo, useState, useEffect } from "react";
import { SubmissionFieldStatusService } from "../../service/submissionFieldsStatusService";

import Surface from "../Reusable/Surface";
import StatusBadge from "../Reusable/StatusBadge";
import Callout from "../Reusable/Callout";
import ExtractedFieldRow from "./ExtractedFieldRow";

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
  // Validation results
  validation?: FieldValidation;
  // Source occurrences with traceability
  occurrences?: FieldOccurrence[];
};

type Eligibility = {
  eligible: boolean;
  required_total: number;
  filled_required: number;
  missing_required_keys: string[];
  needs_review_keys: string[];
  optional_total?: number;
  filled_optional?: number;
  missing_optional_keys?: string[];
  needs_review_optional_keys?: string[];
};

type FilterKey =
  | "focus"
  | "all"
  | "req_missing"
  | "req_review"
  | "opt_missing"
  | "opt_review"
  | "done"
  | "extracted";

// These functions are no longer needed - server handles normalization

export default function MasterFieldsPanel({
  submissionId,
  masterFields,
  submissionFields: _submissionFields, // Kept for API compatibility, but data fetched from server
  eligibility,
  onUpdated,
}: {
  submissionId: string;
  masterFields: MasterField[];
  submissionFields: SubmissionField[];
  eligibility: Eligibility;
  onUpdated: (next: {
    submission_fields: SubmissionField[];
    eligibility: Eligibility;
  }) => void;
}) {
  // Default filter: show extracted fields first
  const [filter, setFilter] = useState<FilterKey>("extracted");
  const [q, setQ] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [filteredRows, setFilteredRows] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    reqMissing: 0,
    reqReview: 0,
    optMissing: 0,
    optReview: 0,
    focus: 0,
    extracted: 0,
  });
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [auditTrail, setAuditTrail] = useState<Record<string, any[]>>({});

  // byKey no longer needed - server provides filtered rows with all needed data

  const opt = useMemo(() => masterFields.filter((m) => !m.required), [masterFields]);

  // Fetch filtered data from server when filter or search changes
  useEffect(() => {
    const fetchFilteredData = async () => {
      try {
        setLoadingFilter(true);
        const resp = await SubmissionFieldStatusService.getSubmissionFieldStatus(submissionId, {
          filter,
          search: q,
          recompute: false,
        });
        
        if (resp?.filtered_rows) {
          // Merge draft values into filtered rows
          const rowsWithDraft = resp.filtered_rows.map((row: any) => {
            const key = row.masterField.key;
            const current = draft[key] !== undefined ? draft[key] : row.current;
            return {
              ...row,
              current,
            };
          });
          setFilteredRows(rowsWithDraft);
        }
        
        if (resp?.counts) {
          setCounts(resp.counts);
        }
        
        if (resp?.audit_trail) {
          setAuditTrail(resp.audit_trail);
        }
      } catch (error) {
        console.error("Failed to fetch filtered data:", error);
      } finally {
        setLoadingFilter(false);
      }
    };

    fetchFilteredData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, filter, q]);

  // Update rows when draft changes (without refetching)
  const rows = useMemo(() => {
    return filteredRows.map((row) => {
      const key = row.masterField.key;
      const current = draft[key] !== undefined ? draft[key] : row.current;
      return {
        ...row,
        current,
      };
    });
  }, [filteredRows, draft]);

  // Input handling moved to ExtractedFieldRow component

  const saveManual = async (key: string, value: any) => {
    try {
      setSavingKey(key);
      const resp = await SubmissionFieldStatusService.patchSubmissionFieldStatus(submissionId, {
        set: [{ key, value: { raw: value, normalized: value } }],
      });
      onUpdated({ submission_fields: resp.submission_fields, eligibility: resp.eligibility });
      await refreshFilteredData();
    } finally {
      setSavingKey(null);
    }
  };

  const acceptExtracted = async (key: string) => {
    try {
      setSavingKey(key);
      const resp = await SubmissionFieldStatusService.patchSubmissionFieldStatus(submissionId, {
        review: [{ key, is_reviewed: true }],
      });
      onUpdated({ submission_fields: resp.submission_fields, eligibility: resp.eligibility });
      await refreshFilteredData();
    } finally {
      setSavingKey(null);
    }
  };

  const revertManual = async (key: string) => {
    try {
      setSavingKey(key);
      const resp = await SubmissionFieldStatusService.patchSubmissionFieldStatus(submissionId, {
        clear_manual: [key],
      });
      onUpdated({ submission_fields: resp.submission_fields, eligibility: resp.eligibility });
      await refreshFilteredData();
    } finally {
      setSavingKey(null);
    }
  };

  // Helper to refresh filtered data after updates
  const refreshFilteredData = async () => {
    try {
      const resp = await SubmissionFieldStatusService.getSubmissionFieldStatus(submissionId, {
        filter,
        search: q,
        recompute: false,
      });
      if (resp?.filtered_rows) {
        const rowsWithDraft = resp.filtered_rows.map((row: any) => {
          const key = row.masterField.key;
          const current = draft[key] !== undefined ? draft[key] : row.current;
          return { ...row, current };
        });
        setFilteredRows(rowsWithDraft);
      }
      if (resp?.counts) {
        setCounts(resp.counts);
      }
    } catch (error) {
      console.error("Failed to refresh filtered data:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Summary Header */}
      <Surface variant="soft" className="p-4 rounded-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left: Title + Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-bold text-text">Field Review</div>
            <StatusBadge tone={eligibility.eligible ? "success" : "danger"}>
              {eligibility.eligible ? "Eligible" : "Not eligible"}
            </StatusBadge>
            <StatusBadge tone="neutral">
              Required: {eligibility.filled_required}/{eligibility.required_total}
            </StatusBadge>
            <StatusBadge tone="neutral">
              Optional: {(eligibility.filled_optional ?? 0)}/{eligibility.optional_total ?? opt.length}
            </StatusBadge>
          </div>

          <div className="w-full sm:max-w-sm">
            <input
              className="w-full rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow"
              placeholder="Search by key or description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-card-border">          

          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={filter === "extracted"}
              label={`Extracted (${counts.extracted})`}
              onClick={() => setFilter("extracted")}
            />
            <FilterPill
              active={filter === "done"}
              label={`Completed`}
              onClick={() => setFilter("done")}
            />
            <FilterPill
              active={filter === "focus"}
              label={`Focus (${counts.focus})`}
              onClick={() => setFilter("focus")}
            />
            <FilterPill
              active={filter === "req_missing"}
              label={`Req Missing (${counts.reqMissing})`}
              onClick={() => setFilter("req_missing")}
            />
            <FilterPill
              active={filter === "req_review"}
              label={`Req Review (${counts.reqReview})`}
              onClick={() => setFilter("req_review")}
            />
            <FilterPill
              active={filter === "opt_missing"}
              label={`Opt Missing (${counts.optMissing})`}
              onClick={() => setFilter("opt_missing")}
            />
            <FilterPill
              active={filter === "opt_review"}
              label={`Opt Review (${counts.optReview})`}
              onClick={() => setFilter("opt_review")}
            />
            <FilterPill
              active={filter === "all"}
              label="All"
              onClick={() => setFilter("all")}
            />
          </div>
        </div>
      </Surface>

      {/* Empty State Messages */}
      {filter === "extracted" && rows.length === 0 && !loadingFilter ? (
        <Callout tone="info" title="No extracted fields">
          No fields have been extracted from documents yet. Upload documents to extract field values.
        </Callout>
      ) : null}
      {filter === "focus" && rows.length === 0 && !loadingFilter ? (
        <Callout tone="success" title="You're done with required reviews">
          No missing/review items found. You can check "All" if you want to verify optional values.
        </Callout>
      ) : null}
      {filter === "done" && rows.length === 0 && !loadingFilter ? (
        <Callout tone="info" title="No completed fields">
          Complete fields to see them here. Try switching to "Focus" to see what needs attention.
        </Callout>
      ) : null}

      {/* Fields List */}
      <div className="space-y-3">
        {loadingFilter ? (
          <Surface variant="soft" className="p-6">
            <div className="text-center text-sm text-card-text">Loading filtered fields...</div>
          </Surface>
        ) : rows.length === 0 ? (
          <Surface variant="soft" className="p-6">
            <Callout tone="info" title="No fields to show">
              Try switching filters or clearing the search.
            </Callout>
          </Surface>
        ) : (
          rows.map((r) => {
            const mf = r.masterField;
            const f = r.submissionField;
            const key = mf.key;
            const isBusy = savingKey === key;

            const showAccept = !!f && !r.isManual;
            const showRevert = r.isManual;

            return (
              <ExtractedFieldRow
                key={key}
                masterField={mf}
                submissionField={f}
                current={r.current}
                isManual={r.isManual}
                confidence={r.confidence}
                conflictsCount={r.conflictsCount}
                isMissing={r.isMissing}
                isReview={r.isReview}
                hasValidationErrors={r.hasValidationErrors}
                onValueChange={(v) => setDraft((p) => ({ ...p, [key]: v }))}
                onSave={() => saveManual(key, r.current)}
                onAccept={showAccept ? () => acceptExtracted(key) : undefined}
                onRevert={showRevert ? () => revertManual(key) : undefined}
                isBusy={isBusy}
                showAccept={showAccept}
                showRevert={showRevert}
                auditTrail={auditTrail[key] || []}
              />
            );
          })
        )}
      </div>

      {eligibility.eligible ? (
        <Callout tone="success" title="Eligible">
          All required fields are filled. You can proceed to document generation.
        </Callout>
      ) : null}
    </div>
  );
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-text"
          : "border-card-border bg-card text-text hover:bg-card-hover",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
