// backend/routes/extractionRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  handleCnicUpload,
  handleDocumentsUpload,
} = require("../controllers/extraction.controller");
const { isAuth, requireWorkspace, hasRole, requireActiveSubscription, enforcePlanLimit } = require("../middlewares");

const router = express.Router();

// Multer config (memory + disk path)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Admin, Agent: Upload bank document packages (CNIC extraction)
router.post(
  "/cnic/extract-name/:id",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  hasRole(["Admin", "Agent"]),
  upload.single("cnic"),
  enforcePlanLimit("max_monthly_extractions", () => ({ incrementBy: 1 })),
  handleCnicUpload
);

// Admin, Agent: Upload bank document packages (document extraction)
router.post(
  "/documents/extract-fields/:id",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  hasRole(["Admin", "Agent"]),
  upload.array("documents", 10),
  enforcePlanLimit("max_monthly_extractions", (req) => ({ incrementBy: (req.files || []).length || 0 })),
  handleDocumentsUpload
);

module.exports = router;
