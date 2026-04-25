const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const workspaceService = require("../services/workspace.service");
const organizationService = require("../services/organization.service");
const { FileService } = require("../services/file.service");

const WorkspaceController = {
  listMine: catchAsync(async (req, res) => {
    const workspaces = await workspaceService.listWorkspacesForUser(req.user);
    const enriched = await workspaceService.enrichWithOrganizationRoles(req.user, workspaces);
    return R2XX(res, "Workspaces fetched successfully", 200, { workspaces: enriched });
  }),

  create: catchAsync(async (req, res) => {
    const { name, organizationId, organizationName } = req.body;
    if (organizationId) {
      const orgMember = await organizationService.findMembership(req.user, organizationId);
      if (!orgMember) {
        return R4XX(res, 403, "You are not a member of the selected organization.");
      }
    }
    const workspace = await workspaceService.createWorkspaceAsUser({
      userId: req.user,
      name,
      organizationId,
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
      logoUrl: req.body.logoUrl || undefined,
      customVars: parseMaybeJson(req.body.customVars),
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
