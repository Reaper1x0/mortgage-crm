const express = require('express');
const MasterFieldController = require('../controllers/masterFields.controller');
const { isAuth, hasRole } = require('../middlewares');
const router = express.Router();

// Admin: Manage validation rules (create, update, delete)
router.post('/fields', isAuth, hasRole(["Admin"]), MasterFieldController.createMasterField);

// Admin, Agent, Viewer: Read-only access to validation rules
router.get('/fields', isAuth, hasRole(["Admin", "Agent", "Viewer"]), MasterFieldController.getAllMasterFields);

// Admin, Agent, Viewer: Read-only access to validation rules
router.get('/fields/:key', isAuth, hasRole(["Admin", "Agent", "Viewer"]), MasterFieldController.getMasterFieldByKey);

// Admin: Update validation rules
router.put('/fields/:key', isAuth, hasRole(["Admin"]), MasterFieldController.updateMasterField);

// Admin: Delete validation rules
router.delete('/fields/:key', isAuth, hasRole(["Admin"]), MasterFieldController.deleteMasterField);

// Admin: Delete multiple validation rules
router.delete('/fields', isAuth, hasRole(["Admin"]), MasterFieldController.deleteMultipleMasterFields);

module.exports = router;
