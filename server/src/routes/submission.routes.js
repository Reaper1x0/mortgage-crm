const express = require("express");
const { isAuth, requireWorkspace, requirePermission, requireActiveSubscription, enforcePlanLimit } = require("../middlewares");
const SubmissionController = require("../controllers/submission.controller");
const SubmissionFieldsController = require("../controllers/submissionFields.controller");
const ExtractionController = require("../controllers/extraction.controller");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get(
  "/:id/documents",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.read"),
  ExtractionController.listSubmissionDocuments
);
router.put(
  "/:id/documents/:docEntryId",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.write"),
  upload.single("file"),
  ExtractionController.replaceSubmissionDocument
);
router.delete(
  "/:id/documents/:docEntryId",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.manage"),
  ExtractionController.deleteSubmissionDocument
);

router.post(
  "/",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.submissions.manage"),
  enforcePlanLimit("max_submissions"),
  SubmissionController.createSubmission
);

router.put("/:key", isAuth, requireWorkspace, requirePermission("workspace.submissions.write"), SubmissionController.updateSubmission);

router.get("/", isAuth, requireWorkspace, requirePermission("workspace.submissions.read"), SubmissionController.getAllSubmissions);

router.get("/:key", isAuth, requireWorkspace, requirePermission("workspace.submissions.read"), SubmissionController.getSubmissionByKey);

router.get(
  "/:id/field-status",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.read"),
  SubmissionFieldsController.getFieldStatus
);
router.patch(
  "/:id/field-status",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.write"),
  SubmissionFieldsController.patchFieldStatus
);
router.post(
  "/:id/recompute-fields",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.write"),
  SubmissionFieldsController.recompute
);

module.exports = router;
