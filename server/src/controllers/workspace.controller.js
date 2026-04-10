const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const workspaceService = require("../services/workspace.service");

const WorkspaceController = {
  listMine: catchAsync(async (req, res) => {
    const workspaces = await workspaceService.listWorkspacesForUser(req.user);
    return R2XX(res, "Workspaces fetched successfully", 200, { workspaces });
  }),

  create: catchAsync(async (req, res) => {
    const { name } = req.body;
    const workspace = await workspaceService.createWorkspaceAsUser({
      userId: req.user,
      name,
    });
    return R2XX(res, "Workspace created successfully", 201, {
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
      },
    });
  }),
};

module.exports = WorkspaceController;
