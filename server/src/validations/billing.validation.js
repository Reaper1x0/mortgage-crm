const Joi = require("joi");
const { ENTITLEMENT_KEYS } = require("../billing/entitlementCatalog");

const entitlementSchema = Joi.object(
  ENTITLEMENT_KEYS.reduce((acc, key) => {
    acc[key] = Joi.alternatives().try(Joi.number(), Joi.boolean(), Joi.valid(null));
    return acc;
  }, {})
);

const upsertPlan = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    code: Joi.string().required(),
    description: Joi.string().allow("").default(""),
    displayOrder: Joi.number().integer().default(0),
    stripeMonthlyPriceId: Joi.string().trim().pattern(/^price_/).required(),
    stripeYearlyPriceId: Joi.string().trim().pattern(/^price_/).required(),
    active: Joi.boolean().default(true),
    visible: Joi.boolean().default(true),
    recommended: Joi.boolean().default(false),
    trialDays: Joi.number().integer().min(0).default(0),
    entitlements: entitlementSchema.default({}),
  }),
};

const validateStripePrices = {
  body: Joi.object().keys({
    stripeMonthlyPriceId: Joi.string().trim().pattern(/^price_/).required(),
    stripeYearlyPriceId: Joi.string().trim().pattern(/^price_/).required(),
  }),
};

const listAdminSubscriptions = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow(""),
    status: Joi.string().valid(
      "",
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "paused"
    ),
    billingCycle: Joi.string().valid("", "monthly", "yearly"),
    cancelAtPeriodEnd: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("")),
  }),
};

const createCheckoutSession = {
  body: Joi.object().keys({
    planId: Joi.string().required(),
    billingCycle: Joi.string().valid("monthly", "yearly").default("monthly"),
  }),
};

const changePlan = {
  body: Joi.object().keys({
    planId: Joi.string().required(),
    billingCycle: Joi.string().valid("monthly", "yearly").default("monthly"),
  }),
};

const cancelSubscription = {
  body: Joi.object().keys({
    immediate: Joi.boolean().default(false),
  }),
};

const adminSubscriptionById = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const adminSubscriptionSetCancellation = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    cancelAtPeriodEnd: Joi.boolean().required(),
  }),
};

module.exports = {
  upsertPlan,
  validateStripePrices,
  listAdminSubscriptions,
  createCheckoutSession,
  changePlan,
  cancelSubscription,
  adminSubscriptionById,
  adminSubscriptionSetCancellation,
};
