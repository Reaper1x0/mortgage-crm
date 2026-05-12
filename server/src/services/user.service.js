const mongoose = require("mongoose");
const { User, Workspace, OrganizationMember, WorkspaceMember, OrganizationRole } = require("../models");
const workspaceService = require("./workspace.service");
const organizationService = require("./organization.service");
const { ensureOrganizationRbac } = require("./rbacBootstrap.service");
const authorizationService = require("./authorization.service");


const UserService = {
  getWorkspaceRoleStats: async (workspaceId) => {
    const workspaceObjId =
      typeof workspaceId === "string" ? new mongoose.Types.ObjectId(workspaceId) : workspaceId;
    const rows = await WorkspaceMember.aggregate([
      { $match: { workspace: workspaceObjId } },
      {
        $lookup: {
          from: "workspace_roles",
          localField: "workspaceRole",
          foreignField: "_id",
          as: "wr",
        },
      },
      { $unwind: "$wr" },
      { $group: { _id: "$wr.slug", count: { $sum: 1 } } },
    ]);
    const counts = { fullAccess: 0 };
    rows.forEach((row) => {
      if (row._id === "full-access") counts.fullAccess += row.count;
    });
    return {
      fullAccessCount: counts.fullAccess,
    };
  },

  validateWorkspaceRoleUpdatePolicy: ({
    actorOrgPerms,
    actorWsPerms,
    actorUserId,
    targetUserId,
    targetRoleSlug,
    nextRoleSlug,
  }) => {
    if (!authorizationService.canManageWorkspaceUsers({ orgPerms: actorOrgPerms, wsPerms: actorWsPerms })) {
      return { ok: false, status: 403, message: "You do not have permission to manage workspace users." };
    }
    const orgHasElevatedControl =
      actorOrgPerms?.has("organization.members.invite") || actorOrgPerms?.has("organization.members.update");
    if (targetRoleSlug === "full-access" && !orgHasElevatedControl) {
      return { ok: false, status: 403, message: "Only organization owner/admin can update users with full access." };
    }
    if (nextRoleSlug === "full-access" && !orgHasElevatedControl) {
      return { ok: false, status: 403, message: "Only organization owner/admin can assign full access." };
    }
    if (
      String(actorUserId) === String(targetUserId) &&
      targetRoleSlug === "full-access" &&
      nextRoleSlug !== "full-access"
    ) {
      return { ok: false, status: 400, message: "You cannot demote your own full access role." };
    }
    return { ok: true };
  },

  validateWorkspaceRemovalPolicy: ({
    actorOrgPerms,
    actorWsPerms,
    actorUserId,
    targetUserId,
    targetRoleSlug,
  }) => {
    if (String(actorUserId) === String(targetUserId)) {
      return { ok: false, status: 400, message: "You cannot remove your own workspace membership." };
    }
    if (!authorizationService.canManageWorkspaceUsers({ orgPerms: actorOrgPerms, wsPerms: actorWsPerms })) {
      return { ok: false, status: 403, message: "You do not have permission to manage workspace users." };
    }
    const orgHasElevatedControl =
      actorOrgPerms?.has("organization.members.invite") || actorOrgPerms?.has("organization.members.update");
    if (targetRoleSlug === "full-access" && !orgHasElevatedControl) {
      return { ok: false, status: 403, message: "Only organization owner/admin can remove users with full access." };
    }
    return { ok: true };
  },

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

  createUserInWorkspace: async function ({
    fullName,
    username,
    email,
    password,
    role,
    workspaceRoleId,
    workspaceId,
  }) {
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return { ok: false, code: "WORKSPACE_NOT_FOUND" };
    }
    const organizationId = workspace.organization;
    await ensureOrganizationRbac(organizationId);

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      const alreadyMember = await workspaceService.findMembership(existingEmail._id, workspaceId);
      if (alreadyMember) {
        return { ok: false, code: "ALREADY_IN_WORKSPACE" };
      }

      const orgMember = await OrganizationMember.findOne({
        user: existingEmail._id,
        organization: organizationId,
      }).lean();

      await workspaceService.addMember({
        userId: existingEmail._id,
        workspaceId,
        organizationId,
        workspaceRoleId,
        role: role || "viewer",
      });
      if (!orgMember) {
        const memberRoleId =
          (await organizationService.resolveOrganizationRoleId(organizationId, "member")) ||
          (await OrganizationRole.findOne({ organization: organizationId, slug: "member" }).select("_id").lean())?._id;
        if (memberRoleId) {
          await OrganizationMember.create({
            user: existingEmail._id,
            organization: organizationId,
            isOwner: false,
            organizationRole: memberRoleId,
          });
        }
      }
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
      role: "user",
    });
    await newUser.save();
    await workspaceService.addMember({
      userId: newUser._id,
      workspaceId,
      organizationId,
      workspaceRoleId,
      role: role || "viewer",
    });
    const memberRoleId =
      (await organizationService.resolveOrganizationRoleId(organizationId, "member")) ||
      (await OrganizationRole.findOne({ organization: organizationId, slug: "member" }).select("_id").lean())?._id;
    if (memberRoleId) {
      await OrganizationMember.create({
        user: newUser._id,
        organization: organizationId,
        isOwner: false,
        organizationRole: memberRoleId,
      });
    }
    return { ok: true, user: newUser, addedExisting: false };
  },

  updateUserById: async function (id, updateBody, workspaceId) {
    const member = await workspaceService.findMembership(id, workspaceId);
    if (!member) return null;

    const { role: workspaceRoleLegacy, workspaceRoleId, workspaceRole, ...userFields } = updateBody;
    const user = await User.findById(id);
    if (!user) return null;

    Object.assign(user, userFields);
    await user.save();

    const roleInput = workspaceRoleId ? undefined : workspaceRole || workspaceRoleLegacy;
    if (workspaceRoleId || roleInput) {
      await workspaceService.updateMemberRole({
        userId: id,
        workspaceId,
        workspaceRoleId,
        role: roleInput,
      });
    }

    const populated = await User.findById(id).populate("profile_picture");
    const m = await workspaceService.findMembership(id, workspaceId);
    const obj = populated.toObject ? populated.toObject() : { ...populated };
    obj.role = m?.workspaceRole?.name || "Role";
    obj.workspaceRoleSlug = m?.workspaceRole?.slug || null;
    obj.workspaceRoleId = m?.workspaceRole?._id ? String(m.workspaceRole._id) : null;
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
