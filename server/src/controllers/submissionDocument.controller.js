const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const SubmissionService = require("../services/submission.service");
const submissionDocumentService = require("../services/submissionDocument.service");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");

function sendServiceError(res, err) {
  const status = err?.statusCode || 400;
  return R4XX(res, status, err?.message || "Request failed.");
}

const SubmissionDocumentController = {
  uploadDocuments: catchAsync(async (req, res) => {
    const files = req.files || [];
    const submissionId = req.params.id;
    const userId = req.user;

    if (!files.length) return R4XX(res, 400, "At least one document file is required.");

    const results = await submissionDocumentService.uploadSubmissionDocuments({
      submissionId,
      files,
      userId,
      workspaceId: req.workspaceId,
      organizationId: req.organizationId,
    });

    const succeeded = results.filter((r) => r.ok);
    if (!succeeded.length) {
      return R4XX(res, 400, "No documents could be uploaded successfully.", { results });
    }

    const hydratedSubmission = await SubmissionService.getSubmissionByKey(
      submissionId,
      req.workspaceId
    );
    const signedSubmission = await attachSignedUrlsDeep(hydratedSubmission);
    const signedResults = await attachSignedUrlsDeep(results);

    return R2XX(res, "Documents uploaded successfully.", 200, {
      submission: signedSubmission,
      results: signedResults,
    });
  }),

  extractDocumentFields: catchAsync(async (req, res) => {
    const submissionId = req.params.id;
    const docEntryId = req.params.docEntryId;
    const userId = req.user;

    try {
      const result = await submissionDocumentService.extractSubmissionDocumentFields({
        submissionId,
        docEntryId,
        userId,
        workspaceId: req.workspaceId,
        organizationId: req.organizationId,
      });

      const hydratedSubmission = await SubmissionService.getSubmissionByKey(
        submissionId,
        req.workspaceId
      );
      const signedSubmission = await attachSignedUrlsDeep(hydratedSubmission);

      return R2XX(res, "Fields extracted successfully.", 200, {
        submission: signedSubmission,
        ...result,
      });
    } catch (err) {
      return sendServiceError(res, err);
    }
  }),

  listDocuments: catchAsync(async (req, res) => {
    const submissionId = req.params.id;

    const submission = await SubmissionService.getSubmissionByKey(submissionId, req.workspaceId);
    if (!submission) return R4XX(res, 404, "Submission not found.");

    const signedSubmission = await attachSignedUrlsDeep(submission);
    return R2XX(res, "Documents fetched successfully.", 200, {
      submissionId: submission._id,
      documents: signedSubmission?.documents || [],
    });
  }),

  replaceDocument: catchAsync(async (req, res) => {
    const userId = req.user;
    const submissionId = req.params.id;
    const docEntryId = req.params.docEntryId;
    const file = req.file;

    if (!file) return R4XX(res, 400, "file is required.");

    try {
      const replaced = await submissionDocumentService.replaceSubmissionDocument({
        submissionId,
        docEntryId,
        file,
        userId,
        workspaceId: req.workspaceId,
        organizationId: req.organizationId,
      });

      const hydratedSubmission = await SubmissionService.getSubmissionByKey(
        submissionId,
        req.workspaceId
      );
      const signedSubmission = await attachSignedUrlsDeep(hydratedSubmission);

      return R2XX(res, "Document replaced successfully. Extract fields when ready.", 200, {
        submission: signedSubmission,
        replaced,
      });
    } catch (err) {
      return sendServiceError(res, err);
    }
  }),

  deleteDocument: catchAsync(async (req, res) => {
    const userId = req.user;
    const submissionId = req.params.id;
    const docEntryId = req.params.docEntryId;

    try {
      const deleted = await submissionDocumentService.deleteSubmissionDocument({
        submissionId,
        docEntryId,
        userId,
        workspaceId: req.workspaceId,
      });

      const hydratedSubmission = await SubmissionService.getSubmissionByKey(
        submissionId,
        req.workspaceId
      );
      const signedSubmission = await attachSignedUrlsDeep(hydratedSubmission);

      return R2XX(res, "Document deleted successfully.", 200, {
        submission: signedSubmission,
        deleted,
      });
    } catch (err) {
      return sendServiceError(res, err);
    }
  }),
};

module.exports = SubmissionDocumentController;
