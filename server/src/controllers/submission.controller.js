const { R2XX, R4XX } = require("../Responses");
const SubmissionService = require("../services/submission.service");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");

const SubmissionController = {
  // Create a new Submission
  createSubmission: catchAsync(async (req, res) => {
    const user = req.user;
    const data = req.body;
    const submission = await SubmissionService.createSubmission(data, user);
    return R2XX(res, "Submission created successfully", 201, { submission });
  }),
  updateSubmission: catchAsync(async (req, res) => {
    const user = req.user;
    const data = req.body;
    const { key } = req.params;
    const submission = await SubmissionService.updateSubmission(
      key,
      data,
      user
    );
    return R2XX(res, "Submission created successfully", 201, { submission });
  }),

  // Get all Submissions
  getAllSubmissions: catchAsync(async (req, res) => {
    const userId = req.user; // IMPORTANT: use the id
    if (!userId) {
      throw new HTTPException(401, "Unauthorized");
    }

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

    const { items, pagination } = await SubmissionService.getAllSubmissions(
      userId,
      {
        page,
        limit,
        sort,
      }
    );

    return R2XX(res, "Submissions fetched successfully", 200, {
      submissions: items,
      pagination,
    });
  }),

  // Get a Submission by its key
  getSubmissionByKey: catchAsync(async (req, res) => {
    const user = req.user;
    const { key } = req.params;
    const submission = await SubmissionService.getSubmissionByKey(key, user);

    if (!submission) {
      return R4XX(res, 404, "Submission not found");
    }

    return R2XX(res, "Submission fetched successfully", 200, { submission });
  }),
};

module.exports = SubmissionController;
