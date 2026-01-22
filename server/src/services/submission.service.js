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

  // ✅ Get all Submissions for this user only
  getAllSubmissions: async (userId, opts = {}) => {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
    } = opts;

    return mongoosePaginate({
      model: Submission,
      filter: { userId },
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
   */
  getSubmissionByKey: async (key, userId) => {
    return Submission.findOne({ _id: key, userId }).populate("documents.document");
  },

  // (Optional but usually needed)
  updateSubmission: async (submissionId, data, userId) => {
    const payload = { ...data };

    return Submission.findOneAndUpdate(
      { _id: submissionId, userId },
      { $set: payload },
      { new: true }
    );
  },
};

module.exports = SubmissionService;
