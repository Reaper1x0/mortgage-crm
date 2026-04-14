const { Lead, Submission } = require("../models");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

const LeadService = {
  listLeads: async function (options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, filter = {} } = options;

    const paged = await mongoosePaginate({
      model: Lead,
      filter,
      sort,
      page,
      limit,
      lean: true,
    });

    const leadIds = (paged.items || []).map((lead) => lead._id);
    if (!leadIds.length) return paged;

    const counts = await Submission.aggregate([
      {
        $match: {
          sourceLead: { $in: leadIds },
          ...(filter.workspace ? { workspace: filter.workspace } : {}),
        },
      },
      { $group: { _id: "$sourceLead", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    return {
      ...paged,
      items: paged.items.map((lead) => {
        const clientCount = countMap.get(String(lead._id)) || 0;
        return {
          ...lead,
          clientCount,
          usedAsClient: clientCount > 0,
        };
      }),
    };
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

  moveLeadsToClients: async (ids = [], workspaceId, userId) => {
    if (!ids.length) {
      return { movedCount: 0, skippedCount: 0, skipped: [] };
    }

    const uniqueIds = Array.from(new Set(ids.map(String)));
    const leads = await Lead.find({
      _id: { $in: uniqueIds },
      workspace: workspaceId,
    }).lean();
    const leadById = new Map(leads.map((lead) => [String(lead._id), lead]));

    const existing = await Submission.find({
      workspace: workspaceId,
      sourceLead: { $in: uniqueIds },
    })
      .select("sourceLead")
      .lean();
    const existingLeadIdSet = new Set(existing.map((doc) => String(doc.sourceLead)));

    const clientsToCreate = [];
    const movedLeadIds = [];
    const skipped = [];

    uniqueIds.forEach((id) => {
      const lead = leadById.get(id);
      if (!lead) {
        skipped.push({ id, reason: "Lead not found" });
        return;
      }
      if (existingLeadIdSet.has(id)) {
        skipped.push({ id, reason: "Lead already moved to client" });
        return;
      }

      clientsToCreate.push({
        workspace: workspaceId,
        userId,
        submission_name: lead.fullName,
        legal_name: lead.fullName,
        sourceLead: lead._id,
      });
      movedLeadIds.push(lead._id);
    });

    if (clientsToCreate.length) {
      await Submission.insertMany(clientsToCreate, { ordered: false });
      await Lead.deleteMany({ _id: { $in: movedLeadIds }, workspace: workspaceId });
    }

    return {
      movedCount: clientsToCreate.length,
      skippedCount: skipped.length,
      skipped,
    };
  },

  createLeadsBulk: async (leads = []) => {
    if (!leads.length) return [];
    return Lead.insertMany(leads, { ordered: false });
  },
};

module.exports = LeadService;
