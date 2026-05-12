const { R4XX } = require("../Responses");
const entitlementService = require("../billing/entitlement.service");
const { ENTITLEMENT_CATALOG } = require("../billing/entitlementCatalog");

const enforcePlanLimit = (featureKey, usageResolver = null) => async (req, res, next) => {
  try {
    const context = typeof usageResolver === "function" ? await usageResolver(req) : {};
    const check = await entitlementService.assertWithinLimit({
      organizationId: req.organizationId,
      workspaceId: context.workspaceId || req.workspaceId,
      featureKey,
      incrementBy: context.incrementBy || 1,
    });
    if (!check.ok) {
      const status = check.code === "FEATURE_NOT_AVAILABLE" ? 403 : 429;
      const featureLabel = ENTITLEMENT_CATALOG[featureKey]?.label || featureKey;
      const reason =
        check.code === "FEATURE_NOT_AVAILABLE"
          ? `${featureLabel} is not available in your current plan.`
          : `${featureLabel} limit reached for your current plan.`;
      return R4XX(res, status, reason, check);
    }
    req.planLimitCheck = check;
    next();
  } catch (error) {
    return R4XX(res, 500, "Plan limit check failed.");
  }
};

module.exports = enforcePlanLimit;
