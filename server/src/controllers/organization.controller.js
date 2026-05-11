const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const organizationService = require("../services/organization.service");
const { Workspace, WorkspaceMember, OrganizationMember } = require("../models");
const { parsePagination } = require("../utils/pagination.utils");
const { sanitizers } = require("../sanitizers");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");
const { FileService } = require("../services/file.service");

const OrganizationController = {
  listMine: catchAsync(async (req, res) => {
    const organizations = await organizationService.listForUser(req.user);
    return R2XX(res, "Organizations fetched successfully", 200, { organizations });
  }),

  create: catchAsync(async (req, res) => {
    const organization = await organizationService.createOrganization({
      name: req.body.name,
      createdBy: req.user,
    });
    return R2XX(res, "Organization created successfully", 201, {
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
    });
  }),

  updateBranding: catchAsync(async (req, res) => {
    const parseMaybeJson = (value) => {
      if (!value) return undefined;
      if (typeof value === "object") return value;
      try {
        return JSON.parse(value);
      } catch (_err) {
        return undefined;
      }
    };

    const patch = {
      primaryColor: req.body.primaryColor,
      secondaryColor: req.body.secondaryColor,
      themeMode: req.body.themeMode,
      logoUrl: typeof req.body.logoUrl !== "undefined" ? req.body.logoUrl : undefined,
      customVars: parseMaybeJson(req.body.customVars),
    };

    if (String(req.body.removeLogo || "").toLowerCase() === "true") {
      patch.logoUrl = null;
      patch.logoFile = null;
    }

    if (req.file) {
      const logo = await FileService.createFromUpload(
        {
          file: req.file,
          displayName: `organization-logo-${req.organizationId}`,
          folder: `uploads/branding/organizations/${req.organizationId}`,
          meta: {
            type: "branding_logo",
            organizationId: req.organizationId,
            skipAuditLog: true,
          },
        },
        req.user,
        req.user
      );
      patch.logoFile = logo._id;
      patch.logoUrl = logo.url || null;
    }

    const organization = await organizationService.updateBranding(req.organizationId, patch);
    return R2XX(res, "Organization branding updated successfully", 200, {
      organization: {
        _id: organization._id,
        branding: organization.branding,
      },
    });
  }),

  updateProfile: catchAsync(async (req, res) => {
    const toNullOrValue = (v) => (typeof v === "undefined" ? undefined : v === "" ? null : v);
    const profilePatch = {
      name: toNullOrValue(req.body.name),
      legalName: toNullOrValue(req.body.legalName),
      website: toNullOrValue(req.body.website),
      industry: toNullOrValue(req.body.industry),
      size: toNullOrValue(req.body.size),
      contactEmail: toNullOrValue(req.body.contactEmail),
      phone: toNullOrValue(req.body.phone),
      address: {
        line1: toNullOrValue(req.body.addressLine1),
        line2: toNullOrValue(req.body.addressLine2),
        city: toNullOrValue(req.body.addressCity),
        state: toNullOrValue(req.body.addressState),
        postalCode: toNullOrValue(req.body.addressPostalCode),
        country: toNullOrValue(req.body.addressCountry),
      },
      settings: {
        timezone: toNullOrValue(req.body.settingsTimezone),
        locale: toNullOrValue(req.body.settingsLocale),
        currency: toNullOrValue(req.body.settingsCurrency),
      },
    };

    const organization = await organizationService.updateProfile(req.organizationId, profilePatch);
    return R2XX(res, "Organization profile updated successfully", 200, {
      organization: {
        _id: organization._id,
        name: organization.name,
        legalName: organization.legalName,
        website: organization.website,
        industry: organization.industry,
        size: organization.size,
        contactEmail: organization.contactEmail,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
      },
    });
  }),

  listMembers: catchAsync(async (req, res) => {
    const { page, limit, sortBy, sortOrder } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "fullName", "email", "username", "role"],
    });

    const { items, pagination } = await organizationService.listMembersPaginated({
      organizationId: req.organizationId,
      page,
      limit,
      sortBy,
      sortOrder,
      role: req.query.role,
      search: req.query.search,
    });

    const users = items.map((item) => {
      const sanitized = sanitizers.userSanitizer(item);
      sanitized.organizationRole = item.organizationRole;
      sanitized.workspaceMemberships = item.workspaceMemberships || [];
      return sanitized;
    });
    await attachSignedUrlsDeep(users);
    const workspaces = await organizationService.listWorkspacesForOrganization(req.organizationId);
    const roleStats = await organizationService.getRoleStats(req.organizationId);

    return R2XX(res, "Organization members fetched successfully", 200, {
      users,
      workspaces,
      roleStats,
      pagination,
    });
  }),

  addMember: catchAsync(async (req, res) => {
    const requestedOrgRole = req.body.organizationRole || "Member";
    if (req.orgRole !== "Owner" && ["Owner", "Admin"].includes(requestedOrgRole)) {
      return R4XX(res, 403, "Only organization owners can assign owner or admin roles.");
    }

    const workspaceRoles = Array.isArray(req.body.workspaceRoles) ? req.body.workspaceRoles : [];
    const workspaceIds = workspaceRoles.map((entry) => String(entry.workspaceId));
    if (workspaceIds.length > 0) {
      const available = await Workspace.find({
        _id: { $in: workspaceIds },
        organization: req.organizationId,
      })
        .select("_id")
        .lean();
      const validIds = new Set(available.map((row) => String(row._id)));
      const hasInvalid = workspaceIds.some((workspaceId) => !validIds.has(workspaceId));
      if (hasInvalid) {
        return R4XX(res, 400, "One or more workspace assignments do not belong to this organization.");
      }
    }

    const result = await organizationService.addMemberWithAccess({
      organizationId: req.organizationId,
      fullName: req.body.fullName,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      organizationRole: requestedOrgRole,
      workspaceRoles,
    });

    if (!result.ok) {
      if (result.code === "USERNAME_TAKEN") {
        return R4XX(res, 409, "Username already exists.");
      }
      if (result.code === "PASSWORD_REQUIRED") {
        return R4XX(res, 400, "Password is required (minimum 8 characters) for new users.");
      }
      if (result.code === "PLAN_LIMIT_REACHED" && result.limitError) {
        const status = result.limitError.code === "FEATURE_NOT_AVAILABLE" ? 403 : 429;
        const feature = result.limitError.feature || "resource";
        const reason =
          result.limitError.code === "FEATURE_NOT_AVAILABLE"
            ? `${feature} is not available in your current plan.`
            : `${feature} limit reached for your current plan.`;
        return R4XX(res, status, reason, result.limitError);
      }
      return R4XX(res, 400, "Unable to add organization member.");
    }

    return R2XX(res, "Organization member added successfully", 201, {
      userId: result.user._id,
    });
  }),

  updateMemberRole: catchAsync(async (req, res) => {
    const targetMembership = await OrganizationMember.findOne({
      organization: req.organizationId,
      user: req.params.userId,
    }).lean();
    if (!targetMembership) {
      return R4XX(res, 404, "Organization member not found.");
    }

    const roleStats = await organizationService.getRoleStats(req.organizationId);
    const policy = organizationService.validateRoleUpdatePolicy({
      actorRole: req.orgRole,
      actorUserId: req.user,
      targetUserId: req.params.userId,
      targetRole: targetMembership.role,
      nextRole: req.body.role,
      roleStats,
    });
    if (!policy.ok) return R4XX(res, policy.status || 400, policy.message || "Role update is not allowed.");

    const membership = await organizationService.updateOrganizationMemberRole({
      organizationId: req.organizationId,
      userId: req.params.userId,
      role: req.body.role,
    });
    if (!membership) {
      return R4XX(res, 404, "Organization member not found.");
    }
    return R2XX(res, "Organization role updated successfully", 200, {
      membership: membership
        ? {
            user: membership.user,
            organization: membership.organization,
            role: membership.role,
          }
        : null,
    });
  }),

  updateWorkspaceRole: catchAsync(async (req, res) => {
    const workspace = await Workspace.findOne({
      _id: req.params.workspaceId,
      organization: req.organizationId,
    })
      .select("_id")
      .lean();
    if (!workspace) {
      return R4XX(res, 404, "Workspace not found in this organization.");
    }

    const membership = await WorkspaceMember.findOneAndUpdate(
      {
        user: req.params.userId,
        workspace: req.params.workspaceId,
        organization: req.organizationId,
      },
      {
        role: req.body.role,
      },
      { new: true }
    );
    if (!membership) {
      return R4XX(res, 404, "Workspace member not found.");
    }

    return R2XX(res, "Workspace role updated successfully", 200, {
      membership: membership
        ? {
            user: membership.user,
            workspace: membership.workspace,
            role: membership.role,
          }
        : null,
    });
  }),

  removeWorkspaceAccess: catchAsync(async (req, res) => {
    await WorkspaceMember.findOneAndDelete({
      user: req.params.userId,
      workspace: req.params.workspaceId,
      organization: req.organizationId,
    });
    return R2XX(res, "Workspace access removed successfully", 200);
  }),

  removeMember: catchAsync(async (req, res) => {
    const targetUserId = String(req.params.userId);
    const actorUserId = String(req.user);
    const targetMembership = await OrganizationMember.findOne({
      organization: req.organizationId,
      user: targetUserId,
    }).lean();
    if (!targetMembership) {
      return R4XX(res, 404, "Organization member not found.");
    }

    const roleStats = await organizationService.getRoleStats(req.organizationId);
    const policy = organizationService.validateMemberRemovalPolicy({
      actorRole: req.orgRole,
      actorUserId,
      targetUserId,
      targetRole: targetMembership.role,
      roleStats,
    });
    if (!policy.ok) return R4XX(res, policy.status || 400, policy.message || "Member removal is not allowed.");

    await Promise.all([
      OrganizationMember.deleteOne({ organization: req.organizationId, user: targetUserId }),
      WorkspaceMember.deleteMany({ organization: req.organizationId, user: targetUserId }),
    ]);

    return R2XX(res, "Organization member removed successfully", 200);
  }),
};

module.exports = OrganizationController;
