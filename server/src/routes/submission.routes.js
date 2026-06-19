const express = require("express");
const { isAuth, requireWorkspace, requirePermission, requireActiveSubscription, enforcePlanLimit } = require("../middlewares");
const SubmissionController = require("../controllers/submission.controller");
const SubmissionFieldsController = require("../controllers/submissionFields.controller");
const SubmissionDocumentController = require("../controllers/submissionDocument.controller");
const AssistantController = require("../controllers/assistant.controller");

const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/:id/assistant/query",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.submissions.read"),
  AssistantController.query
);
router.get(
  "/:id/assistant/status",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.read"),
  AssistantController.getStatus
);
router.post(
  "/:id/assistant/reindex",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.submissions.write"),
  AssistantController.reindex
);
router.post(
  "/:id/assistant/documents/:fileId/index",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.submissions.write"),
  AssistantController.indexDocument
);

router.get(
  "/:id/documents",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.read"),
  SubmissionDocumentController.listDocuments
);
router.post(
  "/:id/documents",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.submissions.write"),
  upload.array("documents", 10),
  SubmissionDocumentController.uploadDocuments
);
router.post(
  "/:id/documents/:docEntryId/extract",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.extraction.run"),
  enforcePlanLimit("max_monthly_extractions", () => ({ incrementBy: 1 })),
  SubmissionDocumentController.extractDocumentFields
);
router.put(
  "/:id/documents/:docEntryId",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.write"),
  upload.single("file"),
  SubmissionDocumentController.replaceDocument
);
router.delete(
  "/:id/documents/:docEntryId",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.submissions.manage"),
  SubmissionDocumentController.deleteDocument
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
