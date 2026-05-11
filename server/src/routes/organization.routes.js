const { Router } = require("express");
const { isAuth, validate, requireOrganization, hasRole } = require("../middlewares");
const { organizationValidation } = require("../validations");
const OrganizationController = require("../controllers/organization.controller");
const { uploadBrandingImage } = require("../middlewares/brandingUpload.middleware");

const router = Router();

router.get("/", isAuth, OrganizationController.listMine);
router.post("/", isAuth, validate(organizationValidation.createOrganization), OrganizationController.create);
router.patch(
  "/profile",
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin"] }),
  validate(organizationValidation.updateProfile),
  OrganizationController.updateProfile
);
router.get(
  "/members",
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin", "Member", "Viewer"] }),
  validate(organizationValidation.listMembers),
  OrganizationController.listMembers
);
router.post(
  "/members",
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin"] }),
  validate(organizationValidation.addMember),
  OrganizationController.addMember
);
router.patch(
  "/members/:userId/role",
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin"] }),
  validate(organizationValidation.updateMemberRole),
  OrganizationController.updateMemberRole
);
router.patch(
  "/members/:userId/workspaces/:workspaceId/role",
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin"] }),
  validate(organizationValidation.updateWorkspaceRole),
  OrganizationController.updateWorkspaceRole
);
router.delete(
  "/members/:userId/workspaces/:workspaceId",
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin"] }),
  validate(organizationValidation.removeWorkspaceAccess),
  OrganizationController.removeWorkspaceAccess
);
router.delete(
  "/members/:userId",
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin"] }),
  validate(organizationValidation.removeMember),
  OrganizationController.removeMember
);
const brandingMiddlewares = [
  isAuth,
  requireOrganization,
  hasRole({ scope: "organization", roles: ["Owner", "Admin"] }),
  uploadBrandingImage.single("logo"),
  OrganizationController.updateBranding,
];
router.patch("/branding", ...brandingMiddlewares);
router.post("/branding", ...brandingMiddlewares);
router.put("/branding", ...brandingMiddlewares);

module.exports = router;
