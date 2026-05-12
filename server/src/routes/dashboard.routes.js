const express = require("express");
const { isAuth, requireWorkspace, requirePermission } = require("../middlewares");
const DashboardController = require("../controllers/dashboard.controller");
const { validate } = require("../middlewares");
const { dashboardValidation } = require("../validations");

const router = express.Router();

router.get(
  "/summary",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.dashboard.read"),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getSummary
);

router.get(
  "/trends",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.dashboard.read"),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getTrends
);

router.get(
  "/validation-failures",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.dashboard.read"),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getValidationFailures
);

router.get(
  "/workload",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.dashboard.read"),
  validate(dashboardValidation.dashboardQuery),
  DashboardController.getWorkload
);

module.exports = router;
