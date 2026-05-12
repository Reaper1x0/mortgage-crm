const { R4XX } = require("../Responses");
const entitlementService = require("../billing/entitlement.service");

const requireEntitlement = (featureKey) => async (req, res, next) => {
  try {
    const subscription =
      req.organizationSubscription || (await entitlementService.getSubscriptionWithPlan(req.organizationId));
    const value = entitlementService.getEntitlementValue({ subscription, key: featureKey });
    if (!value) {
      return R4XX(res, 403, "Feature is not available in your current plan.", {
        code: "FEATURE_NOT_AVAILABLE",
        feature: featureKey,
      });
    }
    next();
  } catch (error) {
    return R4XX(res, 500, "Entitlement check failed.");
  }
};

module.exports = requireEntitlement;
