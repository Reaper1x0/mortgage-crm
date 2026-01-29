const express = require("express");
const { isAuth, hasRole } = require("../middlewares");
const DashboardController = require("../controllers/dashboard.controller");
const { validate } = require("../middlewares");
const { dashboardValidation } = require("../validations");

const router = express.Router();

// All dashboard routes require authentication and any role (Admin, Agent, Viewer)
// No role-based result differences - all users see the same data
router.get(
  "/summary",
  isAuth,
  hasRole(["Admin", "Agent", "Viewer"]),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getSummary
);

router.get(
  "/trends",
  isAuth,
  hasRole(["Admin", "Agent", "Viewer"]),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getTrends
);

router.get(
  "/validation-failures",
  isAuth,
  hasRole(["Admin", "Agent", "Viewer"]),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getValidationFailures
);

router.get(
  "/workload",
  isAuth,
  hasRole(["Admin", "Agent", "Viewer"]),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getWorkload
);

module.exports = router;

