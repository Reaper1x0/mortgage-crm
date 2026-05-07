const express = require('express');
const { isAuth, requireWorkspace, hasRole, requireActiveSubscription, enforcePlanLimit } = require('../middlewares');
const SubmissionController = require('../controllers/submission.controller');
const SubmissionFieldsController = require('../controllers/submissionFields.controller');
const ExtractionController = require('../controllers/extraction.controller');
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// Admin, Agent: Document management (upload bank document packages)
router.get("/:id/documents", isAuth, requireWorkspace, hasRole(["Admin", "Agent", "Viewer"]), ExtractionController.listSubmissionDocuments);
router.put("/:id/documents/:docEntryId", isAuth, requireWorkspace, hasRole(["Admin", "Agent"]), upload.single("file"), ExtractionController.replaceSubmissionDocument);
router.delete("/:id/documents/:docEntryId", isAuth, requireWorkspace, hasRole(["Admin", "Agent"]), ExtractionController.deleteSubmissionDocument);

// Admin: Create a new Submission
router.post(
  '/',
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  hasRole(["Admin"]),
  enforcePlanLimit("max_submissions"),
  SubmissionController.createSubmission
);

// Admin, Agent: Update submission (approve validated data)
router.put('/:key', isAuth, requireWorkspace, hasRole(["Admin", "Agent"]), SubmissionController.updateSubmission);

// Admin, Agent, Viewer: View all cases (read-only for Viewer)
router.get('/', isAuth, requireWorkspace, hasRole(["Admin", "Agent", "Viewer"]), SubmissionController.getAllSubmissions);

// Admin, Agent, Viewer: View a case (read-only for Viewer)
router.get('/:key', isAuth, requireWorkspace, hasRole(["Admin", "Agent", "Viewer"]), SubmissionController.getSubmissionByKey);

// Admin, Agent: Review and correct extracted data
router.get("/:id/field-status", isAuth, requireWorkspace, hasRole(["Admin", "Agent", "Viewer"]), SubmissionFieldsController.getFieldStatus);
router.patch("/:id/field-status", isAuth, requireWorkspace, hasRole(["Admin", "Agent"]), SubmissionFieldsController.patchFieldStatus);
router.post("/:id/recompute-fields", isAuth, requireWorkspace, hasRole(["Admin", "Agent"]), SubmissionFieldsController.recompute);

module.exports = router;
