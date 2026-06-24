// services/submission.service.js
const mongoose = require("mongoose");
const { Submission, Lead } = require("../models");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

const UPLOADER_POPULATE = {
  path: "uploaded_by",
  select: "fullName email username",
  populate: {
    path: "profile_picture",
    select: "url storage_path display_name",
  },
};

const GENERATED_BY_POPULATE = {
  path: "generated_documents.generated_by",
  select: "fullName email username",
  populate: {
    path: "profile_picture",
    select: "url storage_path display_name",
  },
};

const SubmissionService = {
  // ✅ Create a new Submission (always bind to this userId)
  createSubmission: async (data, userId, workspaceId) => {
    const payload = { ...data, userId, workspace: workspaceId }; // force owner + workspace
    const sourceLeadId = data?.sourceLead ? String(data.sourceLead) : null;

    if (sourceLeadId) {
      const lead = await Lead.findOne({ _id: sourceLeadId, workspace: workspaceId }).lean();
      if (!lead) {
        throw new Error("Lead not found in this workspace");
      }
      payload.sourceLead = lead._id;
      if (!payload.submission_name || !String(payload.submission_name).trim()) {
        payload.submission_name = lead.fullName;
      }
      if (!payload.legal_name || !String(payload.legal_name).trim()) {
        payload.legal_name = lead.fullName;
      }
    }

    const doc = await Submission.create(payload);
    return doc;
  },

  // ✅ Get all Submissions (no user filtering - all users can see all submissions)
  getAllSubmissions: async (opts = {}) => {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      workspaceId,
    } = opts;

    return mongoosePaginate({
      model: Submission,
      filter: { workspace: workspaceId },
      sort,
      page,
      limit,
      lean: true,
      populate: {
        path: "sourceLead",
        select: "fullName email phone company source",
      },
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
  getSubmissionByKey: async (key, workspaceId) => {
    return Submission.findOne({ _id: key, workspace: workspaceId })
      .populate({
        path: "sourceLead",
        select: "fullName email phone company source",
      })
      .populate({
        path: "identity_document.file",
        populate: {
          path: "uploaded_by",
          select: "fullName email username",
          populate: {
            path: "profile_picture",
            select: "url storage_path display_name",
          },
        },
      })
      .populate({
        path: "documents.document",
        populate: {
          path: "uploaded_by",
          select: "fullName email username",
          populate: {
            path: "profile_picture",
            select: "url storage_path display_name"
          }
        }
      })
      .populate("generated_documents.file_id")
      .populate({
        path: "generated_documents.generated_by",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      });
  },

  getSubmissionSummary: async (id, workspaceId) => {
    return Submission.findOne({ _id: id, workspace: workspaceId })
      .select("_id submission_name legal_name status createdAt updatedAt sourceLead")
      .populate({
        path: "sourceLead",
        select: "fullName email phone company source",
      })
      .lean();
  },

  getSubmissionIdentity: async (id, workspaceId) => {
    return Submission.findOne({ _id: id, workspace: workspaceId })
      .select("_id legal_name identity_document")
      .populate({
        path: "identity_document.file",
        populate: UPLOADER_POPULATE,
      });
  },

  getSubmissionDocuments: async (id, workspaceId) => {
    return Submission.findOne({ _id: id, workspace: workspaceId })
      .select("_id documents")
      .populate({
        path: "documents.document",
        populate: UPLOADER_POPULATE,
      });
  },

  getGeneratedDocuments: async (id, workspaceId) => {
    return Submission.findOne({ _id: id, workspace: workspaceId })
      .select("_id generated_documents")
      .populate("generated_documents.file_id")
      .populate(GENERATED_BY_POPULATE);
  },

  // Update submission (Admin/Agent can update any submission)
  updateSubmission: async (submissionId, data, workspaceId) => {
    const payload = { ...data };

    return Submission.findOneAndUpdate(
      { _id: submissionId, workspace: workspaceId },
      { $set: payload },
      { new: true }
    )
      .populate({
        path: "sourceLead",
        select: "fullName email phone company source",
      })
      .populate({
        path: "identity_document.file",
        populate: {
          path: "uploaded_by",
          select: "fullName email username",
          populate: {
            path: "profile_picture",
            select: "url storage_path display_name",
          },
        },
      })
      .populate({
        path: "documents.document",
        populate: {
          path: "uploaded_by",
          select: "fullName email username",
          populate: {
            path: "profile_picture",
            select: "url storage_path display_name"
          }
        }
      })
      .populate("generated_documents.file_id")
      .populate({
        path: "generated_documents.generated_by",
        select: "fullName email username",
        populate: {
          path: "profile_picture",
          select: "url storage_path display_name"
        }
      });
  },
};

module.exports = SubmissionService;
