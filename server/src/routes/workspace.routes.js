const { Router } = require("express");
const { validate, isAuth, requireOrganization, requireWorkspace, requirePermission } = require("../middlewares");
const { workspaceValidation } = require("../validations");
const WorkspaceController = require("../controllers/workspace.controller");
const { uploadBrandingImage } = require("../middlewares/brandingUpload.middleware");

const router = Router();

router.get("/", isAuth, WorkspaceController.listMine);

router.post(
  "/",
  isAuth,
  requireOrganization,
  requirePermission("organization.workspaces.create", { scope: "organization" }),
  validate(workspaceValidation.createWorkspace),
  WorkspaceController.create
);

router.patch(
  "/branding",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.workspace.update"),
  uploadBrandingImage.single("logo"),
  WorkspaceController.updateBranding
);

module.exports = router;
