const mongoose = require("mongoose");

const workspaceSchema = mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: true,
      trim: true,
    },
    slug: {
      type: mongoose.Schema.Types.String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  { timestamps: true }
);

const Workspace = mongoose.model("workspaces", workspaceSchema);

module.exports = Workspace;
