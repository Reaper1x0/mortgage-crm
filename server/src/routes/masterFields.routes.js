const express = require('express');
const MasterFieldController = require('../controllers/masterFields.controller');
const isAuth = require('../middlewares/auth.middleware');
const hasRole = require('../middlewares/hasRole.middleware');
const router = express.Router();

// Create a new MasterField
router.post('/fields', isAuth, hasRole(["Admin"]), MasterFieldController.createMasterField);

// Get all MasterFields
router.get('/fields', isAuth, hasRole(["Admin"]), MasterFieldController.getAllMasterFields);

// Get a MasterField by key
router.get('/fields/:key', isAuth, hasRole(["Admin"]), MasterFieldController.getMasterFieldByKey);

// Update a MasterField by key
router.put('/fields/:key', isAuth, hasRole(["Admin"]), MasterFieldController.updateMasterField);

// Delete a MasterField by key
router.delete('/fields/:key', isAuth, hasRole(["Admin"]), MasterFieldController.deleteMasterField);

// Delete multiple MasterFields
router.delete('/fields', isAuth, hasRole(["Admin"]), MasterFieldController.deleteMultipleMasterFields);

module.exports = router;
