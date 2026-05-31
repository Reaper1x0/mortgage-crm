const { Router } = require("express");
const multer = require("multer");
const { leadValidation } = require("../validations");
const { leadController } = require("../controllers");
const { validate, isAuth, requireWorkspace, requirePermission } = require("../middlewares");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get(
  "/",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.read"),
  validate(leadValidation.listLeads),
  leadController.listLeads
);

router.post(
  "/",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  validate(leadValidation.createLead),
  leadController.createLead
);

router.post(
  "/bulk/delete",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  validate(leadValidation.bulkDeleteLeads),
  leadController.bulkDeleteLeads
);

router.post(
  "/bulk/move-to-clients",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  validate(leadValidation.bulkMoveLeadsToClients),
  leadController.bulkMoveLeadsToClients
);

router.get(
  "/bulk/sample-template",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.read"),
  leadController.downloadLeadsSampleTemplate
);

router.post(
  "/bulk/preview",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  upload.single("file"),
  leadController.bulkPreviewLeads
);

router.post(
  "/bulk/import",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  validate(leadValidation.bulkImportLeads),
  leadController.bulkImportLeads
);

router.put(
  "/:id",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  validate(leadValidation.updateLead),
  leadController.updateLead
);

router.delete(
  "/:id",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  validate(leadValidation.deleteLead),
  leadController.deleteLead
);

router.post(
  "/:id/move-to-client",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.leads.write"),
  validate(leadValidation.moveLeadToClient),
  leadController.moveLeadToClient
);

module.exports = router;
