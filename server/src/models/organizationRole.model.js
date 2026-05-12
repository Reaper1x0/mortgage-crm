const mongoose = require("mongoose");

const organizationRoleSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    /** "system" = built-in owner role; "custom" = created by owner/admin */
    kind: { type: String, enum: ["system", "custom"], default: "custom" },
    description: { type: String, default: "" },
    /** Array of permission key strings from the org catalog */
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

organizationRoleSchema.index({ organization: 1, slug: 1 }, { unique: true });

const OrganizationRole = mongoose.model("organization_roles", organizationRoleSchema);

module.exports = OrganizationRole;
