const express = require("express");
const MasterFieldController = require("../controllers/masterFields.controller");
const { isAuth, requireWorkspace, requirePermission } = require("../middlewares");
const router = express.Router();

router.post("/fields", isAuth, requireWorkspace, requirePermission("workspace.masterfields.write"), MasterFieldController.createMasterField);

router.get("/fields", isAuth, requireWorkspace, requirePermission("workspace.masterfields.read"), MasterFieldController.getAllMasterFields);

router.get("/fields/:key", isAuth, requireWorkspace, requirePermission("workspace.masterfields.read"), MasterFieldController.getMasterFieldByKey);

router.put("/fields/:key", isAuth, requireWorkspace, requirePermission("workspace.masterfields.write"), MasterFieldController.updateMasterField);

router.delete("/fields/:key", isAuth, requireWorkspace, requirePermission("workspace.masterfields.write"), MasterFieldController.deleteMasterField);

router.delete("/fields", isAuth, requireWorkspace, requirePermission("workspace.masterfields.write"), MasterFieldController.deleteMultipleMasterFields);

module.exports = router;
