const mongoose = require("mongoose");
const { ORGANIZATION_SCOPE, WORKSPACE_SCOPE } = require("../authz/permissionCatalog");

const itemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const permissionGroupSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: [ORGANIZATION_SCOPE, WORKSPACE_SCOPE],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    kind: { type: String, enum: ["system", "custom"], default: "custom" },
    description: { type: String, default: "" },
    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true }
);

permissionGroupSchema.index({ organization: 1, scope: 1, slug: 1 }, { unique: true });

const PermissionGroup = mongoose.model("permission_groups", permissionGroupSchema);

module.exports = PermissionGroup;
