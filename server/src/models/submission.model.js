const mongoose = require("mongoose");

/* -------------------- Per-document extracted fields -------------------- */
const ExtractedFieldSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: {
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
    normalized: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  conflicts: [{ raw: { type: mongoose.Schema.Types.Mixed, default: null } }],
  occurrences: [
    {
      snippet: { type: String, default: "" },
      page: { type: Number, default: null },
      line_hint: { type: String, default: null },
    },
  ],
  confidence: {
    type: String,
    enum: ["high", "medium", "low"],
    required: true,
    default: "low",
  },
  notes: { type: String, default: "" },
});

/* -------------------- Documents inside a submission -------------------- */
const DocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "File",
  },
  extracted_fields: { type: [ExtractedFieldSchema], default: [] },
  uploadDate: { type: Date, default: Date.now },
});

/* -------------------- Submission-level aggregated fields -------------------- */
/**
 * This is the "final view" of master fields for the submission.
 * source.type:
 * - extraction: auto-picked from uploaded documents
 * - manual: user filled/overrode
 */
const SubmissionFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },

    value: {
      raw: { type: mongoose.Schema.Types.Mixed, default: null },
      normalized: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "low",
    },

    conflicts: [{ raw: { type: mongoose.Schema.Types.Mixed, default: null } }],
    occurrences: [
      {
        snippet: { type: String, default: "" },
        page: { type: Number, default: null },
        line_hint: { type: String, default: null },
      },
    ],
    notes: { type: String, default: "" },

    source: {
      type: {
        type: String,
        enum: ["extraction", "manual"],
        default: "extraction",
      },
      // which submission.document entry produced it
      documentEntryId: { type: mongoose.Schema.Types.ObjectId, default: null },
      // actual file id
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
        default: null,
      },
    },

    is_reviewed: { type: Boolean, default: false },
    reviewedAt: { type: Date, default: null },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["pending", "review", "completed"],
      required: true,
      default: "pending",
    },

    submission_name: { type: String, required: true },

    legal_name: { type: String },

    documents: { type: [DocumentSchema], default: [] },

    // ✅ NEW: aggregated submission-level fields
    submission_fields: { type: [SubmissionFieldSchema], default: [] },

    // ✅ NEW: eligibility snapshot (computed server-side)
    eligibility: {
      eligible: { type: Boolean, default: false },
      required_total: { type: Number, default: 0 },
      filled_required: { type: Number, default: 0 },
      missing_required_keys: { type: [String], default: [] },
      needs_review_keys: { type: [String], default: [] },

      // ✅ NEW optional stats (does NOT affect eligible)
      optional_total: { type: Number, default: 0 },
      filled_optional: { type: Number, default: 0 },
      missing_optional_keys: { type: [String], default: [] },
      needs_review_optional_keys: { type: [String], default: [] },

      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

const Submission = mongoose.model("Submission", SubmissionSchema);
module.exports = Submission;
