const { Submission, MasterField } = require("../models");

/* -------------------- helpers -------------------- */
const distinct = (arr) => Array.from(new Set(arr));

function normalizeValueToString(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function isFilledByType(v, type) {
  // important: false, 0 are VALID values for boolean/number
  if (v === null || v === undefined) return false;

  switch (type) {
    case "boolean":
      return typeof v === "boolean";
    case "number":
      if (typeof v === "number") return !Number.isNaN(v);
      if (typeof v === "string")
        return v.trim() !== "" && !Number.isNaN(Number(v));
      return false;
    case "date":
      if (v instanceof Date) return !Number.isNaN(v.getTime());
      if (typeof v === "string") return !Number.isNaN(Date.parse(v));
      return false;
    case "array":
      return Array.isArray(v) && v.length > 0;
    case "object":
      return (
        typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0
      );
    case "string":
    default:
      return typeof v === "string"
        ? v.trim().length > 0
        : normalizeValueToString(v).length > 0;
  }
}

function pickBestCandidate(cands) {
  // rank: confidence high > medium > low; conflicts fewer; has raw; more occurrences
  const rank = { low: 0, medium: 1, high: 2 };

  return cands.slice().sort((a, b) => {
    const ra = rank[a.confidence || "low"];
    const rb = rank[b.confidence || "low"];
    if (rb !== ra) return rb - ra;

    const ca = (a.conflicts || []).length;
    const cb = (b.conflicts || []).length;
    if (ca !== cb) return ca - cb;

    const hasA = a?.value?.raw !== null && a?.value?.raw !== undefined ? 1 : 0;
    const hasB = b?.value?.raw !== null && b?.value?.raw !== undefined ? 1 : 0;
    if (hasB !== hasA) return hasB - hasA;

    const oa = (a.occurrences || []).length;
    const ob = (b.occurrences || []).length;
    return ob - oa;
  })[0];
}

function mergeDistinctConflicts(allCands, chosen) {
  const chosenStr = normalizeValueToString(chosen?.value?.raw);
  const bag = [];

  for (const c of allCands) {
    const raw = c?.value?.raw;
    const s = normalizeValueToString(raw);
    if (!s) continue;
    if (chosenStr && s === chosenStr) continue;
    bag.push(s);
  }

  const uniq = distinct(bag).map((x) => ({ raw: x }));
  return uniq;
}

/* -------------------- core builder -------------------- */
async function recomputeSubmissionFields(submissionId, userId) {
  const submission = await Submission.findOne({
    _id: submissionId,
  }).populate("documents.document");
  if (!submission) return null;

  const masterFields = await MasterField.find({}).lean();
  const masterByKey = new Map(masterFields.map((m) => [String(m.key), m]));

  // keep manual overrides pinned
  const existing = Array.isArray(submission.submission_fields)
    ? submission.submission_fields
    : [];
  const manualByKey = new Map(
    existing
      .filter((f) => f?.source?.type === "manual")
      .map((f) => [String(f.key), f])
  );

  // collect candidates per key from documents
  const candsByKey = new Map();

  for (const docEntry of submission.documents || []) {
    const fileId =
      docEntry?.document && typeof docEntry.document === "object"
        ? docEntry.document._id
        : docEntry.document;

    for (const f of docEntry.extracted_fields || []) {
      const key = String(f.key || "");
      if (!key) continue;
      if (!masterByKey.has(key) && key !== "legal_name") continue; // ignore unknown keys

      if (!candsByKey.has(key)) candsByKey.set(key, []);
      
      // Get document name for traceability
      const documentName = docEntry.document_name || 
        (docEntry.document && typeof docEntry.document === "object" 
          ? docEntry.document.original_name || docEntry.document.display_name 
          : "");
      
      candsByKey.get(key).push({
        key,
        value: {
          raw: f?.value?.raw ?? null,
          normalized: f?.value?.normalized ?? null,
        },
        confidence: f?.confidence || "low",
        conflicts: Array.isArray(f?.conflicts) ? f.conflicts : [],
        occurrences: Array.isArray(f?.occurrences) ? f.occurrences : [],
        notes: f?.notes || "",
        // Preserve validation if present
        validation: f?.validation || {
          validated: false,
          passed: false,
          errors: [],
          validated_at: null,
        },
        // Preserve traceability if present, or build from document
        traceability: f?.traceability || {
          document_name: documentName,
          document_id: docEntry._id || null,
          file_id: fileId || null,
          extracted_at: new Date(),
          extraction_method: "openai",
        },
        source: {
          type: "extraction",
          documentEntryId: docEntry._id,
          fileId: fileId || null,
          document_name: documentName,
          extracted_at: new Date(),
        },
        is_reviewed: false,
        reviewedAt: null,
      });
    }
  }

  const finalFields = [];

  // build for all master keys (and optionally legal_name if you use it as master)
  const allKeys = distinct([
    ...masterFields.map((m) => String(m.key)),
    ...Array.from(candsByKey.keys()),
  ]);

  for (const key of allKeys) {
    // manual pinned
    if (manualByKey.has(key)) {
      finalFields.push(manualByKey.get(key));
      continue;
    }

    const cands = candsByKey.get(key) || [];
    if (!cands.length) continue; // missing keys simply not stored here

    const chosen = pickBestCandidate(cands);
    const conflicts = mergeDistinctConflicts(cands, chosen);

    // Check if validation failed (needs review)
    const hasValidationErrors = chosen.validation?.validated && 
      !chosen.validation.passed && 
      chosen.validation.errors?.length > 0;
    
    const needsReview = chosen.confidence === "low" || 
      conflicts.length > 0 || 
      hasValidationErrors;

    // Merge validation from best candidate (prefer validated results)
    const bestValidation = cands
      .filter(c => c.validation?.validated)
      .sort((a, b) => {
        // Prefer passed validations, then by error count
        if (a.validation.passed && !b.validation.passed) return -1;
        if (!a.validation.passed && b.validation.passed) return 1;
        return (a.validation.errors?.length || 0) - (b.validation.errors?.length || 0);
      })[0]?.validation || chosen.validation;

    // Merge traceability (prefer most complete)
    const bestTraceability = cands
      .filter(c => c.traceability?.document_name)
      .sort((a, b) => {
        const aComplete = (a.traceability?.document_name ? 1 : 0) + 
                         (a.traceability?.file_id ? 1 : 0);
        const bComplete = (b.traceability?.document_name ? 1 : 0) + 
                         (b.traceability?.file_id ? 1 : 0);
        return bComplete - aComplete;
      })[0]?.traceability || chosen.traceability;

    finalFields.push({
      ...chosen,
      conflicts: conflicts.length ? conflicts : chosen.conflicts || [],
      validation: bestValidation || {
        validated: false,
        passed: false,
        errors: [],
        validated_at: null,
      },
      traceability: bestTraceability || chosen.traceability,
      is_reviewed: needsReview ? false : true,
      reviewedAt: needsReview ? null : new Date(),
    });
  }

  // eligibility compute
  const required = masterFields.filter((m) => !!m.required);
  const required_total = required.length;

  const byKey = new Map(finalFields.map((f) => [String(f.key), f]));

  const missing_required_keys = [];
  const needs_review_keys = [];
  let filled_required = 0;

  for (const mf of required) {
    const key = String(mf.key);
    const field = byKey.get(key);

    const candidateValue =
      field?.value?.normalized !== null &&
      field?.value?.normalized !== undefined
        ? field.value.normalized
        : field?.value?.raw;

    const filled = isFilledByType(candidateValue, mf.type);

    if (!field || !filled) {
      missing_required_keys.push(key);
      continue;
    }

    filled_required += 1;

    const hasConflicts =
      Array.isArray(field.conflicts) && field.conflicts.length > 0;
    const low = (field.confidence || "low") === "low";
    const hasValidationErrors = field.validation?.validated && 
      !field.validation.passed && 
      field.validation.errors?.length > 0;
    
    if (!field.is_reviewed || hasConflicts || low || hasValidationErrors) {
      needs_review_keys.push(key);
    }
  }

  const eligible = missing_required_keys.length === 0;

  const nextStatus = eligible
    ? "completed"
    : submission.status === "pending"
    ? "review"
    : submission.status;

  const optional = masterFields.filter((m) => !m.required);
  const optional_total = optional.length;

  const missing_optional_keys = [];
  const needs_review_optional_keys = [];
  let filled_optional = 0;

  for (const mf of optional) {
    const key = String(mf.key);
    const field = byKey.get(key);

    const candidateValue =
      field?.value?.normalized !== null &&
      field?.value?.normalized !== undefined
        ? field.value.normalized
        : field?.value?.raw;

    const filled = field ? isFilledByType(candidateValue, mf.type) : false;

    if (!field || !filled) {
      missing_optional_keys.push(key);
      continue;
    }

    filled_optional += 1;

    const hasConflicts =
      Array.isArray(field.conflicts) && field.conflicts.length > 0;
    const low = (field.confidence || "low") === "low";
    const hasValidationErrors = field.validation?.validated && 
      !field.validation.passed && 
      field.validation.errors?.length > 0;
    
    if (!field.is_reviewed || hasConflicts || low || hasValidationErrors) {
      needs_review_optional_keys.push(key);
    }
  }

  const update = {
    submission_fields: finalFields,
    eligibility: {
      eligible,
      required_total,
      filled_required,
      missing_required_keys,
      needs_review_keys,

      optional_total,
      filled_optional,
      missing_optional_keys,
      needs_review_optional_keys,

      updatedAt: new Date(),
    },
    status: nextStatus,
  };

  // ✅ Atomic write (no VersionError)
  const updated = await Submission.findOneAndUpdate(
    { _id: submissionId },
    { $set: update },
    { new: true, runValidators: true }
  ).populate("documents.document");

  return updated;
}

module.exports = { recomputeSubmissionFields };
