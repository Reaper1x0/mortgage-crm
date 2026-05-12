const mongoose = require("mongoose");

const organizationMemberSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      index: true,
    },
    isOwner: {
      type: Boolean,
      default: false,
      index: true,
    },
    organizationRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organization_roles",
      required: true,
    },
  },
  { timestamps: true }
);

organizationMemberSchema.index({ user: 1, organization: 1 }, { unique: true });

const OrganizationMember = mongoose.model("organization_members", organizationMemberSchema);

module.exports = OrganizationMember;
