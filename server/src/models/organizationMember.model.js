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
    role: {
      type: String,
      enum: ["Owner", "Admin", "Member", "Viewer"],
      required: true,
      default: "Member",
    },
  },
  { timestamps: true }
);

organizationMemberSchema.index({ user: 1, organization: 1 }, { unique: true });

const OrganizationMember = mongoose.model("organization_members", organizationMemberSchema);

module.exports = OrganizationMember;
