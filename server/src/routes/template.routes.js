const express = require("express");
const { isAuth } = require("../middlewares");
const hasRole = require("../middlewares/hasRole.middleware");
const TemplateController = require("../controllers/template.controller");
const { uploadTemplatePdf } = require("../middlewares/templateUpload.model");

const router = express.Router();

// Admin-only for now
router.post(
  "/",
  isAuth,
  hasRole(["Admin"]),
  uploadTemplatePdf.single("file"),
  TemplateController.createTemplate
);

router.get("/", isAuth, hasRole(["Admin"]), TemplateController.listTemplates);
router.get("/:id", isAuth, hasRole(["Admin"]), TemplateController.getTemplate);

// Save placements
router.put("/:id/placements", isAuth, hasRole(["Admin"]), TemplateController.savePlacements);

// Render
router.post("/:id/render", isAuth, hasRole(["Admin"]), TemplateController.renderTemplate);

module.exports = router;
