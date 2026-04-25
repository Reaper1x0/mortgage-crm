const mongoose = require("mongoose");

const workspaceMemberSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "workspaces",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Agent", "Viewer"],
      required: true,
    },
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ user: 1, workspace: 1 }, { unique: true });
workspaceMemberSchema.index({ user: 1, organization: 1 });

const WorkspaceMember = mongoose.model("workspace_members", workspaceMemberSchema);

module.exports = WorkspaceMember;
