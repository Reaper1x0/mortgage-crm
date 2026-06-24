const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const workspaceService = require("../services/workspace.service");
const organizationService = require("../services/organization.service");
const authorizationService = require("../services/authorization.service");
const { FileService } = require("../services/file.service");
const entitlementService = require("../billing/entitlement.service");
const subscriptionService = require("../billing/subscription.service");

const WorkspaceController = {
  listMine: catchAsync(async (req, res) => {
    const { organizations, workspaces } = await workspaceService.listMembershipTreeForUser(req.user);
    return R2XX(res, "Workspaces fetched successfully", 200, { organizations, workspaces });
  }),

  create: catchAsync(async (req, res) => {
    const { name, organizationId, organizationName } = req.body;
    let targetOrganizationId = req.organizationId || organizationId;
    if (!targetOrganizationId) {
      const memberships = await organizationService.listForUser(req.user);
      if (memberships.length > 0) {
        targetOrganizationId = memberships[0].organizationId;
      }
    }
    if (targetOrganizationId) {
      const orgMember = await organizationService.findMembership(req.user, targetOrganizationId);
      if (!orgMember) {
        return R4XX(res, 403, "You are not a member of the selected organization.");
      }

      const effective = await authorizationService.getEffectiveForUser({
        userId: req.user,
        organizationId: targetOrganizationId,
      });
      const canCreateWorkspace =
        effective?.isOrgOwner || (effective?.organizationPermissions || []).includes("organization.workspaces.create");
      if (!canCreateWorkspace) {
        return R4XX(res, 403, "You do not have permission to create workspaces in this organization.", {
          code: "WORKSPACE_CREATE_FORBIDDEN",
          organizationId: targetOrganizationId,
        });
      }

      const subscription = await entitlementService.getSubscriptionWithPlan(targetOrganizationId);
      if (!subscriptionService.canAccessOrganization(subscription)) {
        return R4XX(res, 402, "Active subscription required before creating a workspace.", {
          code: "SUBSCRIPTION_REQUIRED",
          organizationId: targetOrganizationId,
        });
      }
      const limitCheck = await entitlementService.assertWithinLimit({
        organizationId: targetOrganizationId,
        featureKey: "max_workspaces_per_organization",
        incrementBy: 1,
      });
      if (!limitCheck.ok) {
        const status = limitCheck.code === "FEATURE_NOT_AVAILABLE" ? 403 : 429;
        const reason =
          limitCheck.code === "FEATURE_NOT_AVAILABLE"
            ? "Workspaces are not available in your current plan."
            : "Workspace limit reached for your current plan.";
        return R4XX(res, status, reason, limitCheck);
      }
    }
    const workspace = await workspaceService.createWorkspaceAsUser({
      userId: req.user,
      name,
      organizationId: targetOrganizationId,
      organizationName,
    });
    return R2XX(res, "Workspace created successfully", 201, {
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        organizationId: workspace.organization,
      },
    });
  }),

  updateBranding: catchAsync(async (req, res) => {
    const patch = {
      logoUrl: req.body.logoUrl || undefined,
    };

    if (req.file) {
      const logo = await FileService.createFromUpload(
        {
          file: req.file,
          displayName: `workspace-logo-${req.workspaceId}`,
          folder: `uploads/branding/workspaces/${req.workspaceId}`,
          meta: {
            type: "branding_logo",
            workspaceId: req.workspaceId,
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

    const workspace = await workspaceService.updateBranding(req.workspaceId, patch);
    return R2XX(res, "Workspace branding updated successfully", 200, {
      workspace: {
        _id: workspace._id,
        branding: workspace.branding,
      },
    });
  }),
};

module.exports = WorkspaceController;
