const { Router } = require("express");
const {
  isAuth,
  validate,
  requireOrganization,
  requirePermission,
  attachWorkspacePermissionsIfPresent,
} = require("../middlewares");
const { organizationValidation } = require("../validations");
const OrganizationController = require("../controllers/organization.controller");
const { uploadBrandingImage } = require("../middlewares/brandingUpload.middleware");

const router = Router();

/* ── Public (auth only) ──────────────────────────────────────────────────── */
router.get("/", isAuth, OrganizationController.listMine);
router.get("/onboarding-session", isAuth, OrganizationController.onboardingSession);
router.post("/", isAuth, validate(organizationValidation.createOrganization), OrganizationController.create);

/* ── Permission catalog ──────────────────────────────────────────────────── */
router.get("/authz/catalog", isAuth, requireOrganization, OrganizationController.authzCatalog);
router.get("/authz/effective", isAuth, requireOrganization, OrganizationController.authzEffective);

/* ── Organization roles (CRUD) ───────────────────────────────────────────── */
router.get(
  "/roles/organization",
  isAuth, requireOrganization,
  requirePermission(
    ["organization.rbac.manage", "organization.members.invite", "organization.members.update"],
    { scope: "organization", mode: "any" }
  ),
  OrganizationController.listOrganizationRoles
);
router.post(
  "/roles/organization",
  isAuth, requireOrganization,
  requirePermission("organization.rbac.manage", { scope: "organization" }),
  OrganizationController.createOrganizationRole
);
router.patch(
  "/roles/organization/:roleId",
  isAuth, requireOrganization,
  requirePermission("organization.rbac.manage", { scope: "organization" }),
  OrganizationController.updateOrganizationRole
);
router.delete(
  "/roles/organization/:roleId",
  isAuth, requireOrganization,
  requirePermission("organization.rbac.manage", { scope: "organization" }),
  OrganizationController.deleteOrganizationRole
);

/* ── Workspace roles (CRUD) ──────────────────────────────────────────────── */
router.get(
  "/roles/workspace",
  isAuth,
  requireOrganization,
  attachWorkspacePermissionsIfPresent,
  requirePermission(
    [
      "organization.rbac.manage",
      "organization.members.invite",
      "organization.members.update",
      "organization.members.read",
      "workspace.users.read",
    ],
    { scope: "either", mode: "any" }
  ),
  OrganizationController.listWorkspaceRoles
);
router.post(
  "/roles/workspace",
  isAuth, requireOrganization,
  requirePermission("organization.rbac.manage", { scope: "organization" }),
  OrganizationController.createWorkspaceRole
);
router.patch(
  "/roles/workspace/:roleId",
  isAuth, requireOrganization,
  requirePermission("organization.rbac.manage", { scope: "organization" }),
  OrganizationController.updateWorkspaceRoleTemplate
);
router.delete(
  "/roles/workspace/:roleId",
  isAuth, requireOrganization,
  requirePermission("organization.rbac.manage", { scope: "organization" }),
  OrganizationController.deleteWorkspaceRole
);

/* ── Organization profile & branding ────────────────────────────────────── */
router.patch(
  "/profile",
  isAuth, requireOrganization,
  requirePermission("organization.organization.update", { scope: "organization" }),
  validate(organizationValidation.updateProfile),
  OrganizationController.updateProfile
);

const brandingMiddlewares = [
  isAuth,
  requireOrganization,
  requirePermission("organization.organization.update", { scope: "organization" }),
  uploadBrandingImage.single("logo"),
  OrganizationController.updateBranding,
];
router.patch("/branding", ...brandingMiddlewares);
router.post("/branding", ...brandingMiddlewares);
router.put("/branding", ...brandingMiddlewares);

/* ── Members ─────────────────────────────────────────────────────────────── */
router.get(
  "/members",
  isAuth, requireOrganization,
  requirePermission("organization.members.read", { scope: "organization" }),
  validate(organizationValidation.listMembers),
  OrganizationController.listMembers
);
router.post(
  "/members",
  isAuth, requireOrganization,
  requirePermission("organization.members.invite", { scope: "organization" }),
  validate(organizationValidation.addMember),
  OrganizationController.addMember
);
router.patch(
  "/members/:userId/role",
  isAuth, requireOrganization,
  requirePermission("organization.members.update", { scope: "organization" }),
  validate(organizationValidation.updateMemberRole),
  OrganizationController.updateMemberRole
);
router.patch(
  "/members/:userId/workspaces/:workspaceId/role",
  isAuth, requireOrganization,
  requirePermission("organization.members.update", { scope: "organization" }),
  validate(organizationValidation.updateWorkspaceRole),
  OrganizationController.updateMemberWorkspaceRole
);
router.delete(
  "/members/:userId/workspaces/:workspaceId",
  isAuth, requireOrganization,
  requirePermission("organization.members.update", { scope: "organization" }),
  validate(organizationValidation.removeWorkspaceAccess),
  OrganizationController.removeWorkspaceAccess
);
router.delete(
  "/members/:userId",
  isAuth, requireOrganization,
  requirePermission("organization.members.remove", { scope: "organization" }),
  validate(organizationValidation.removeMember),
  OrganizationController.removeMember
);

module.exports = router;
