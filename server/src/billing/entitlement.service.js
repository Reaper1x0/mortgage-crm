const { OrganizationSubscription, Workspace, Submission, Template, Plan } = require("../models");
const { ENTITLEMENT_CATALOG, isUnlimited } = require("./entitlementCatalog");
const usageService = require("./usage.service");

const getSubscriptionWithPlan = async (organizationId) => {
  return OrganizationSubscription.findOne({ organization: organizationId }).populate("plan").lean();
};

const getEffectiveEntitlements = (subscription) => {
  if (!subscription) return {};
  const planEntitlements = subscription?.plan?.entitlements || subscription?.planSnapshot?.entitlements || {};
  if (planEntitlements instanceof Map) {
    return Object.fromEntries(planEntitlements.entries());
  }
  return planEntitlements || {};
};

const getEntitlementValue = ({ subscription, key }) => {
  const all = getEffectiveEntitlements(subscription);
  if (typeof all[key] === "undefined") return null;
  return all[key];
};

const getCurrentCount = async ({ organizationId, workspaceId, featureKey }) => {
  switch (featureKey) {
    case "max_workspaces_per_organization":
      return Workspace.countDocuments({ organization: organizationId });
    case "max_submissions": {
      if (workspaceId) return Submission.countDocuments({ workspace: workspaceId });
      const wsIds = await Workspace.find({ organization: organizationId }).distinct("_id");
      if (!wsIds.length) return 0;
      return Submission.countDocuments({ workspace: { $in: wsIds } });
    }
    case "max_templates": {
      if (workspaceId) return Template.countDocuments({ workspace: workspaceId });
      const templateWsIds = await Workspace.find({ organization: organizationId }).distinct("_id");
      if (!templateWsIds.length) return 0;
      return Template.countDocuments({ workspace: { $in: templateWsIds } });
    }
    case "max_monthly_extractions":
      return usageService.getUsage({ organizationId, metricKey: featureKey });
    default:
      return 0;
  }
};

const assertWithinLimit = async ({ organizationId, workspaceId, featureKey, incrementBy = 1 }) => {
  const feature = ENTITLEMENT_CATALOG[featureKey];
  if (!feature) {
    return { ok: false, code: "FEATURE_NOT_AVAILABLE", feature: featureKey };
  }
  const subscription = await getSubscriptionWithPlan(organizationId);
  const value = getEntitlementValue({ subscription, key: featureKey });
  if (value === null || typeof value === "undefined") {
    return { ok: false, code: "FEATURE_NOT_AVAILABLE", feature: featureKey };
  }
  if (isUnlimited(value)) return { ok: true, limit: value, currentUsage: 0 };
  const currentUsage = await getCurrentCount({ organizationId, workspaceId, featureKey });
  const limit = Number(value || 0);
  if (currentUsage + incrementBy > limit) {
    return {
      ok: false,
      code: "PLAN_LIMIT_REACHED",
      feature: featureKey,
      limit,
      currentUsage,
      plan: subscription?.plan?.code || subscription?.planSnapshot?.code || null,
    };
  }
  return { ok: true, limit, currentUsage };
};

const listUsageSummary = async ({ organizationId }) => {
  const subscription = await getSubscriptionWithPlan(organizationId);
  const entitlements = getEffectiveEntitlements(subscription);
  const rows = await Promise.all(
    Object.keys(ENTITLEMENT_CATALOG).map(async (key) => {
      const limit = typeof entitlements[key] === "undefined" ? null : entitlements[key];
      const usage = await getCurrentCount({ organizationId, featureKey: key });
      return {
        key,
        label: ENTITLEMENT_CATALOG[key].label,
        description: ENTITLEMENT_CATALOG[key].description,
        type: ENTITLEMENT_CATALOG[key].type,
        limit,
        usage,
        unlimited: isUnlimited(limit),
      };
    })
  );
  return rows;
};

const sanitizePlanInputEntitlements = (rawEntitlements = {}) => {
  const output = {};
  for (const key of Object.keys(rawEntitlements || {})) {
    if (!ENTITLEMENT_CATALOG[key]) continue;
    output[key] = rawEntitlements[key];
  }
  return output;
};

const getPublicPlans = async () => {
  const plans = await Plan.find({ active: true, visible: true }).sort({ displayOrder: 1, createdAt: 1 }).lean();
  return plans.map((plan) => ({
    ...plan,
    entitlements:
      plan.entitlements instanceof Map ? Object.fromEntries(plan.entitlements.entries()) : plan.entitlements || {},
  }));
};

module.exports = {
  getSubscriptionWithPlan,
  getEffectiveEntitlements,
  getEntitlementValue,
  assertWithinLimit,
  listUsageSummary,
  sanitizePlanInputEntitlements,
  getPublicPlans,
};
