const { MasterField } = require("../models");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

const MasterFieldService = {
  // Create a new MasterField
  createMasterField: async (data) => {
    const field = await MasterField.create(data);
    return field;
  },

  // Get all MasterFields
  getAllMasterFields: async (opts = {}) => {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, workspaceId } = opts;

    return mongoosePaginate({
      model: MasterField,
      filter: { workspace: workspaceId },
      sort,
      page,
      limit,
      lean: true,
    });
  },

  // Get a MasterField by its key
  getMasterFieldByKey: async (key, workspaceId) => {
    const field = await MasterField.findOne({ key, workspace: workspaceId });
    return field;
  },

  // Update a MasterField by its key
  updateMasterField: async (key, data, workspaceId) => {
    const updatedField = await MasterField.findOneAndUpdate({ key, workspace: workspaceId }, data, {
      new: true,
    });
    return updatedField;
  },

  // Delete a MasterField by its key
  deleteMasterField: async (key, workspaceId) => {
    await MasterField.findOneAndDelete({ key, workspace: workspaceId });
  },

  // Delete multiple MasterFields
  deleteMultipleMasterFields: async (keys, workspaceId) => {
    await MasterField.deleteMany({ key: { $in: keys }, workspace: workspaceId });
  },
};

module.exports = MasterFieldService;
