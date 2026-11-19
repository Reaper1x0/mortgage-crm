const { R2XX } = require("../Responses");
const { catchAsync } = require("../utils");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination.utils");
const AuditTrailService = require("../services/auditTrail.service");

const AuditTrailController = {
  /**
   * GET /audit-trail/recent
   * Recent workspace audit logs.
   * Query params: page, limit, sortBy, sortOrder, entity_type, action
   */
  getRecentAuditLogs: catchAsync(async (req, res) => {
    const entityType = req.query.entity_type || null;
    const action = req.query.action || null;
    const { page, limit, skip, sort, isAll } = parsePagination(req.query, {
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "timestamp",
      defaultSortOrder: "desc",
      allowedSortBy: ["timestamp", "action", "entity_type"],
    });

    const filter = {};
    if (entityType) filter.entity_type = entityType;
    if (action) filter.action = action;

    const { auditLogs, total } = await AuditTrailService.getRecentAuditLogs(filter, {
      limit,
      skip,
      sort,
      workspaceId: req.workspaceId,
    });

    return R2XX(res, "Recent audit logs fetched successfully", 200, {
      audit_logs: auditLogs,
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    });
  }),

  /**
   * GET /audit-trail/submission/:id
   * Get audit trail for a specific submission
   */
  getSubmissionAuditTrail: catchAsync(async (req, res) => {
    const submissionId = req.params.id;
    const limit = parseInt(req.query.limit || "100", 10);

    const auditLogs = await AuditTrailService.getSubmissionAuditTrail(submissionId, {
      limit,
      workspaceId: req.workspaceId,
    });

    return R2XX(res, "Submission audit trail fetched successfully", 200, {
      audit_logs: auditLogs,
    });
  }),
};

module.exports = AuditTrailController;


