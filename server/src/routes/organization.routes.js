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
