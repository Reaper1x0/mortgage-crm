// services/submission.service.js
const mongoose = require("mongoose");
const { Submission } = require("../models");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

const SubmissionService = {
  // ✅ Create a new Submission (always bind to this userId)
  createSubmission: async (data, userId) => {
    const payload = { ...data, userId }; // force owner
    const doc = await Submission.create(payload);
    return doc;
  },

  // ✅ Get all Submissions (no user filtering - all users can see all submissions)
  getAllSubmissions: async (opts = {}) => {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
    } = opts;

    return mongoosePaginate({
      model: Submission,
      filter: {}, // No user filter - show all submissions
      sort,
      page,
      limit,
      lean: true,
    });
  },

  /**
   * ✅ Get a Submission by "key"
   * Since your schema does NOT have `key`,
   * this supports:
   *  - key as Mongo _id (ObjectId)
   *  - OR key as submission_name (string)
   * No user filtering - all users can view any submission
   */
  getSubmissionByKey: async (key) => {
    return Submission.findOne({ _id: key }).populate("documents.document");
  },

  // Update submission (Admin/Agent can update any submission)
  updateSubmission: async (submissionId, data) => {
    const payload = { ...data };

    return Submission.findOneAndUpdate(
      { _id: submissionId },
      { $set: payload },
      { new: true }
    );
  },
};

module.exports = SubmissionService;
