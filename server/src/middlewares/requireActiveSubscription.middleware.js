const { R4XX } = require("../Responses");
const subscriptionService = require("../billing/subscription.service");
const entitlementService = require("../billing/entitlement.service");

const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.organizationId) return R4XX(res, 400, "Organization context is required.");
    const subscription = await entitlementService.getSubscriptionWithPlan(req.organizationId);
    if (!subscriptionService.canAccessOrganization(subscription)) {
      return R4XX(res, 402, "Active subscription required.", {
        code: "SUBSCRIPTION_REQUIRED",
      });
    }
    req.organizationSubscription = subscription;
    next();
  } catch (error) {
    return R4XX(res, 500, "Subscription validation failed.");
  }
};

module.exports = requireActiveSubscription;
