const express = require("express");
const { isAuth, requireWorkspace, requirePermission, requireActiveSubscription, enforcePlanLimit } = require("../middlewares");
const TemplateController = require("../controllers/template.controller");
const { uploadTemplatePdf } = require("../middlewares/templateUpload.model");

const router = express.Router();

// Admin: Manage templates (create, update, render)
router.post(
  "/",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission("workspace.templates.manage"),
  enforcePlanLimit("max_templates"),
  uploadTemplatePdf.single("file"),
  TemplateController.createTemplate
);

// Admin, Agent, Viewer: Read-only access to templates
router.get("/", isAuth, requireWorkspace, requirePermission("workspace.templates.read"), TemplateController.listTemplates);
router.get("/:id", isAuth, requireWorkspace, requirePermission("workspace.templates.read"), TemplateController.getTemplate);
router.get("/:id/file", isAuth, requireWorkspace, requirePermission("workspace.templates.read"), TemplateController.getTemplateFile);

// Admin: Save placements
router.put("/:id/placements", isAuth, requireWorkspace, requirePermission("workspace.templates.write"), TemplateController.savePlacements);

// Admin: Render template
router.post("/:id/render", isAuth, requireWorkspace, requirePermission("workspace.templates.write"), TemplateController.renderTemplate);

module.exports = router;
