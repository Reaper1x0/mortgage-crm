const { R2XX, R4XX } = require("../Responses");
const MasterFieldService = require("../services/masterFields.service");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");

const MasterFieldController = {
  // Create a new MasterField
  createMasterField: catchAsync(async (req, res) => {
    const data = req.body;
    const field = await MasterFieldService.createMasterField(data);
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
    const updatedField = await MasterFieldService.updateMasterField(key, data);

    if (!updatedField) {
      return R4XX(res, 404, "Field not found");
    }

    return R2XX(res, "Field updated successfully", 200, { updatedField });
  }),

  // Delete a MasterField by its key
  deleteMasterField: catchAsync(async (req, res) => {
    const { key } = req.params;
    await MasterFieldService.deleteMasterField(key);
    return R2XX(res, "Field deleted successfully", 200);
  }),

  // Delete multiple MasterFields
  deleteMultipleMasterFields: catchAsync(async (req, res) => {
    const { keys } = req.body; // Expecting an array of keys to delete
    if (!Array.isArray(keys) || keys.length === 0) {
      return R4XX(res, 400, "Invalid or empty list of keys");
    }

    await MasterFieldService.deleteMultipleMasterFields(keys);
    return R2XX(res, "Fields deleted successfully", 200);
  }),
};

module.exports = MasterFieldController;
