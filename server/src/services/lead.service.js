const { Lead } = require("../models");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

const LeadService = {
  listLeads: async function (options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, filter = {} } = options;

    return mongoosePaginate({
      model: Lead,
      filter,
      sort,
      page,
      limit,
      lean: true,
    });
  },

  getLeadById: async (id) => {
    return Lead.findById(id);
  },

  getLeadByIdInWorkspace: async (id, workspaceId) => {
    return Lead.findOne({ _id: id, workspace: workspaceId });
  },

  createLead: async (data) => {
    const lead = new Lead(data);
    return lead.save();
  },

  updateLeadById: async function (id, data, workspaceId) {
    const lead = await this.getLeadByIdInWorkspace(id, workspaceId);
    if (!lead) return false;
    Object.assign(lead, data);
    await lead.save();
    return lead;
  },

  deleteLeadById: async function (id, workspaceId) {
    const lead = await this.getLeadByIdInWorkspace(id, workspaceId);
    if (!lead) return false;
    await Lead.findOneAndDelete({ _id: id, workspace: workspaceId });
    return true;
  },
  deleteLeadsByIds: async (ids = [], workspaceId) => {
    if (!ids.length) return { deletedCount: 0 };
    return Lead.deleteMany({ _id: { $in: ids }, workspace: workspaceId });
  },

  createLeadsBulk: async (leads = []) => {
    if (!leads.length) return [];
    return Lead.insertMany(leads, { ordered: false });
  },
};

module.exports = LeadService;
