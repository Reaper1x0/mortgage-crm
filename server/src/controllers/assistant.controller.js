const { catchAsync } = require("../utils");
const { R2XX, R4XX } = require("../Responses");
const { Submission } = require("../models");
const assistantService = require("../services/rag/assistant.service");
const documentIndexService = require("../services/rag/documentIndex.service");

const AssistantController = {
  query: catchAsync(async (req, res) => {
    const submissionId = req.params.id;
    const { question, fileIds } = req.body || {};

    const submission = await Submission.findOne({ _id: submissionId, workspace: req.workspaceId });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    if (!question || !String(question).trim()) {
      return R4XX(res, 400, "question is required.");
    }

    const normalizedFileIds = Array.isArray(fileIds)
      ? fileIds.map(String).filter(Boolean)
      : fileIds
        ? [String(fileIds)]
        : null;

    const result = await assistantService.answerQuestion({
      workspaceId: req.workspaceId,
      submissionId,
      question: String(question).trim(),
      userId: req.user,
      fileIds: normalizedFileIds,
    });

    return R2XX(res, "Answer generated.", 200, result);
  }),

  getStatus: catchAsync(async (req, res) => {
    const submissionId = req.params.id;

    const submission = await Submission.findOne({ _id: submissionId, workspace: req.workspaceId });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    const status = await documentIndexService.getSubmissionIndexStatus({
      submissionId,
      workspaceId: req.workspaceId,
    });

    return R2XX(res, "Assistant index status fetched.", 200, status);
  }),

  reindex: catchAsync(async (req, res) => {
    const submissionId = req.params.id;

    const submission = await Submission.findOne({ _id: submissionId, workspace: req.workspaceId });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    const results = await documentIndexService.reindexSubmission({
      submissionId,
      workspaceId: req.workspaceId,
    });

    const status = await documentIndexService.getSubmissionIndexStatus({
      submissionId,
      workspaceId: req.workspaceId,
    });

    return R2XX(res, "Reindex completed.", 200, { results, status });
  }),

  indexDocument: catchAsync(async (req, res) => {
    const submissionId = req.params.id;
    const fileId = req.params.fileId;

    const submission = await Submission.findOne({ _id: submissionId, workspace: req.workspaceId });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    try {
      const result = await documentIndexService.indexDocumentByFileId({
        submissionId,
        workspaceId: req.workspaceId,
        fileId,
      });

      const status = await documentIndexService.getSubmissionIndexStatus({
        submissionId,
        workspaceId: req.workspaceId,
      });

      return R2XX(res, "Document indexed successfully.", 200, { result, status });
    } catch (err) {
      return R4XX(res, 400, err?.message || "Failed to index document.");
    }
  }),
};

module.exports = AssistantController;
