const mongoose = require("mongoose");
const { R4XX } = require("../Responses");
const organizationService = require("../services/organization.service");
const authorizationService = require("../services/authorization.service");

const requireOrganization = async (req, res, next) => {
  try {
    const raw = req.headers["x-organization-id"];
    const organizationId = typeof raw === "string" ? raw.trim() : "";
    if (!organizationId || !mongoose.isValidObjectId(organizationId)) {
      return R4XX(res, 400, "Active organization is required (X-Organization-Id header).");
    }

    const member = await organizationService.findMembership(req.user, organizationId);
    if (!member) {
      return R4XX(res, 403, "You are not a member of this organization.");
    }

    req.organizationId = organizationId;
    req.organizationMember = member;
    req.isOrgOwner = !!member.isOwner;
    req.orgRole = member.organizationRole?.slug || null;
    req.orgPermissions = await authorizationService.getOrganizationPermissionSet(member);
    next();
  } catch (err) {
    return R4XX(res, 500, "Organization validation failed.");
  }
};

module.exports = requireOrganization;
