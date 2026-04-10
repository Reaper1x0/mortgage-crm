const { Router } = require("express");
const multer = require("multer");
const { leadValidation } = require("../validations");
const { leadController } = require("../controllers");
const { validate, isAuth, requireWorkspace, hasRole } = require("../middlewares");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get(
  "/",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent", "Viewer"]),
  validate(leadValidation.listLeads),
  leadController.listLeads
);

router.post(
  "/",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  validate(leadValidation.createLead),
  leadController.createLead
);

router.post(
  "/bulk/delete",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  validate(leadValidation.bulkDeleteLeads),
  leadController.bulkDeleteLeads
);

router.post(
  "/bulk/preview",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  upload.single("file"),
  leadController.bulkPreviewLeads
);

router.post(
  "/bulk/import",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  validate(leadValidation.bulkImportLeads),
  leadController.bulkImportLeads
);

router.put(
  "/:id",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  validate(leadValidation.updateLead),
  leadController.updateLead
);

router.delete(
  "/:id",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent"]),
  validate(leadValidation.deleteLead),
  leadController.deleteLead
);

module.exports = router;
