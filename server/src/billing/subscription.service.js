const { Plan, OrganizationSubscription, StripeWebhookEvent } = require("../models");
const { getStripe } = require("./stripe.service");

const ACTIVE_OR_TRIAL = new Set(["active", "trialing"]);

const normalizeStripeStatus = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (
    ["trialing", "active", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"].includes(
      normalized
    )
  ) {
    return normalized;
  }
  return "incomplete";
};

const toUnix = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
};

const dateFromUnix = (value) => {
  const unix = toUnix(value);
  return unix ? new Date(unix * 1000) : null;
};

const resolveSubscriptionPeriod = (subscription) => {
  const item = subscription?.items?.data?.[0] || {};
  const periodStartUnix =
    toUnix(subscription?.current_period_start) ??
    toUnix(subscription?.currentPeriodStart) ??
    toUnix(item?.current_period_start) ??
    toUnix(item?.currentPeriodStart) ??
    null;
  const periodEndUnix =
    toUnix(subscription?.current_period_end) ??
    toUnix(subscription?.currentPeriodEnd) ??
    toUnix(item?.current_period_end) ??
    toUnix(item?.currentPeriodEnd) ??
    null;

  return {
    periodStart: periodStartUnix ? new Date(periodStartUnix * 1000) : null,
    periodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
  };
};

const findPlanByPriceId = async (priceId) => {
  if (!priceId) return null;
  return Plan.findOne({
    $or: [{ stripeMonthlyPriceId: priceId }, { stripeYearlyPriceId: priceId }],
    active: true,
  });
};

const upsertSubscriptionFromStripe = async ({ organizationId, subscription }) => {
  const item = subscription?.items?.data?.[0];
  const priceId = item?.price?.id || null;
  const plan = await findPlanByPriceId(priceId);
  if (!plan) {
    throw new Error(`No active plan mapped to Stripe price id ${priceId || "unknown"}.`);
  }
  const billingCycle = plan.stripeYearlyPriceId === priceId ? "yearly" : "monthly";
  const period = resolveSubscriptionPeriod(subscription);
  return OrganizationSubscription.findOneAndUpdate(
    { organization: organizationId },
    {
      organization: organizationId,
      plan: plan._id,
      stripeCustomerId: subscription.customer || null,
      stripeSubscriptionId: subscription.id || null,
      stripePriceId: priceId,
      billingCycle,
      status: normalizeStripeStatus(subscription.status),
      trialStart: dateFromUnix(subscription.trial_start),
      trialEnd: dateFromUnix(subscription.trial_end),
      currentPeriodStart: period.periodStart,
      currentPeriodEnd: period.periodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      lastSyncedAt: new Date(),
      planSnapshot: {
        code: plan.code,
        name: plan.name,
        entitlements: plan.entitlements || {},
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const resolveOrCreateStripeCustomer = async ({ organizationId, organizationName, existingCustomerId }) => {
  if (existingCustomerId) return existingCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: organizationName || `Organization ${organizationId}`,
    metadata: { organizationId: String(organizationId) },
  });
  return customer.id;
};

const createCheckoutSession = async ({
  organizationId,
  organizationName,
  plan,
  billingCycle = "monthly",
  successUrl,
  cancelUrl,
}) => {
  const stripe = getStripe();
  const existing = await OrganizationSubscription.findOne({ organization: organizationId }).lean();
  const customerId = await resolveOrCreateStripeCustomer({
    organizationId,
    organizationName,
    existingCustomerId: existing?.stripeCustomerId,
  });
  const priceId = billingCycle === "yearly" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
  if (!priceId) throw new Error("Selected billing cycle is not configured for this plan.");

  await OrganizationSubscription.findOneAndUpdate(
    { organization: organizationId },
    {
      organization: organizationId,
      plan: plan._id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      stripePriceId: null,
      status: "incomplete",
      lastSyncedAt: new Date(),
      planSnapshot: {
        code: plan.code,
        name: plan.name,
        entitlements: plan.entitlements || {},
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId: String(organizationId),
      planId: String(plan._id),
      billingCycle,
    },
    subscription_data: {
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: { organizationId: String(organizationId) },
    },
  });
};

const createPortalSession = async ({ customerId, returnUrl }) => {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

const changePlan = async ({ stripeSubscriptionId, targetPriceId, cancelAtPeriodEnd = false }) => {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const currentItem = subscription.items.data[0];
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
    items: [{ id: currentItem.id, price: targetPriceId }],
    proration_behavior: "create_prorations",
  });
};

const cancelSubscription = async ({ stripeSubscriptionId, immediate = false }) => {
  const stripe = getStripe();
  if (immediate) {
    return stripe.subscriptions.cancel(stripeSubscriptionId);
  }
  return stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
};

const resumeSubscription = async ({ stripeSubscriptionId }) => {
  const stripe = getStripe();
  return stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: false });
};

const canAccessOrganization = (subscription) => {
  if (!subscription) return false;
  const hasLiveSubscription = Boolean(subscription.stripeSubscriptionId);
  if (ACTIVE_OR_TRIAL.has(subscription.status) && hasLiveSubscription) return true;
  if (subscription.status === "past_due" && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd).getTime() >= Date.now();
  }
  return false;
};

const beginWebhookEvent = async (eventId, eventType) => {
  try {
    await StripeWebhookEvent.create({ eventId, eventType, status: "processing" });
    return { isDuplicate: false };
  } catch (err) {
    if (err?.code === 11000) return { isDuplicate: true };
    throw err;
  }
};

const completeWebhookEvent = async (
  eventId,
  status,
  failureReason = null,
  { organizationId = null, stripeSubscriptionId = null } = {}
) => {
  return StripeWebhookEvent.findOneAndUpdate(
    { eventId },
    {
      status,
      failureReason,
      processedAt: new Date(),
      ...(organizationId ? { organization: organizationId } : {}),
      ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
    },
    { new: true }
  );
};

module.exports = {
  normalizeStripeStatus,
  findPlanByPriceId,
  upsertSubscriptionFromStripe,
  createCheckoutSession,
  createPortalSession,
  changePlan,
  cancelSubscription,
  resumeSubscription,
  canAccessOrganization,
  beginWebhookEvent,
  completeWebhookEvent,
};
