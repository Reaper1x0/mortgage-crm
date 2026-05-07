const express = require("express");
const { isAuth, requireWorkspace, hasRole, requireActiveSubscription, enforcePlanLimit } = require("../middlewares");
const TemplateController = require("../controllers/template.controller");
const { uploadTemplatePdf } = require("../middlewares/templateUpload.model");

const router = express.Router();

// Admin: Manage templates (create, update, render)
router.post(
  "/",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  hasRole(["Admin"]),
  enforcePlanLimit("max_templates"),
  uploadTemplatePdf.single("file"),
  TemplateController.createTemplate
);

// Admin, Agent, Viewer: Read-only access to templates
router.get("/", isAuth, requireWorkspace, hasRole(["Admin", "Agent", "Viewer"]), TemplateController.listTemplates);
router.get("/:id", isAuth, requireWorkspace, hasRole(["Admin", "Agent", "Viewer"]), TemplateController.getTemplate);
router.get("/:id/file", isAuth, requireWorkspace, hasRole(["Admin", "Agent", "Viewer"]), TemplateController.getTemplateFile);

// Admin: Save placements
router.put("/:id/placements", isAuth, requireWorkspace, hasRole(["Admin"]), TemplateController.savePlacements);

// Admin: Render template
router.post("/:id/render", isAuth, requireWorkspace, hasRole(["Admin"]), TemplateController.renderTemplate);

module.exports = router;
