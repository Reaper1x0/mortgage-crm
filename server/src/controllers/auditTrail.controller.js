const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const AuditTrailService = require("../services/auditTrail.service");

const AuditTrailController = {
  /**
   * GET /audit-trail/recent
   * Get recent audit logs for dashboard
   * Query params: limit (default 50), entity_type (optional filter)
   */
  getRecentAuditLogs: catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit || "50", 10);
    const entityType = req.query.entity_type || null;
    const action = req.query.action || null;

    const filter = {};
    if (entityType) filter.entity_type = entityType;
    if (action) filter.action = action;

    const auditLogs = await AuditTrailService.getRecentAuditLogs(filter, { limit });

    return R2XX(res, "Recent audit logs fetched successfully", 200, {
      audit_logs: auditLogs,
    });
  }),

  /**
   * GET /audit-trail/submission/:id
   * Get audit trail for a specific submission
   */
  getSubmissionAuditTrail: catchAsync(async (req, res) => {
    const submissionId = req.params.id;
    const limit = parseInt(req.query.limit || "100", 10);

    const auditLogs = await AuditTrailService.getSubmissionAuditTrail(submissionId, { limit });

    return R2XX(res, "Submission audit trail fetched successfully", 200, {
      audit_logs: auditLogs,
    });
  }),
};

module.exports = AuditTrailController;


