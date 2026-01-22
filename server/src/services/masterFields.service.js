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
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = opts;

    return mongoosePaginate({
      model: MasterField,
      filter: {}, // no user filter here (admin only route)
      sort,
      page,
      limit,
      lean: true,
    });
  },

  // Get a MasterField by its key
  getMasterFieldByKey: async (key) => {
    const field = await MasterField.findOne({ key });
    return field;
  },

  // Update a MasterField by its key
  updateMasterField: async (key, data) => {
    const updatedField = await MasterField.findOneAndUpdate({ key }, data, {
      new: true,
    });
    return updatedField;
  },

  // Delete a MasterField by its key
  deleteMasterField: async (key) => {
    await MasterField.findOneAndDelete({ key });
  },

  // Delete multiple MasterFields
  deleteMultipleMasterFields: async (keys) => {
    await MasterField.deleteMany({ key: { $in: keys } });
  },
};

module.exports = MasterFieldService;
