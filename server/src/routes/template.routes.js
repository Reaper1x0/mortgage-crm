const express = require("express");
const { isAuth, hasRole } = require("../middlewares");
const TemplateController = require("../controllers/template.controller");
const { uploadTemplatePdf } = require("../middlewares/templateUpload.model");

const router = express.Router();

// Admin: Manage templates (create, update, render)
router.post(
  "/",
  isAuth,
  hasRole(["Admin"]),
  uploadTemplatePdf.single("file"),
  TemplateController.createTemplate
);

// Admin, Agent, Viewer: Read-only access to templates
router.get("/", isAuth, hasRole(["Admin", "Agent", "Viewer"]), TemplateController.listTemplates);
router.get("/:id", isAuth, hasRole(["Admin", "Agent", "Viewer"]), TemplateController.getTemplate);

// Admin: Save placements
router.put("/:id/placements", isAuth, hasRole(["Admin"]), TemplateController.savePlacements);

// Admin: Render template
router.post("/:id/render", isAuth, hasRole(["Admin"]), TemplateController.renderTemplate);

module.exports = router;
