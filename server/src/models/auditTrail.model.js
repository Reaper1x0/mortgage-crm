const mongoose = require("mongoose");

/**
 * Audit Trail Model
 * Tracks all actions for compliance and accountability
 */
const auditTrailSchema = new mongoose.Schema(
  {
    // What entity this audit entry relates to
    entity_type: {
      type: String,
      enum: ["submission", "document", "field", "template", "generated_document"],
      required: true,
    },
    // For fields, entity_id is the field_key (string), for others it's ObjectId
    entity_id: { type: mongoose.Schema.Types.Mixed, required: true }, // Can be ObjectId or String (for field keys)

    // Who performed the action
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    user_email: { type: String }, // Denormalized for quick access
    user_name: { type: String }, // Denormalized for quick access

    // What action was performed
    action: {
      type: String,
      enum: [
        "document_uploaded",
        "document_replaced",
        "document_deleted",
        "field_extracted",
        "field_edited",
        "field_reviewed",
        "field_approved",
        "master_field_created",
        "master_field_updated",
        "master_field_deleted",
        "submission_created",
        "submission_updated",
        "submission_completed",
        "template_created",
        "template_updated",
        "document_generated",
        "document_downloaded",
      ],
      required: true,
    },

    // Action details
    action_details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    }, // e.g., { field_key: "borrower_name", old_value: "John", new_value: "John Doe" }

    // Field-specific tracking (for field edits)
    field_key: { type: String }, // If action is field-related
    field_source: { type: String, enum: ["extraction", "manual"] }, // How field was set

    // Document-specific tracking
    document_id: { type: mongoose.Schema.Types.ObjectId, ref: "File" }, // Related document
    document_name: { type: String }, // Denormalized document name

    // Submission context
    submission_id: { type: mongoose.Schema.Types.ObjectId, ref: "Submission" },

    // Timestamp
    timestamp: { type: Date, default: Date.now, required: true },

    // IP address for additional security tracking
    ip_address: { type: String },

    // Additional metadata
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Indexes for efficient queries
auditTrailSchema.index({ entity_type: 1, entity_id: 1, timestamp: -1 });
auditTrailSchema.index({ submission_id: 1, timestamp: -1 });
auditTrailSchema.index({ user_id: 1, timestamp: -1 });
auditTrailSchema.index({ action: 1, timestamp: -1 });
auditTrailSchema.index({ field_key: 1, timestamp: -1 });

module.exports = mongoose.model("AuditTrail", auditTrailSchema);

