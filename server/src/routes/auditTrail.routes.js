const { Router } = require("express");
const { isAuth } = require("../middlewares");
const AuditTrailController = require("../controllers/auditTrail.controller");

const router = Router();

// Get recent audit logs (for dashboard) - accessible to all authenticated users
router.get("/recent", isAuth, AuditTrailController.getRecentAuditLogs);

// Get submission-specific audit trail
router.get("/submission/:id", isAuth, AuditTrailController.getSubmissionAuditTrail);

module.exports = router;

