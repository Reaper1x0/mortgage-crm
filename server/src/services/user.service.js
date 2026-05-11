const mongoose = require("mongoose");
const { User, Workspace, OrganizationMember, WorkspaceMember } = require("../models");
const workspaceService = require("./workspace.service");
const entitlementService = require("../billing/entitlement.service");

const UserService = {
  canManageWorkspaceUsers: ({ orgRole, workspaceRole }) => {
    if (orgRole === "Owner" || orgRole === "Admin") return true;
    return workspaceRole === "Admin";
  },

  getWorkspaceRoleStats: async (workspaceId) => {
    const workspaceObjId =
      typeof workspaceId === "string" ? new mongoose.Types.ObjectId(workspaceId) : workspaceId;
    const rows = await WorkspaceMember.aggregate([
      { $match: { workspace: workspaceObjId } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const roleCounts = { Admin: 0, Agent: 0, Viewer: 0 };
    rows.forEach((row) => {
      if (roleCounts[row._id] !== undefined) roleCounts[row._id] = row.count;
    });
    return {
      adminCount: roleCounts.Admin,
      agentCount: roleCounts.Agent,
      viewerCount: roleCounts.Viewer,
    };
  },

  validateWorkspaceRoleUpdatePolicy: ({
    actorOrgRole,
    actorWorkspaceRole,
    actorUserId,
    targetUserId,
    targetRole,
    nextRole,
    roleStats,
  }) => {
    if (!UserService.canManageWorkspaceUsers({ orgRole: actorOrgRole, workspaceRole: actorWorkspaceRole })) {
      return { ok: false, status: 403, message: "You do not have permission to manage workspace users." };
    }
    if (!["Admin", "Agent", "Viewer"].includes(nextRole)) {
      return { ok: false, status: 400, message: "Invalid workspace role." };
    }
    const orgHasElevatedControl = actorOrgRole === "Owner" || actorOrgRole === "Admin";
    if (targetRole === "Admin" && !orgHasElevatedControl) {
      return { ok: false, status: 403, message: "Only organization owner/admin can update workspace admins." };
    }
    if (nextRole === "Admin" && !orgHasElevatedControl) {
      return { ok: false, status: 403, message: "Only organization owner/admin can assign admin role." };
    }
    if (String(actorUserId) === String(targetUserId) && targetRole === "Admin" && nextRole !== "Admin") {
      return { ok: false, status: 400, message: "You cannot demote your own admin access." };
    }
    if (targetRole === "Admin" && nextRole !== "Admin" && (roleStats?.adminCount || 0) <= 1) {
      return { ok: false, status: 400, message: "At least one workspace admin must remain." };
    }
    return { ok: true };
  },

  validateWorkspaceRemovalPolicy: ({
    actorOrgRole,
    actorWorkspaceRole,
    actorUserId,
    targetUserId,
    targetRole,
    roleStats,
  }) => {
    if (String(actorUserId) === String(targetUserId)) {
      return { ok: false, status: 400, message: "You cannot remove your own workspace membership." };
    }
    if (!UserService.canManageWorkspaceUsers({ orgRole: actorOrgRole, workspaceRole: actorWorkspaceRole })) {
      return { ok: false, status: 403, message: "You do not have permission to manage workspace users." };
    }
    const orgHasElevatedControl = actorOrgRole === "Owner" || actorOrgRole === "Admin";
    if (targetRole === "Admin" && !orgHasElevatedControl) {
      return { ok: false, status: 403, message: "Only organization owner/admin can remove workspace admins." };
    }
    if (targetRole === "Admin" && (roleStats?.adminCount || 0) <= 1) {
      return { ok: false, status: 400, message: "At least one workspace admin must remain." };
    }
    return { ok: true };
  },

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
    const toLimitResult = (check, operation) => ({
      ok: false,
      code: "PLAN_LIMIT_REACHED",
      operation,
      limitError: check,
    });

    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return { ok: false, code: "WORKSPACE_NOT_FOUND" };
    }
    const organizationId = workspace.organization;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      const alreadyMember = await workspaceService.findMembership(
        existingEmail._id,
        workspaceId
      );
      if (alreadyMember) {
        return { ok: false, code: "ALREADY_IN_WORKSPACE" };
      }

      const wsLimit = await entitlementService.assertWithinLimit({
        organizationId,
        workspaceId,
        featureKey: "max_workspace_members",
        incrementBy: 1,
      });
      if (!wsLimit.ok) {
        return toLimitResult(wsLimit, "workspace_member_add");
      }

      const orgMember = await OrganizationMember.findOne({
        user: existingEmail._id,
        organization: organizationId,
      }).lean();

      if (!orgMember) {
        const orgLimit = await entitlementService.assertWithinLimit({
          organizationId,
          featureKey: "max_organization_members",
          incrementBy: 1,
        });
        if (!orgLimit.ok) {
          return toLimitResult(orgLimit, "organization_member_add");
        }
      }

      await workspaceService.addMember({
        userId: existingEmail._id,
        workspaceId,
        organizationId,
        role: role || "Viewer",
      });
      if (!orgMember) {
        await OrganizationMember.create({
          user: existingEmail._id,
          organization: organizationId,
          role: "Member",
        });
      }
      return { ok: true, user: existingEmail, addedExisting: true };
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return { ok: false, code: "USERNAME_TAKEN" };
    }

    const wsLimit = await entitlementService.assertWithinLimit({
      organizationId,
      workspaceId,
      featureKey: "max_workspace_members",
      incrementBy: 1,
    });
    if (!wsLimit.ok) {
      return toLimitResult(wsLimit, "workspace_member_add");
    }

    const orgLimit = await entitlementService.assertWithinLimit({
      organizationId,
      featureKey: "max_organization_members",
      incrementBy: 1,
    });
    if (!orgLimit.ok) {
      return toLimitResult(orgLimit, "organization_member_add");
    }

    const newUser = new User({
      fullName,
      username,
      email,
      password,
      role: "user",
    });
    await newUser.save();
    await workspaceService.addMember({
      userId: newUser._id,
      workspaceId,
      organizationId,
      role: role || "Viewer",
    });
    await OrganizationMember.create({
      user: newUser._id,
      organization: organizationId,
      role: "Member",
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
