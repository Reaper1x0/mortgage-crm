const express = require("express");
const multer = require("multer");
const MasterFieldController = require("../controllers/masterFields.controller");
const { masterFieldsValidation } = require("../validations");
const { isAuth, requireWorkspace, requirePermission, validate } = require("../middlewares");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/fields",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  MasterFieldController.createMasterField,
);

router.get(
  "/fields",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.read"),
  validate(masterFieldsValidation.listMasterFields),
  MasterFieldController.getAllMasterFields,
);

router.post(
  "/bulk/delete",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  validate(masterFieldsValidation.bulkDeleteMasterFields),
  MasterFieldController.bulkDeleteMasterFields,
);

router.get(
  "/bulk/sample-template",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.read"),
  MasterFieldController.downloadMasterFieldsSampleTemplate,
);

router.post(
  "/bulk/preview",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  upload.single("file"),
  MasterFieldController.bulkPreviewMasterFields,
);

router.post(
  "/seed-defaults",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  MasterFieldController.seedDefaultMasterFields,
);

router.post(
  "/bulk/import",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  validate(masterFieldsValidation.bulkImportMasterFields),
  MasterFieldController.bulkImportMasterFields,
);

router.get(
  "/fields/:key",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.read"),
  MasterFieldController.getMasterFieldByKey,
);

router.put(
  "/fields/:key",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  MasterFieldController.updateMasterField,
);

router.delete(
  "/fields/:key",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  MasterFieldController.deleteMasterField,
);

router.delete(
  "/fields",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.masterfields.write"),
  MasterFieldController.deleteMultipleMasterFields,
);

module.exports = router;
