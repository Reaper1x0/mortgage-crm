const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const organizationService = require("../services/organization.service");
const { Workspace, WorkspaceMember, OrganizationMember, OrganizationRole } = require("../models");
const { parsePagination } = require("../utils/pagination.utils");
const { sanitizers } = require("../sanitizers");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");
const { FileService } = require("../services/file.service");
const { PERMISSIONS, ORGANIZATION_KEYS, WORKSPACE_KEYS } = require("../authz/permissionCatalog");
const authorizationService = require("../services/authorization.service");
const WorkspaceRole = require("../models/workspaceRole.model");
const billingService = require("../services/billing.service");
const workspaceService = require("../services/workspace.service");

const orgKeySet = new Set(ORGANIZATION_KEYS);
const wsKeySet  = new Set(WORKSPACE_KEYS);

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const OrganizationController = {
  authzCatalog: catchAsync(async (_req, res) => {
    return R2XX(res, "Permission catalog", 200, { permissions: PERMISSIONS });
  }),

  authzEffective: catchAsync(async (req, res) => {
    const workspaceId = typeof req.query.workspaceId === "string" ? req.query.workspaceId.trim() : "";
    const effective = await authorizationService.getEffectiveForUser({
      userId: req.user,
      organizationId: req.organizationId,
      workspaceId: workspaceId || undefined,
    });
    return R2XX(res, "Effective permissions", 200, { effective });
  }),

  /* ── Organization-scope roles ───────────────────────────────────────────── */

  listOrganizationRoles: catchAsync(async (req, res) => {
    const roles = await OrganizationRole.find({ organization: req.organizationId }).sort({ kind: 1, name: 1 }).lean();
    return R2XX(res, "Organization roles", 200, { roles });
  }),

  createOrganizationRole: catchAsync(async (req, res) => {
    const { name, description = "", permissions = [] } = req.body;
    if (!name || !String(name).trim()) return R4XX(res, 400, "name is required");
    const validPerms = permissions.filter((k) => orgKeySet.has(k));
    const slug = slugify(name);
    if (!slug) return R4XX(res, 400, "Invalid role name");
    const existing = await OrganizationRole.findOne({ organization: req.organizationId, slug });
    if (existing) return R4XX(res, 409, "An organization role with this name already exists");
    const role = await OrganizationRole.create({
      organization: req.organizationId,
      name: String(name).trim(),
      slug,
      kind: "custom",
      description: String(description).trim(),
      permissions: validPerms,
    });
    return R2XX(res, "Organization role created", 201, { role });
  }),

  updateOrganizationRole: catchAsync(async (req, res) => {
    const role = await OrganizationRole.findOne({ _id: req.params.roleId, organization: req.organizationId });
    if (!role) return R4XX(res, 404, "Role not found");
    if (role.kind === "system") return R4XX(res, 403, "System roles cannot be modified");
    const { name, description, permissions } = req.body;
    if (name !== undefined) role.name = String(name).trim();
    if (description !== undefined) role.description = String(description).trim();
    if (Array.isArray(permissions)) role.permissions = permissions.filter((k) => orgKeySet.has(k));
    await role.save();
    return R2XX(res, "Organization role updated", 200, { role });
  }),

  deleteOrganizationRole: catchAsync(async (req, res) => {
    const role = await OrganizationRole.findOne({ _id: req.params.roleId, organization: req.organizationId }).lean();
    if (!role) return R4XX(res, 404, "Role not found");
    if (role.kind === "system") return R4XX(res, 403, "System roles cannot be deleted");
    const { OrganizationMember } = require("../models");
    const inUse = await OrganizationMember.exists({ organizationRole: role._id });
    if (inUse) return R4XX(res, 409, "Cannot delete a role that is assigned to one or more members");
    await OrganizationRole.deleteOne({ _id: role._id });
    return R2XX(res, "Organization role deleted", 200, {});
  }),

  /* ── Workspace-scope roles ───────────────────────────────────────────────── */

  listWorkspaceRoles: catchAsync(async (req, res) => {
    const roles = await WorkspaceRole.find({ organization: req.organizationId }).sort({ kind: 1, name: 1 }).lean();
    return R2XX(res, "Workspace roles", 200, { roles });
  }),

  createWorkspaceRole: catchAsync(async (req, res) => {
    const { name, description = "", permissions = [] } = req.body;
    if (!name || !String(name).trim()) return R4XX(res, 400, "name is required");
    const validPerms = permissions.filter((k) => wsKeySet.has(k));
    const slug = slugify(name);
    if (!slug) return R4XX(res, 400, "Invalid role name");
    const existing = await WorkspaceRole.findOne({ organization: req.organizationId, slug });
    if (existing) return R4XX(res, 409, "A workspace role with this name already exists");
    const role = await WorkspaceRole.create({
      organization: req.organizationId,
      name: String(name).trim(),
      slug,
      kind: "custom",
      description: String(description).trim(),
      permissions: validPerms,
    });
    return R2XX(res, "Workspace role created", 201, { role });
  }),

  updateWorkspaceRoleTemplate: catchAsync(async (req, res) => {
    const role = await WorkspaceRole.findOne({ _id: req.params.roleId, organization: req.organizationId });
    if (!role) return R4XX(res, 404, "Role not found");
    if (role.kind === "system") return R4XX(res, 403, "System roles cannot be modified");
    const { name, description, permissions } = req.body;
    if (name !== undefined) role.name = String(name).trim();
    if (description !== undefined) role.description = String(description).trim();
    if (Array.isArray(permissions)) role.permissions = permissions.filter((k) => wsKeySet.has(k));
    await role.save();
    return R2XX(res, "Workspace role updated", 200, { role });
  }),

  deleteWorkspaceRole: catchAsync(async (req, res) => {
    const role = await WorkspaceRole.findOne({ _id: req.params.roleId, organization: req.organizationId }).lean();
    if (!role) return R4XX(res, 404, "Role not found");
    if (role.kind === "system") return R4XX(res, 403, "System roles cannot be deleted");
    const { WorkspaceMember } = require("../models");
    const inUse = await WorkspaceMember.exists({ workspaceRole: role._id });
    if (inUse) return R4XX(res, 409, "Cannot delete a role that is assigned to one or more members");
    await WorkspaceRole.deleteOne({ _id: role._id });
    return R2XX(res, "Workspace role deleted", 200, {});
  }),

  listMine: catchAsync(async (req, res) => {
    const organizations = await organizationService.listForUser(req.user);
    return R2XX(res, "Organizations fetched successfully", 200, { organizations });
  }),

  onboardingSession: catchAsync(async (req, res) => {
    const organizations = await organizationService.listForUser(req.user);
    const preferredOrganizationId = typeof req.query.organizationId === "string" ? req.query.organizationId.trim() : "";
    let activeOrganization = null;
    if (preferredOrganizationId) {
      activeOrganization =
        organizations.find((o) => String(o.organizationId) === String(preferredOrganizationId)) || null;
    }
    if (!activeOrganization) activeOrganization = organizations[0] || null;

    if (!activeOrganization) {
      return R2XX(res, "Onboarding session resolved", 200, {
        session: {
          hasOrganization: false,
          organizationId: null,
          workspaceId: null,
          step: "organization",
          hasSubscriptionAccess: false,
          hasWorkspace: false,
          canManageBilling: false,
          canCreateWorkspace: false,
          accessReason: null,
        },
      });
    }

    const [billing, userWorkspaces, effective] = await Promise.all([
      billingService.getOrganizationBillingState(activeOrganization.organizationId),
      workspaceService.listWorkspacesForUser(req.user),
      authorizationService.getEffectiveForUser({
        userId: req.user,
        organizationId: activeOrganization.organizationId,
      }),
    ]);

    const orgWorkspaces = (userWorkspaces || []).filter(
      (w) => String(w?.organization?.organizationId || "") === String(activeOrganization.organizationId)
    );
    const firstWorkspace = orgWorkspaces[0] || null;
    const hasWorkspace = Boolean(firstWorkspace?.workspaceId);
    const hasSubscriptionAccess = Boolean(billing?.access?.canUseProduct);
    const orgPerms = new Set(effective?.organizationPermissions || []);
    const canManageBilling = Boolean(effective?.isOrgOwner || orgPerms.has("organization.billing.manage"));
    const canCreateWorkspace = Boolean(effective?.isOrgOwner || orgPerms.has("organization.workspaces.create"));

    let step = "organization";
    let accessReason = null;
    if (hasWorkspace) {
      step = "complete";
    } else if (!hasSubscriptionAccess) {
      if (canManageBilling) step = "billing";
      else {
        step = "access";
        accessReason = "billing_manage_required";
      }
    } else if (canCreateWorkspace) {
      step = "workspace";
    } else {
      step = "access";
      accessReason = "workspace_create_required";
    }

    return R2XX(res, "Onboarding session resolved", 200, {
      session: {
        hasOrganization: true,
        organizationId: activeOrganization.organizationId,
        organizationName: activeOrganization.name,
        organizationSlug: activeOrganization.slug,
        workspaceId: firstWorkspace?.workspaceId || null,
        step,
        hasSubscriptionAccess,
        hasWorkspace,
        canManageBilling,
        canCreateWorkspace,
        accessReason,
      },
    });
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
    const patch = {
      logoUrl: typeof req.body.logoUrl !== "undefined" ? req.body.logoUrl : undefined,
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
      sanitized.organizationRoleId = item.organizationRoleId;
      sanitized.organizationRoleSlug = item.organizationRoleSlug;
      sanitized.isOrgOwner = item.isOrgOwner;
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
    const orgRoleInput = req.body.organizationRoleId || req.body.organizationRole;
    const requestedOrgRoleId =
      (await organizationService.resolveOrganizationRoleId(req.organizationId, orgRoleInput)) ||
      (await organizationService.resolveOrganizationRoleId(req.organizationId, "member"));

    const nextRoleDoc = await OrganizationRole.findOne({
      _id: requestedOrgRoleId,
      organization: req.organizationId,
    }).lean();
    if (!nextRoleDoc) {
      return R4XX(res, 400, "Invalid organization role.");
    }

    if (nextRoleDoc.slug === "owner") {
      return R4XX(res, 403, "Cannot assign owner role through this endpoint.");
    }

    if (
      nextRoleDoc.slug === "admin" &&
      !req.isOrgOwner &&
      !req.orgPermissions.has("organization.members.promote_admin")
    ) {
      return R4XX(res, 403, "Only privileged administrators can assign elevated organization roles.");
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
      organizationRoleId: requestedOrgRoleId,
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
    })
      .populate({ path: "organizationRole", select: "slug" })
      .lean();
    if (!targetMembership) {
      return R4XX(res, 404, "Organization member not found.");
    }

    const nextRoleId =
      (await organizationService.resolveOrganizationRoleId(req.organizationId, req.body.organizationRoleId)) ||
      (await organizationService.resolveOrganizationRoleId(req.organizationId, req.body.role));

    const nextRoleDoc = await OrganizationRole.findOne({
      _id: nextRoleId,
      organization: req.organizationId,
    }).lean();
    if (!nextRoleDoc) {
      return R4XX(res, 400, "Invalid organization role.");
    }

    const roleStats = await organizationService.getRoleStats(req.organizationId);
    const policy = organizationService.validateRoleUpdatePolicy({
      actorUserId: req.user,
      targetUserId: req.params.userId,
      targetIsOwner: !!targetMembership.isOwner,
      targetOrgRoleSlug: targetMembership.organizationRole?.slug,
      nextOrgRoleSlug: nextRoleDoc.slug,
      actorHasUpdate: req.orgPermissions.has("organization.members.update"),
      actorHasPromoteAdmin: req.orgPermissions.has("organization.members.promote_admin"),
      roleStats,
    });
    if (!policy.ok) return R4XX(res, policy.status || 400, policy.message || "Role update is not allowed.");

    const membership = await organizationService.updateOrganizationMemberRole({
      organizationId: req.organizationId,
      userId: req.params.userId,
      organizationRoleId: nextRoleId,
    });
    if (!membership) {
      return R4XX(res, 404, "Organization member not found.");
    }
    return R2XX(res, "Organization role updated successfully", 200, {
      membership: membership
        ? {
            user: membership.user,
            organization: membership.organization,
            organizationRoleId: membership.organizationRole?._id || membership.organizationRole,
            organizationRoleSlug: membership.organizationRole?.slug,
          }
        : null,
    });
  }),

  updateMemberWorkspaceRole: catchAsync(async (req, res) => {
    const workspace = await Workspace.findOne({
      _id: req.params.workspaceId,
      organization: req.organizationId,
    })
      .select("_id")
      .lean();
    if (!workspace) {
      return R4XX(res, 404, "Workspace not found in this organization.");
    }

    const wsRoleId =
      (await organizationService.resolveWorkspaceRoleId(req.organizationId, req.body.workspaceRoleId)) ||
      (await organizationService.resolveWorkspaceRoleId(req.organizationId, req.body.role));

    if (!wsRoleId) {
      return R4XX(res, 400, "Invalid workspace role.");
    }

    await WorkspaceMember.updateOne(
      {
        user: req.params.userId,
        workspace: req.params.workspaceId,
        organization: req.organizationId,
      },
      {
        $set: {
          user: req.params.userId,
          workspace: req.params.workspaceId,
          organization: req.organizationId,
          workspaceRole: wsRoleId,
        },
      },
      { upsert: true }
    );

    const membership = await WorkspaceMember.findOne({
      user: req.params.userId,
      workspace: req.params.workspaceId,
      organization: req.organizationId,
    })
      .populate({ path: "workspaceRole", select: "slug name" })
      .lean();

    return R2XX(res, "Workspace role updated successfully", 200, {
      membership: membership
        ? {
            user: membership.user,
            workspace: membership.workspace,
            workspaceRoleId: membership.workspaceRole?._id || membership.workspaceRole,
            workspaceRoleSlug: membership.workspaceRole?.slug,
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
    })
      .populate({ path: "organizationRole", select: "slug" })
      .lean();
    if (!targetMembership) {
      return R4XX(res, 404, "Organization member not found.");
    }

    const roleStats = await organizationService.getRoleStats(req.organizationId);
    const policy = organizationService.validateMemberRemovalPolicy({
      actorUserId,
      targetUserId,
      targetIsOwner: !!targetMembership.isOwner,
      targetOrgRoleSlug: targetMembership.organizationRole?.slug,
      actorHasRemove: req.orgPermissions.has("organization.members.remove"),
      actorHasPromoteAdmin: req.orgPermissions.has("organization.members.promote_admin"),
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
