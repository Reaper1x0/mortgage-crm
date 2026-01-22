import { useMemo, useState } from "react";
import { SubmissionFieldStatusService } from "../../service/submissionFieldsStatusService";

import Surface from "../Reusable/Surface";
import StatusBadge from "../Reusable/StatusBadge";
import Callout from "../Reusable/Callout";
import Button from "../Reusable/Button";

import { FiCheck, FiRefreshCw, FiSave, FiAlertTriangle } from "react-icons/fi";

type MasterField = {
  _id: string;
  key: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
};

type SubmissionField = {
  key: string;
  value?: { raw: any; normalized?: any };
  confidence?: "high" | "medium" | "low";
  conflicts?: Array<{ raw: any }>;
  notes?: string;
  source?: { type: "extraction" | "manual" };
  is_reviewed?: boolean;
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
  | "done";

function pct(n: number, d: number) {
  if (!d || d <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)));
}

function normalizeCurrent(f?: SubmissionField) {
  const v = f?.value?.normalized ?? f?.value?.raw ?? null;
  return v === undefined ? null : v;
}

function isBlank(v: any) {
  return v === null || v === undefined || String(v).trim() === "";
}

export default function MasterFieldsPanel({
  submissionId,
  masterFields,
  submissionFields,
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
  // Default filter: focus on what's needed (missing/review)
  const [filter, setFilter] = useState<FilterKey>("focus");
  const [q, setQ] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});

  const byKey = useMemo(() => {
    const m = new Map<string, SubmissionField>();
    (submissionFields || []).forEach((f) => m.set(String(f.key), f));
    return m;
  }, [submissionFields]);

  const opt = useMemo(() => masterFields.filter((m) => !m.required), [masterFields]);

  const missingOpt = eligibility.missing_optional_keys ?? [];
  const reviewOpt = eligibility.needs_review_optional_keys ?? [];

  const reqPct = pct(eligibility.filled_required, eligibility.required_total);
  const optPct = pct(eligibility.filled_optional ?? 0, eligibility.optional_total ?? opt.length);

  const rows = useMemo(() => {
    const base = (masterFields || []).map((mf) => {
      const f = byKey.get(String(mf.key));
      const current = draft[mf.key] !== undefined ? draft[mf.key] : normalizeCurrent(f);

      const hasValue = !isBlank(current);

      const conflictsCount = f?.conflicts?.length || 0;
      const confidence = f?.confidence || (f ? "low" : undefined);
      const isManual = f?.source?.type === "manual";

      const isMissingReq = mf.required && eligibility.missing_required_keys.includes(mf.key);
      const isReviewReq = mf.required && eligibility.needs_review_keys.includes(mf.key);

      const isMissingOpt = !mf.required && missingOpt.includes(mf.key);
      const isReviewOpt = !mf.required && reviewOpt.includes(mf.key);

      const needsReviewGeneric =
        !!f && ((confidence || "low") === "low" || conflictsCount > 0 || !f.is_reviewed);

      const isMissing = mf.required ? isMissingReq : isMissingOpt;
      const isReview = mf.required ? isReviewReq : (isReviewOpt || needsReviewGeneric);

      // done means: filled + not missing + not review
      const isDone = hasValue && !isMissing && !isReview;

      return {
        mf,
        f,
        current,
        isManual,
        confidence,
        conflictsCount,
        isMissing,
        isReview,
        isDone,
      };
    });

    // search
    const s = (q || "").trim().toLowerCase();
    const searched = !s
      ? base
      : base.filter((x) => {
          const k = String(x.mf.key || "").toLowerCase();
          const d = String(x.mf.description || "").toLowerCase();
          return k.includes(s) || d.includes(s);
        });

    // default: focus
    if (filter === "focus") {
      return searched
        .filter((x) => x.isMissing || x.isReview)
        .sort((a, b) => {
          // missing first, then review
          const ap = a.isMissing ? 0 : a.isReview ? 1 : 2;
          const bp = b.isMissing ? 0 : b.isReview ? 1 : 2;
          return ap - bp;
        });
    }

    if (filter === "req_missing") return searched.filter((x) => x.mf.required && x.isMissing);
    if (filter === "req_review") return searched.filter((x) => x.mf.required && x.isReview && !x.isMissing);
    if (filter === "opt_missing") return searched.filter((x) => !x.mf.required && x.isMissing);
    if (filter === "opt_review") return searched.filter((x) => !x.mf.required && x.isReview && !x.isMissing);
    if (filter === "done") return searched.filter((x) => x.isDone);
    return searched;
  }, [masterFields, byKey, eligibility, filter, q, missingOpt, reviewOpt, draft]);

  const inputFor = (
    type: MasterField["type"],
    value: any,
    onChange: (v: any) => void
  ) => {
    // compact, consistent input styles (smaller than before)
    const base =
      "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-text " +
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

  const saveManual = async (key: string, value: any) => {
    try {
      setSavingKey(key);
      const resp = await SubmissionFieldStatusService.patchSubmissionFieldStatus(submissionId, {
        set: [{ key, value: { raw: value, normalized: value } }],
      });
      onUpdated({ submission_fields: resp.submission_fields, eligibility: resp.eligibility });
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
    } finally {
      setSavingKey(null);
    }
  };

  const counts = useMemo(() => {
    const reqMissing = eligibility.missing_required_keys.length;
    const reqReview = eligibility.needs_review_keys.length;
    const optMissing = (missingOpt || []).length;
    const optReview = (reviewOpt || []).length;
    const focus = rows.filter((r) => r.isMissing || r.isReview).length;
    return { reqMissing, reqReview, optMissing, optReview, focus };
  }, [eligibility, missingOpt, reviewOpt, rows]);

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Surface variant="soft" className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-text">Field Review</div>
            <div className="text-sm text-card-text">
              Work through missing and review items first. Save adds a manual override.
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
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
          </div>

          <div className="w-full max-w-md space-y-3">
            {/* Required progress */}
            <div className="rounded-2xl border border-card-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-text">Eligibility (Required)</div>
                <div className="text-xs text-card-text">{reqPct}%</div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-card-border bg-card-hover">
                <div className="h-full bg-primary" style={{ width: `${reqPct}%` }} />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-card-text">Optional completion</div>
                <div className="text-xs text-card-text">{optPct}%</div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-card-border bg-card-hover">
                <div className="h-full bg-primary" style={{ width: `${optPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <input
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow"
              placeholder="Search by key or description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
              active={filter === "done"}
              label="Completed"
              onClick={() => setFilter("done")}
            />
            <FilterPill
              active={filter === "all"}
              label="All"
              onClick={() => setFilter("all")}
            />
          </div>
        </div>
      </Surface>

      {/* Empty Focus State */}
      {filter === "focus" && rows.length === 0 ? (
        <Callout tone="success" title="You’re done with required reviews">
          No missing/review items found. You can check “All” if you want to verify optional values.
        </Callout>
      ) : null}

      {/* List */}
      <Surface variant="soft" className="p-3">
        <div className="divide-y divide-card-border">
          {rows.map((r) => {
            const mf = r.mf;
            const f = r.f;
            const key = mf.key;
            const isBusy = savingKey === key;

            const showAccept = !!f && !r.isManual;
            const showRevert = r.isManual;

            return (
              <div key={key} className="p-3">
                <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
                  {/* Left: key + desc + badges */}
                  <div className="lg:col-span-6 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-extrabold text-text break-words truncate">
                        {key}
                      </div>

                      {mf.required ? (
                        <StatusBadge tone="warning">Required</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Optional</StatusBadge>
                      )}

                      {r.isMissing ? (
                        <StatusBadge tone="danger">Missing</StatusBadge>
                      ) : r.isReview ? (
                        <StatusBadge tone="warning">Needs review</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">OK</StatusBadge>
                      )}

                      {r.isManual ? <StatusBadge tone="success">Manual</StatusBadge> : null}

                      {r.confidence ? (
                        <StatusBadge
                          tone={
                            r.confidence === "high"
                              ? "success"
                              : r.confidence === "medium"
                              ? "warning"
                              : "danger"
                          }
                        >
                          Confidence: {r.confidence}
                        </StatusBadge>
                      ) : null}

                      {r.conflictsCount > 0 ? (
                        <StatusBadge tone="warning">
                          {r.conflictsCount} conflict(s)
                        </StatusBadge>
                      ) : null}
                    </div>

                    {mf.description ? (
                      <div className="mt-1 text-sm text-card-text break-words">
                        {mf.description}
                      </div>
                    ) : null}

                    {r.conflictsCount > 0 ? (
                      <div className="mt-3 rounded-2xl border border-warning-border bg-warning p-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-warning-text">
                          <FiAlertTriangle />
                          Conflicts
                        </div>
                        <ul className="mt-2 ml-4 list-disc text-sm text-text">
                          {f?.conflicts?.map((c, idx) => (
                            <li key={idx}>{String(c.raw)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  {/* Right: editor + actions */}
                  <div className="lg:col-span-6">
                    <div className="grid gap-2 lg:grid-cols-12 lg:items-center">
                      <div className="lg:col-span-7">
                        {inputFor(mf.type, r.current, (v) =>
                          setDraft((p) => ({ ...p, [key]: v }))
                        )}
                      </div>

                      <div className="lg:col-span-5">
                        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                          {showAccept ? (
                            <Button
                              variant="secondary"
                              type="button"
                              disabled={isBusy}
                              onClick={() => acceptExtracted(key)}
                            >
                              <span className="inline-flex items-center gap-2">
                                <FiCheck /> Accept
                              </span>
                            </Button>
                          ) : null}

                          {showRevert ? (
                            <Button
                              variant="secondary"
                              type="button"
                              disabled={isBusy}
                              onClick={() => revertManual(key)}
                            >
                              <span className="inline-flex items-center gap-2">
                                <FiRefreshCw /> Revert
                              </span>
                            </Button>
                          ) : null}

                          {/* Save as primary action */}
                          <Button
                            variant="primary"
                            type="button"
                            disabled={isBusy}
                            isLoading={isBusy}
                            onClick={() => saveManual(key, r.current)}
                          >
                            <span className="inline-flex items-center gap-2">
                              <FiSave /> Save
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Optional subtle helper */}
                    {mf.required && r.isMissing ? (
                      <div className="mt-2 text-xs text-card-text">
                        This required field must be filled to pass eligibility.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {rows.length === 0 ? (
            <div className="p-6">
              <Callout tone="info" title="No fields to show">
                Try switching filters or clearing the search.
              </Callout>
            </div>
          ) : null}
        </div>
      </Surface>

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
