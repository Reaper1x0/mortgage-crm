const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const { Submission, MasterField } = require("../models");
const { recomputeSubmissionFields, filterAndCountFields } = require("../services/submissionFields.service");
const AuditTrailService = require("../services/auditTrail.service");

const SubmissionFieldsController = {
  // GET /api/submissions/:id/field-status
  // Query params: filter (focus|all|req_missing|req_review|opt_missing|opt_review|done|extracted), search (string), recompute (1|0)
  getFieldStatus: catchAsync(async (req, res) => {
    const userId = req.user;
    const id = req.params.id;

    const submission = await Submission.findOne({ _id: id })
      .populate("documents.document")
      .populate({
        path: "documents.document.uploaded_by",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    // recompute if requested or if missing snapshot
    const doRecompute = String(req.query.recompute || "") === "1";
    const fresh =
      doRecompute || !submission.eligibility?.updatedAt ? await recomputeSubmissionFields(id, userId) : submission;

    const masterFields = await MasterField.find({}).lean();

    // Get filter and search parameters
    const filter = req.query.filter || "focus";
    const searchQuery = req.query.search || "";

    // Filter and count fields on server side
    const { rows, counts } = filterAndCountFields(
      masterFields,
      fresh.submission_fields || [],
      fresh.eligibility || {},
      filter,
      searchQuery
    );

    // Get audit trail for all fields
    const fieldsAuditTrail = await AuditTrailService.getSubmissionFieldsAuditTrail(id);

    return R2XX(res, "Field status fetched.", 200, {
      submission: fresh,
      master_fields: masterFields,
      eligibility: fresh.eligibility,
      submission_fields: fresh.submission_fields || [],
      // Server-side filtered results
      filtered_rows: rows,
      counts: counts,
      // Audit trail data grouped by field_key
      audit_trail: fieldsAuditTrail,
    });
  }),

  /**
   * PATCH /api/submissions/:id/field-status
   * Body:
   * {
   *   set: [{ key, value: { raw, normalized }, notes? }],   // -> becomes manual override
   *   review: [{ key, is_reviewed: true }],                // accept extracted
   *   clear_manual: [ "field_key" ]                         // revert manual -> extraction
   * }
   */
  patchFieldStatus: catchAsync(async (req, res) => {
    const userId = req.user;
    const id = req.params.id;

    const submission = await Submission.findOne({ _id: id })
      .populate("documents.document")
      .populate({
        path: "documents.document.uploaded_by",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    const masterFields = await MasterField.find({}).lean();
    const allowedKeys = new Set(masterFields.map((m) => String(m.key)));

    submission.submission_fields = Array.isArray(submission.submission_fields)
      ? submission.submission_fields
      : [];

    const byKey = new Map(submission.submission_fields.map((f) => [String(f.key), f]));

    const { set = [], review = [], clear_manual = [] } = req.body || {};

    // clear manual overrides
    if (Array.isArray(clear_manual)) {
      for (const k of clear_manual) {
        const key = String(k);
        const existing = byKey.get(key);
        if (existing && existing.source?.type === "manual") {
          // Log before clearing
          await AuditTrailService.log({
            entity_type: "field",
            entity_id: `${id}_${key}`, // Composite key
            user_id: userId,
            action: "field_edited",
            action_details: {
              field_key: key,
              action: "cleared_manual_override",
              old_value: existing.value,
              new_value: null,
            },
            field_key: key,
            field_source: "manual",
            submission_id: id,
          });
          byKey.delete(key);
        }
      }
    }

    // manual set fields
    if (Array.isArray(set)) {
      for (const item of set) {
        const key = String(item?.key || "");
        if (!key) continue;
        if (!allowedKeys.has(key) && key !== "legal_name") continue;

        const raw = item?.value?.raw ?? null;
        const normalized = item?.value?.normalized ?? null;
        const notes = typeof item?.notes === "string" ? item.notes : "";

        // Get old value for audit trail
        const existing = byKey.get(key);
        const oldValue = existing ? { raw: existing.value?.raw, normalized: existing.value?.normalized } : null;

        byKey.set(key, {
          key,
          value: { raw, normalized },
          confidence: "high",
          conflicts: [],
          occurrences: [],
          notes,
          source: { type: "manual", documentEntryId: null, fileId: null },
          is_reviewed: true,
          reviewedAt: new Date(),
        });

        // Log field edit audit trail
        await AuditTrailService.log({
          entity_type: "field",
          entity_id: `${id}_${key}`, // Composite key
          user_id: userId,
          action: existing ? "field_edited" : "field_extracted",
          action_details: {
            field_key: key,
            old_value: oldValue,
            new_value: { raw, normalized },
            notes: notes || null,
          },
          field_key: key,
          field_source: "manual",
          submission_id: id,
        });
      }
    }

    // review accept extracted (don't change value, just mark reviewed if exists)
    if (Array.isArray(review)) {
      for (const r of review) {
        const key = String(r?.key || "");
        const existing = byKey.get(key);
        if (!existing) continue;
        const wasReviewed = existing.is_reviewed;
        existing.is_reviewed = true;
        existing.reviewedAt = new Date();
        byKey.set(key, existing);

        // Log review audit trail (only if not already reviewed)
        if (!wasReviewed) {
          await AuditTrailService.log({
            entity_type: "field",
            entity_id: `${id}_${key}`, // Composite key
            user_id: userId,
            action: "field_reviewed",
            action_details: {
              field_key: key,
              value: existing.value,
              source: existing.source?.type || "unknown",
            },
            field_key: key,
            field_source: existing.source?.type || "extraction",
            submission_id: id,
          });
        }
      }
    }

    submission.submission_fields = Array.from(byKey.values());
    await submission.save();

    // recompute (keeps manual pinned)
    const updated = await recomputeSubmissionFields(id, userId);

    return R2XX(res, "Fields updated.", 200, {
      submission: updated,
      eligibility: updated.eligibility,
      submission_fields: updated.submission_fields || [],
    });
  }),

  // POST /api/submissions/:id/recompute-fields
  recompute: catchAsync(async (req, res) => {
    const userId = req.user;
    const id = req.params.id;

    const updated = await recomputeSubmissionFields(id, userId);
    if (!updated) return R4XX(res, 404, "Submission not found.");

    return R2XX(res, "Recomputed submission fields.", 200, {
      submission: updated,
      eligibility: updated.eligibility,
      submission_fields: updated.submission_fields || [],
    });
  }),
};

module.exports = SubmissionFieldsController;
