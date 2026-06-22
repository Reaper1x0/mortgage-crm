const mongoose = require("mongoose");
const { User } = require("../models");
const workspaceService = require("./workspace.service");

const UserService = {
  getUserByEmail: async (email) => {
    return await User.findOne({ email }).populate("profile_picture");
  },

  getUserById: async (id) => {
    return await User.findById(id).populate("profile_picture");
  },

  getUserByUserName: async (username) => {
    return await User.findOne({ username: username });
  },

  getUserInWorkspace: async (id, workspaceId) => {
    const member = await workspaceService.findMembership(id, workspaceId);
    if (!member) return null;
    const user = await User.findById(id).populate("profile_picture");
    if (!user) return null;
    return {
      user,
      workspaceRole: member.workspaceRole?.name || "Role",
      workspaceRoleSlug: member.workspaceRole?.slug || null,
      workspaceRoleId: member.workspaceRole?._id ? String(member.workspaceRole._id) : null,
    };
  },

  listUsers: async function (options = {}) {
    const {
      workspaceId,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      role,
      workspaceRoleId,
      search,
    } = options;

    return workspaceService.listMembersPaginated({
      workspaceId,
      page,
      limit,
      sortBy,
      sortOrder,
      role,
      workspaceRoleId,
      search,
    });
  },

  updateUserById: async function (id, updateBody, workspaceId) {
    const userId = String(id?._id || id);
    const { role: workspaceRoleLegacy, workspaceRoleId, workspaceRole, ...userFields } = updateBody;

    if (workspaceId) {
      const member = await workspaceService.findMembership(userId, workspaceId);
      if (!member) return null;
    }

    const user = await User.findById(userId);
    if (!user) return null;

    Object.assign(user, userFields);
    await user.save();

    if (workspaceId && (workspaceRoleId || workspaceRole || workspaceRoleLegacy)) {
      await workspaceService.updateMemberRole({
        userId,
        workspaceId,
        workspaceRoleId,
        role: workspaceRoleId ? undefined : workspaceRole || workspaceRoleLegacy,
      });
    }

    const populated = await User.findById(userId).populate("profile_picture");
    if (!workspaceId) {
      return populated.toObject ? populated.toObject() : populated;
    }

    const m = await workspaceService.findMembership(userId, workspaceId);
    const obj = populated.toObject ? populated.toObject() : { ...populated };
    obj.role = m?.workspaceRole?.name || "Role";
    obj.workspaceRoleSlug = m?.workspaceRole?.slug || null;
    obj.workspaceRoleId = m?.workspaceRole?._id ? String(m.workspaceRole._id) : null;
    return obj;
  },
};

module.exports = UserService;
