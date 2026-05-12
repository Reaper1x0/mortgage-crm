const { Router } = require("express");
const { isAuth, requireWorkspace, requirePermission } = require("../middlewares");
const AuditTrailController = require("../controllers/auditTrail.controller");

const router = Router();

router.get(
  "/recent",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.audit.read"),
  AuditTrailController.getRecentAuditLogs
);

router.get(
  "/submission/:id",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.audit.read"),
  AuditTrailController.getSubmissionAuditTrail
);

module.exports = router;
