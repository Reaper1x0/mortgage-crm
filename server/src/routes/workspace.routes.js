const { Router } = require("express");
const { validate, isAuth, requireWorkspace, hasRole } = require("../middlewares");
const { workspaceValidation } = require("../validations");
const WorkspaceController = require("../controllers/workspace.controller");
const { uploadBrandingImage } = require("../middlewares/brandingUpload.middleware");

const router = Router();

router.get("/", isAuth, WorkspaceController.listMine);

router.post(
  "/",
  isAuth,
  validate(workspaceValidation.createWorkspace),
  WorkspaceController.create
);

router.patch(
  "/branding",
  isAuth,
  requireWorkspace,
  hasRole(["Admin"]),
  uploadBrandingImage.single("logo"),
  WorkspaceController.updateBranding
);

module.exports = router;
