const { Plan } = require("../models");
const { sanitizePlanInputEntitlements } = require("../billing/entitlement.service");

const DEFAULT_STANDARD_PLAN = {
  name: "Standard",
  code: "standard",
  description: "",
  displayOrder: 0,
  stripeMonthlyPriceId: "price_1TQnBRRwUIgwRIYxs5jUGKSo",
  stripeYearlyPriceId: "price_1TQnByRwUIgwRIYxDPxg5sjP",
  active: true,
  visible: true,
  recommended: false,
  trialDays: 0,
  entitlements: {
    max_workspaces_per_organization: 2,
    max_submissions: 4,
    max_templates: 4,
    max_monthly_extractions: 20,
  },
};

async function ensureDefaultStandardPlan() {
  const existing = await Plan.findOne({ code: DEFAULT_STANDARD_PLAN.code }).lean();
  if (existing) {
    return existing;
  }

  const entitlements = sanitizePlanInputEntitlements(DEFAULT_STANDARD_PLAN.entitlements);
  const plan = await Plan.create({
    name: DEFAULT_STANDARD_PLAN.name,
    code: DEFAULT_STANDARD_PLAN.code,
    description: DEFAULT_STANDARD_PLAN.description,
    displayOrder: DEFAULT_STANDARD_PLAN.displayOrder,
    stripeMonthlyPriceId: DEFAULT_STANDARD_PLAN.stripeMonthlyPriceId,
    stripeYearlyPriceId: DEFAULT_STANDARD_PLAN.stripeYearlyPriceId,
    active: DEFAULT_STANDARD_PLAN.active,
    visible: DEFAULT_STANDARD_PLAN.visible,
    recommended: DEFAULT_STANDARD_PLAN.recommended,
    trialDays: DEFAULT_STANDARD_PLAN.trialDays,
    entitlements,
  });

  console.log(`[seed] Default plan created: ${plan.name} (${plan.code})`);
  return plan;
}

module.exports = {
  DEFAULT_STANDARD_PLAN,
  ensureDefaultStandardPlan,
};
