const { AuditTrail, User } = require("../models");

/**
 * Audit Trail Service
 * Centralized service for logging all actions for compliance
 */
class AuditTrailService {
  /**
   * Log an audit event
   * @param {Object} params
   * @param {string} params.entity_type - submission, document, field, template, generated_document
   * @param {mongoose.Types.ObjectId} params.entity_id - ID of the entity
   * @param {mongoose.Types.ObjectId} params.user_id - User who performed the action
   * @param {string} params.action - Action type
   * @param {Object} [params.action_details] - Additional details about the action
   * @param {string} [params.field_key] - Field key if action is field-related
   * @param {string} [params.field_source] - extraction or manual
   * @param {mongoose.Types.ObjectId} [params.document_id] - Related document
   * @param {string} [params.document_name] - Document name
   * @param {mongoose.Types.ObjectId} [params.submission_id] - Related submission
   * @param {string} [params.ip_address] - IP address
   * @param {Object} [params.metadata] - Additional metadata
   */
  static async log({
    entity_type,
    entity_id,
    user_id,
    action,
    action_details = {},
    field_key = null,
    field_source = null,
    document_id = null,
    document_name = null,
    submission_id = null,
    ip_address = null,
    metadata = {},
  }) {
    try {
      // Get user info for denormalization
      let user_email = null;
      let user_name = null;
      try {
        const user = await User.findById(user_id).select("email fullName username").lean();
        if (user) {
          user_email = user.email || null;
          user_name = user.fullName || user.username || null;
        }
      } catch (err) {
        console.error("Failed to fetch user for audit trail:", err);
      }

      const auditEntry = await AuditTrail.create({
        entity_type,
        entity_id,
        user_id,
        user_email,
        user_name,
        action,
        action_details,
        field_key,
        field_source,
        document_id,
        document_name,
        submission_id,
        ip_address,
        metadata,
        timestamp: new Date(),
      });

      return auditEntry;
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      console.error("Audit trail logging failed:", error);
      return null;
    }
  }

  /**
   * Get audit trail for a submission
   */
  static async getSubmissionAuditTrail(submissionId, options = {}) {
    const { limit = 100, sort = { timestamp: -1 } } = options;
    return AuditTrail.find({ submission_id: submissionId })
      .populate("user_id", "name email")
      .sort(sort)
      .limit(limit)
      .lean();
  }

  /**
   * Get audit trail for a specific entity
   */
  static async getEntityAuditTrail(entityType, entityId, options = {}) {
    const { limit = 100, sort = { timestamp: -1 } } = options;
    return AuditTrail.find({ entity_type: entityType, entity_id: entityId })
      .populate("user_id", "name email")
      .sort(sort)
      .limit(limit)
      .lean();
  }

  /**
   * Get field-level audit trail
   */
  static async getFieldAuditTrail(submissionId, fieldKey, options = {}) {
    const { limit = 50, sort = { timestamp: -1 } } = options;
    return AuditTrail.find({
      submission_id: submissionId,
      field_key: fieldKey,
      action: { $in: ["field_extracted", "field_edited", "field_reviewed", "field_approved"] },
    })
      .populate({
        path: "user_id",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      })
      .sort(sort)
      .limit(limit)
      .lean();
  }

  /**
   * Get audit trail for all fields in a submission (grouped by field_key)
   */
  static async getSubmissionFieldsAuditTrail(submissionId, options = {}) {
    const { limit = 100 } = options;
    const auditEntries = await AuditTrail.find({
      submission_id: submissionId,
      entity_type: "field",
      action: { $in: ["field_extracted", "field_edited", "field_reviewed", "field_approved"] },
    })
      .populate({
        path: "user_id",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Group by field_key
    const grouped = {};
    for (const entry of auditEntries) {
      const key = entry.field_key;
      if (!key) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    }

    return grouped;
  }

  /**
   * Get document upload audit trail
   */
  static async getDocumentAuditTrail(documentId, options = {}) {
    const { limit = 50, sort = { timestamp: -1 } } = options;
    return AuditTrail.find({
      document_id: documentId,
      action: { $in: ["document_uploaded", "document_replaced", "document_deleted"] },
    })
      .populate({
        path: "user_id",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      })
      .sort(sort)
      .limit(limit)
      .lean();
  }

  /**
   * Get recent audit logs (for dashboard)
   * @param {Object} filter - Filter criteria (entity_type, action, etc.)
   * @param {Object} options - Options (limit, sort)
   */
  static async getRecentAuditLogs(filter = {}, options = {}) {
    const { limit = 50, sort = { timestamp: -1 } } = options;
    
    const query = { ...filter };
    
    return AuditTrail.find(query)
      .populate({
        path: "user_id",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      })
      .populate({
        path: "submission_id",
        select: "submission_name legal_name status"
      })
      .sort(sort)
      .limit(limit)
      .lean();
  }
}

module.exports = AuditTrailService;

