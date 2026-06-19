// backend/routes/extractionRoutes.js
const express = require("express");
const multer = require("multer");
const { handleCnicUpload } = require("../controllers/extraction.controller");
const { isAuth, requireWorkspace, requirePermission, requireActiveSubscription, enforcePlanLimit } = require("../middlewares");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/cnic/extract-name/:id",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.extraction.run"),
  upload.single("cnic"),
  enforcePlanLimit("max_monthly_extractions", () => ({ incrementBy: 1 })),
  handleCnicUpload
);

module.exports = router;
