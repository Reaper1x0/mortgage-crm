const { MasterField } = require("../models");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

const MasterFieldService = {
  createMasterField: async (data) => {
    const field = await MasterField.create(data);
    return field;
  },

  getAllMasterFields: async (opts = {}) => {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, workspaceId, filter = {} } = opts;

    return mongoosePaginate({
      model: MasterField,
      filter: { workspace: workspaceId, ...filter },
      sort,
      page,
      limit,
      lean: true,
    });
  },

  getMasterFieldByKey: async (key, workspaceId) => {
    const field = await MasterField.findOne({ key, workspace: workspaceId });
    return field;
  },

  getMasterFieldsByKeys: async (keys, workspaceId) => {
    return MasterField.find({ key: { $in: keys }, workspace: workspaceId }).lean();
  },

  getExistingKeys: async (keys, workspaceId) => {
    const existing = await MasterField.find({ key: { $in: keys }, workspace: workspaceId })
      .select("key")
      .lean();
    return new Set(existing.map((f) => f.key));
  },

  updateMasterField: async (key, data, workspaceId) => {
    const updatedField = await MasterField.findOneAndUpdate({ key, workspace: workspaceId }, data, {
      new: true,
    });
    return updatedField;
  },

  deleteMasterField: async (key, workspaceId) => {
    await MasterField.findOneAndDelete({ key, workspace: workspaceId });
  },

  deleteMultipleMasterFields: async (keys, workspaceId) => {
    const result = await MasterField.deleteMany({ key: { $in: keys }, workspace: workspaceId });
    return result;
  },

  createMasterFieldsBulk: async (fields) => {
    if (!fields.length) return { insertedCount: 0, inserted: [] };
    const inserted = await MasterField.insertMany(fields, { ordered: false });
    return { insertedCount: inserted.length, inserted };
  },
};

module.exports = MasterFieldService;
