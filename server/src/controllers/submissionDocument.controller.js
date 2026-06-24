const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const SubmissionService = require("../services/submission.service");
const submissionDocumentService = require("../services/submissionDocument.service");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");

function sendServiceError(res, err) {
  const status = err?.statusCode || 400;
  return R4XX(res, status, err?.message || "Request failed.");
}

async function loadSignedDocuments(submissionId, workspaceId) {
  const submission = await SubmissionService.getSubmissionDocuments(submissionId, workspaceId);
  if (!submission) return null;
  const signed = await attachSignedUrlsDeep(submission);
  return {
    submissionId: signed._id,
    documents: signed.documents || [],
  };
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

    const documentSlice = await loadSignedDocuments(submissionId, req.workspaceId);
    if (!documentSlice) return R4XX(res, 404, "Submission not found.");

    const signedResults = await attachSignedUrlsDeep(results);

    return R2XX(res, "Documents uploaded successfully.", 200, {
      ...documentSlice,
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

      const documentSlice = await loadSignedDocuments(submissionId, req.workspaceId);
      if (!documentSlice) return R4XX(res, 404, "Submission not found.");

      return R2XX(res, "Fields extracted successfully.", 200, {
        ...documentSlice,
        ...result,
      });
    } catch (err) {
      return sendServiceError(res, err);
    }
  }),

  listDocuments: catchAsync(async (req, res) => {
    const submissionId = req.params.id;
    const documentSlice = await loadSignedDocuments(submissionId, req.workspaceId);
    if (!documentSlice) return R4XX(res, 404, "Submission not found.");

    return R2XX(res, "Documents fetched successfully.", 200, documentSlice);
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

      const documentSlice = await loadSignedDocuments(submissionId, req.workspaceId);
      if (!documentSlice) return R4XX(res, 404, "Submission not found.");

      return R2XX(res, "Document replaced successfully. Extract fields when ready.", 200, {
        ...documentSlice,
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

      const documentSlice = await loadSignedDocuments(submissionId, req.workspaceId);
      if (!documentSlice) return R4XX(res, 404, "Submission not found.");

      return R2XX(res, "Document deleted successfully.", 200, {
        ...documentSlice,
        deleted,
      });
    } catch (err) {
      return sendServiceError(res, err);
    }
  }),

  deleteGeneratedDocument: catchAsync(async (req, res) => {
    const userId = req.user;
    const submissionId = req.params.id;
    const generatedDocId = req.params.generatedDocId;

    try {
      const deleted = await submissionDocumentService.deleteGeneratedDocument({
        submissionId,
        generatedDocId,
        userId,
        workspaceId: req.workspaceId,
      });

      const submission = await SubmissionService.getGeneratedDocuments(submissionId, req.workspaceId);
      if (!submission) return R4XX(res, 404, "Submission not found.");
      const signed = await attachSignedUrlsDeep(submission);

      return R2XX(res, "Generated document deleted successfully.", 200, {
        submissionId: signed._id,
        generated_documents: signed.generated_documents || [],
        deleted,
      });
    } catch (err) {
      return sendServiceError(res, err);
    }
  }),
};

module.exports = SubmissionDocumentController;
