const { Router } = require("express");
const { billingController } = require("../controllers");
const { isAuth, requireOrganization, requirePermission, requireSystemRole, validate } = require("../middlewares");
const { billingValidation } = require("../validations");

const router = Router();

// Webhook is registered in app.js (before express.json) for raw body signature verification.

router.get("/plans/public", billingController.listPublicPlans);

router.get("/admin/plans", isAuth, requireSystemRole(["superAdmin"]), billingController.listAdminPlans);
router.get(
  "/admin/subscriptions",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(billingValidation.listAdminSubscriptions),
  billingController.listAdminSubscriptions
);
router.get(
  "/admin/subscriptions/:id",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(billingValidation.adminSubscriptionById),
  billingController.getAdminSubscriptionDetail
);
router.post(
  "/admin/subscriptions/:id/sync",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(billingValidation.adminSubscriptionById),
  billingController.syncAdminSubscription
);
router.post(
  "/admin/subscriptions/:id/cancellation",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(billingValidation.adminSubscriptionSetCancellation),
  billingController.setAdminSubscriptionCancellation
);
router.post(
  "/admin/plans/validate-prices",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(billingValidation.validateStripePrices),
  billingController.validateStripePrices
);
router.post(
  "/admin/plans",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(billingValidation.upsertPlan),
  billingController.upsertPlan
);
router.put(
  "/admin/plans/:id",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(billingValidation.upsertPlan),
  billingController.upsertPlan
);

router.get(
  "/organization",
  isAuth,
  requireOrganization,
  requirePermission(["organization.billing.read", "organization.billing.manage"], {
    scope: "organization",
    mode: "any",
  }),
  billingController.getOrganizationBilling
);
router.post(
  "/checkout",
  isAuth,
  requireOrganization,
  requirePermission("organization.billing.manage", { scope: "organization" }),
  validate(billingValidation.createCheckoutSession),
  billingController.createCheckoutSession
);
router.post(
  "/portal",
  isAuth,
  requireOrganization,
  requirePermission("organization.billing.manage", { scope: "organization" }),
  billingController.createPortalSession
);
router.post(
  "/change-plan",
  isAuth,
  requireOrganization,
  requirePermission("organization.billing.manage", { scope: "organization" }),
  validate(billingValidation.changePlan),
  billingController.changePlan
);
router.post(
  "/cancel",
  isAuth,
  requireOrganization,
  requirePermission("organization.billing.manage", { scope: "organization" }),
  validate(billingValidation.cancelSubscription),
  billingController.cancelSubscription
);
router.post(
  "/resume",
  isAuth,
  requireOrganization,
  requirePermission("organization.billing.manage", { scope: "organization" }),
  billingController.resumeSubscription
);

module.exports = router;
