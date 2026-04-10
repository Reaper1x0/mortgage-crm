const { User } = require("../models");
const workspaceService = require("./workspace.service");

const UserService = {
  getUserByEmail: async (email) => {
    return await User.findOne({ email }).populate("profile_picture");
  },

  /** User by id (no workspace filter). */
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
    return { user, workspaceRole: member.role };
  },

  listUsers: async function (options = {}) {
    const {
      workspaceId,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      role,
      search,
    } = options;

    return workspaceService.listMembersPaginated({
      workspaceId,
      page,
      limit,
      sortBy,
      sortOrder,
      role,
      search,
    });
  },

  createUserInWorkspace: async function ({
    fullName,
    username,
    email,
    password,
    role,
    workspaceId,
  }) {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      const alreadyMember = await workspaceService.findMembership(
        existingEmail._id,
        workspaceId
      );
      if (alreadyMember) {
        return { ok: false, code: "ALREADY_IN_WORKSPACE" };
      }
      await workspaceService.addMember({
        userId: existingEmail._id,
        workspaceId,
        role: role || "Viewer",
      });
      return { ok: true, user: existingEmail, addedExisting: true };
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return { ok: false, code: "USERNAME_TAKEN" };
    }

    const newUser = new User({
      fullName,
      username,
      email,
      password,
      role: "Viewer",
    });
    await newUser.save();
    await workspaceService.addMember({
      userId: newUser._id,
      workspaceId,
      role: role || "Viewer",
    });
    return { ok: true, user: newUser, addedExisting: false };
  },

  updateUserById: async function (id, updateBody, workspaceId) {
    const member = await workspaceService.findMembership(id, workspaceId);
    if (!member) return null;

    const { role: workspaceRole, ...userFields } = updateBody;
    const user = await User.findById(id);
    if (!user) return null;

    Object.assign(user, userFields);
    await user.save();

    if (workspaceRole && ["Admin", "Agent", "Viewer"].includes(workspaceRole)) {
      await workspaceService.updateMemberRole({
        userId: id,
        workspaceId,
        role: workspaceRole,
      });
    }

    const populated = await User.findById(id).populate("profile_picture");
    const m = await workspaceService.findMembership(id, workspaceId);
    const obj = populated.toObject ? populated.toObject() : { ...populated };
    obj.role = m.role;
    return obj;
  },

  deleteUserById: async function (id, workspaceId) {
    const removed = await workspaceService.removeMember({
      userId: id,
      workspaceId,
    });
    if (!removed) return false;

    const count = await workspaceService.countMembershipsForUser(id);
    if (count === 0) {
      await User.findByIdAndDelete(id);
    }
    return true;
  },
};

module.exports = UserService;
