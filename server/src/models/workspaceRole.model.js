const mongoose = require("mongoose");

const workspaceRoleSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    /** "system" = default roles auto-created at org setup; "custom" = user-created */
    kind: { type: String, enum: ["system", "custom"], default: "custom" },
    description: { type: String, default: "" },
    /** Array of permission key strings from the workspace catalog */
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

workspaceRoleSchema.index({ organization: 1, slug: 1 }, { unique: true });

const WorkspaceRole = mongoose.model("workspace_roles", workspaceRoleSchema);

module.exports = WorkspaceRole;
