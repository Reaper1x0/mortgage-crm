const mongoose = require("mongoose");

const brandingSchema = new mongoose.Schema(
  {
    logoUrl: { type: String, trim: true, default: null },
    logoFile: { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null },
  },
  { _id: false }
);

const workspaceSchema = mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      index: true,
    },
    name: {
      type: mongoose.Schema.Types.String,
      required: true,
      trim: true,
    },
    slug: {
      type: mongoose.Schema.Types.String,
      required: true,
      trim: true,
      lowercase: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    branding: {
      type: brandingSchema,
      default: null,
    },
  },
  { timestamps: true }
);

workspaceSchema.index({ organization: 1, slug: 1 }, { unique: true });

const Workspace = mongoose.model("workspaces", workspaceSchema);

module.exports = Workspace;
