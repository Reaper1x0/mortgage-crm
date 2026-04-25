const { Router } = require("express");
const { isAuth, requireWorkspace, hasRole } = require("../middlewares");
const AuditTrailController = require("../controllers/auditTrail.controller");

const router = Router();

// Get recent audit logs (for dashboard) - accessible to all authenticated users
router.get(
  "/recent",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  AuditTrailController.getRecentAuditLogs
);

// Get submission-specific audit trail
router.get(
  "/submission/:id",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  AuditTrailController.getSubmissionAuditTrail
);

module.exports = router;

