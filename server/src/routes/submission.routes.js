const express = require('express');
const isAuth = require('../middlewares/auth.middleware');
const hasRole = require('../middlewares/hasRole.middleware');
const SubmissionController = require('../controllers/submission.controller');
const SubmissionFieldsController = require('../controllers/submissionFields.controller');
const ExtractionController = require('../controllers/extraction.controller');
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Document management routes FIRST (before /:key)
router.get("/:id/documents", isAuth, hasRole(["Admin"]), ExtractionController.listSubmissionDocuments);
router.put("/:id/documents/:docEntryId", isAuth, hasRole(["Admin"]), upload.single("file"), ExtractionController.replaceSubmissionDocument);
router.delete("/:id/documents/:docEntryId", isAuth, hasRole(["Admin"]), ExtractionController.deleteSubmissionDocument);

// Create a new Submission
router.post('/', isAuth, hasRole(["Admin"]), SubmissionController.createSubmission);

router.put('/:key', isAuth, hasRole(["Admin"]), SubmissionController.updateSubmission);

// Get all Submissions
router.get('/', isAuth, hasRole(["Admin"]), SubmissionController.getAllSubmissions);

// Get a Submission by key
router.get('/:key', isAuth, hasRole(["Admin"]), SubmissionController.getSubmissionByKey);

// ✅ NEW: required master fields status + manual editing
router.get("/:id/field-status", isAuth, hasRole(["Admin"]), SubmissionFieldsController.getFieldStatus);
router.patch("/:id/field-status", isAuth, hasRole(["Admin"]), SubmissionFieldsController.patchFieldStatus);
router.post("/:id/recompute-fields", isAuth, hasRole(["Admin"]), SubmissionFieldsController.recompute);

module.exports = router;
