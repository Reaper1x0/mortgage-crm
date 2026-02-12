const { R2XX, R4XX } = require("../Responses");
const MasterFieldService = require("../services/masterFields.service");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const AuditTrailService = require("../services/auditTrail.service");

const MasterFieldController = {
  // Create a new MasterField
  createMasterField: catchAsync(async (req, res) => {
    const data = req.body;
    const userId = req.user;
    const field = await MasterFieldService.createMasterField(data);
    
    // Log audit trail for master field creation
    await AuditTrailService.log({
      entity_type: "field",
      entity_id: field.key,
      user_id: userId,
      action: "master_field_created",
      action_details: {
        field_key: field.key,
        field_label: field.label || field.label_on_form,
        field_type: field.type,
      },
      field_key: field.key,
    });

    return R2XX(res, "MasterField created successfully", 201, { field });
  }),

  // Get all MasterFields
  getAllMasterFields: catchAsync(async (req, res) => {
    console.log(req.query)
    const { page, limit, sort } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 200,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "key", "type", "required"],
    });
    console.log(limit)

    const { items, pagination } = await MasterFieldService.getAllMasterFields({
      page,
      limit,
      sort,
    });

    return R2XX(res, "Fields fetched successfully", 200, {
      fields: items,
      pagination,
    });
  }),

  // Get a MasterField by its key
  getMasterFieldByKey: catchAsync(async (req, res) => {
    const { key } = req.params;
    const field = await MasterFieldService.getMasterFieldByKey(key);

    if (!field) {
      return R4XX(res, 404, "Field not found");
    }

    return R2XX(res, "Field fetched successfully", 200, { field });
  }),

  // Update a MasterField by its key
  updateMasterField: catchAsync(async (req, res) => {
    const { key } = req.params;
    const data = req.body;
    const userId = req.user;
    const updatedField = await MasterFieldService.updateMasterField(key, data);

    if (!updatedField) {
      return R4XX(res, 404, "Field not found");
    }

    // Log audit trail for master field update
    await AuditTrailService.log({
      entity_type: "field",
      entity_id: key,
      user_id: userId,
      action: "master_field_updated",
      action_details: {
        field_key: key,
        field_label: updatedField.label || updatedField.label_on_form,
        updated_fields: Object.keys(data),
      },
      field_key: key,
    });

    return R2XX(res, "Field updated successfully", 200, { updatedField });
  }),

  // Delete a MasterField by its key
  deleteMasterField: catchAsync(async (req, res) => {
    const { key } = req.params;
    const userId = req.user;
    
    // Get field info before deletion for audit trail
    const field = await MasterFieldService.getMasterFieldByKey(key);
    
    await MasterFieldService.deleteMasterField(key);
    
    // Log audit trail for master field deletion
    if (field) {
      await AuditTrailService.log({
        entity_type: "field",
        entity_id: key,
        user_id: userId,
        action: "master_field_deleted",
        action_details: {
          field_key: key,
          field_label: field.label || field.label_on_form,
        },
        field_key: key,
      });
    }
    
    return R2XX(res, "Field deleted successfully", 200);
  }),

  // Delete multiple MasterFields
  deleteMultipleMasterFields: catchAsync(async (req, res) => {
    const { keys } = req.body; // Expecting an array of keys to delete
    const userId = req.user;
    if (!Array.isArray(keys) || keys.length === 0) {
      return R4XX(res, 400, "Invalid or empty list of keys");
    }

    // Get field info before deletion for audit trail
    const { MasterField } = require("../models");
    const fields = await MasterField.find({ key: { $in: keys } }).lean();

    await MasterFieldService.deleteMultipleMasterFields(keys);
    
    // Log audit trail for each deleted field
    for (const field of fields) {
      await AuditTrailService.log({
        entity_type: "field",
        entity_id: field.key,
        user_id: userId,
        action: "master_field_deleted",
        action_details: {
          field_key: field.key,
          field_label: field.label || field.label_on_form,
          batch_delete: true,
        },
        field_key: field.key,
      });
    }
    
    return R2XX(res, "Fields deleted successfully", 200);
  }),
};

module.exports = MasterFieldController;
