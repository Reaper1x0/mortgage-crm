const { R2XX, R4XX } = require("../Responses");
const SubmissionService = require("../services/submission.service");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const AuditTrailService = require("../services/auditTrail.service");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");

const SubmissionController = {
  // Create a new Submission
  createSubmission: catchAsync(async (req, res) => {
    const user = req.user;
    const data = req.body;
    let submission;
    try {
      submission = await SubmissionService.createSubmission(data, user, req.workspaceId);
    } catch (err) {
      if (err?.message === "Lead not found in this workspace") {
        return R4XX(res, 404, "Selected lead not found");
      }
      throw err;
    }
    
    // Log audit trail
    await AuditTrailService.log({
      entity_type: "submission",
      entity_id: submission._id,
      user_id: user,
      workspace: req.workspaceId,
      action: "submission_created",
      action_details: {
        submission_id: submission._id,
        submission_name: submission.submission_name,
        legal_name: submission.legal_name || null,
      },
      submission_id: submission._id,
    });
    
    return R2XX(res, "Submission created successfully", 201, { submission });
  }),
  updateSubmission: catchAsync(async (req, res) => {
    const data = req.body;
    const { key } = req.params;
    const userId = req.user;
    const submission = await SubmissionService.updateSubmission(key, data, req.workspaceId);
    
    if (!submission) {
      return R4XX(res, 404, "Submission not found");
    }
    
    // Log audit trail
    await AuditTrailService.log({
      entity_type: "submission",
      entity_id: submission._id,
      user_id: userId,
      workspace: req.workspaceId,
      action: "submission_updated",
      action_details: {
        submission_id: submission._id,
        submission_name: submission.submission_name,
        updated_fields: Object.keys(data),
      },
      submission_id: submission._id,
    });
    
    return R2XX(res, "Submission updated successfully", 200, { submission });
  }),

  // Get all Submissions (all users can see all submissions)
  getAllSubmissions: catchAsync(async (req, res) => {
    const { page, limit, sort } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: [
        "createdAt",
        "updatedAt",
        "submission_name",
        "legal_name",
      ],
    });

    const { items, pagination } = await SubmissionService.getAllSubmissions({
      page,
      limit,
      sort,
      workspaceId: req.workspaceId,
    });

    const signedItems = await attachSignedUrlsDeep(items);
    return R2XX(res, "Submissions fetched successfully", 200, {
      submissions: signedItems,
      pagination,
    });
  }),

  // Get a Submission by its key (all users can view any submission)
  getSubmissionByKey: catchAsync(async (req, res) => {
    const { key } = req.params;
    const submission = await SubmissionService.getSubmissionByKey(key, req.workspaceId);

    if (!submission) {
      return R4XX(res, 404, "Submission not found");
    }

    const signedSubmission = await attachSignedUrlsDeep(submission);
    return R2XX(res, "Submission fetched successfully", 200, {
      submission: signedSubmission,
    });
  }),

  getSubmissionSummary: catchAsync(async (req, res) => {
    const { id } = req.params;
    const summary = await SubmissionService.getSubmissionSummary(id, req.workspaceId);

    if (!summary) {
      return R4XX(res, 404, "Submission not found");
    }

    return R2XX(res, "Submission summary fetched successfully", 200, { summary });
  }),

  getSubmissionIdentity: catchAsync(async (req, res) => {
    const { id } = req.params;
    const submission = await SubmissionService.getSubmissionIdentity(id, req.workspaceId);

    if (!submission) {
      return R4XX(res, 404, "Submission not found");
    }

    const signed = await attachSignedUrlsDeep(submission);
    return R2XX(res, "Submission identity fetched successfully", 200, {
      submissionId: signed._id,
      legal_name: signed.legal_name ?? null,
      identity_document: signed.identity_document ?? null,
    });
  }),

  listGeneratedDocuments: catchAsync(async (req, res) => {
    const { id } = req.params;
    const submission = await SubmissionService.getGeneratedDocuments(id, req.workspaceId);

    if (!submission) {
      return R4XX(res, 404, "Submission not found");
    }

    const signed = await attachSignedUrlsDeep(submission);
    return R2XX(res, "Generated documents fetched successfully", 200, {
      submissionId: signed._id,
      generated_documents: signed.generated_documents || [],
    });
  }),
};

module.exports = SubmissionController;
