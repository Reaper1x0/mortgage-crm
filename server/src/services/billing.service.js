const { Organization, Plan, OrganizationSubscription, StripeWebhookEvent } = require("../models");
const entitlementService = require("../billing/entitlement.service");
const { ENTITLEMENT_KEYS } = require("../billing/entitlementCatalog");
const subscriptionService = require("../billing/subscription.service");
const usageService = require("../billing/usage.service");
const { envConfig } = require("../config");
const { getStripe } = require("../billing/stripe.service");
const { buildPaginationMeta } = require("../utils/pagination.utils");

const createBillingError = (billingCode, message, statusCode = 400, meta = {}) => {
  const error = new Error(message);
  error.billingCode = billingCode;
  error.statusCode = statusCode;
  error.meta = meta;
  return error;
};

const formatPrice = ({ amount = null, currency = "usd", suffix = "" }) => {
  if (amount === null || typeof amount === "undefined") return null;
  const value = Number(amount) / 100;
  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)}${suffix}`;
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

const resolveStripePeriodDates = (stripeSubscription) => {
  const item = stripeSubscription?.items?.data?.[0] || {};
  return {
    currentPeriodStart: dateFromUnix(
      stripeSubscription?.current_period_start ??
        stripeSubscription?.currentPeriodStart ??
        item?.current_period_start ??
        item?.currentPeriodStart ??
        null
    ),
    currentPeriodEnd: dateFromUnix(
      stripeSubscription?.current_period_end ??
        stripeSubscription?.currentPeriodEnd ??
        item?.current_period_end ??
        item?.currentPeriodEnd ??
        null
    ),
    trialStart: dateFromUnix(stripeSubscription?.trial_start ?? stripeSubscription?.trialStart ?? null),
    trialEnd: dateFromUnix(stripeSubscription?.trial_end ?? stripeSubscription?.trialEnd ?? null),
  };
};

const normalizeStripePrice = (price, expectedInterval, label = "price") => {
  if (!price) throw createBillingError("STRIPE_PRICE_NOT_FOUND", "Stripe price was not found.");
  if (!price.active) {
    throw createBillingError("STRIPE_PRICE_INACTIVE", "Stripe price must be active.");
  }
  if (price.type !== "recurring" || !price.recurring?.interval) {
    throw createBillingError("STRIPE_PRICE_NOT_RECURRING", "Stripe price must be recurring.");
  }
  if (price.recurring.interval !== expectedInterval) {
    throw createBillingError(
      "STRIPE_PRICE_INTERVAL_MISMATCH",
      `Stripe ${label} interval must be ${expectedInterval}.`
    );
  }
  return {
    id: price.id,
    currency: String(price.currency || "usd").toUpperCase(),
    interval: price.recurring.interval,
    intervalCount: price.recurring.interval_count || 1,
    unitAmount: typeof price.unit_amount === "number" ? price.unit_amount : null,
    productName:
      typeof price.product === "object" && price.product !== null ? price.product.name || null : null,
    nickname: price.nickname || null,
    displayAmount: formatPrice({
      amount: price.unit_amount,
      currency: price.currency,
      suffix: expectedInterval === "month" ? "/mo" : "/yr",
    }),
  };
};

const resolveSingleStripePrice = async ({ priceId, expectedInterval, label }) => {
  const stripe = getStripe();
  try {
    const raw = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    return normalizeStripePrice(raw, expectedInterval, label);
  } catch (error) {
    if (error?.billingCode) throw error;
    if (error?.type === "StripeInvalidRequestError") {
      throw createBillingError(
        "STRIPE_PRICE_NOT_FOUND",
        `Stripe ${label} price ID is invalid or unavailable.`,
        400,
        { label, priceId }
      );
    }
    throw error;
  }
};

const resolveAndValidateStripePrices = async ({ stripeMonthlyPriceId, stripeYearlyPriceId }) => {
  const [monthly, yearly] = await Promise.all([
    resolveSingleStripePrice({
      priceId: stripeMonthlyPriceId,
      expectedInterval: "month",
      label: "monthly",
    }),
    resolveSingleStripePrice({
      priceId: stripeYearlyPriceId,
      expectedInterval: "year",
      label: "yearly",
    }),
  ]);

  if (monthly.currency !== yearly.currency) {
    throw createBillingError("STRIPE_PRICE_CURRENCY_MISMATCH", "Monthly and yearly prices must share currency.");
  }

  return {
    monthly,
    yearly,
    currency: monthly.currency,
    display: {
      monthly: monthly.displayAmount,
      yearly: yearly.displayAmount,
    },
  };
};

const normalizePlanEntitlements = (plan) => {
  const raw =
    plan.entitlements instanceof Map ? Object.fromEntries(plan.entitlements.entries()) : plan.entitlements || {};
  const out = {};
  for (const key of ENTITLEMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) out[key] = raw[key];
  }
  return out;
};

/** Stripe return URLs must include organization id (URL-tenant model; no localStorage org). */
function stripeReturnUrlsForOrganization(organizationId) {
  const id = String(organizationId || "").replace(/\/+/g, "");
  if (!id) return { successUrl: "", cancelUrl: "", portalReturnUrl: "" };
  const base = String(envConfig.FRONTEND_URL || "").trim().replace(/\/+$/, "");
  if (base) {
    return {
      successUrl: `${base}/${id}/onboarding?checkout=success`,
      cancelUrl: `${base}/${id}/onboarding?checkout=cancel`,
      portalReturnUrl: `${base}/${id}/settings/billing`,
    };
  }
  const seed = envConfig.STRIPE_SUCCESS_URL || envConfig.STRIPE_CANCEL_URL || "";
  try {
    const origin = seed ? new URL(seed).origin : "";
    if (!origin) return { successUrl: "", cancelUrl: "", portalReturnUrl: "" };
    return {
      successUrl: `${origin}/${id}/onboarding?checkout=success`,
      cancelUrl: `${origin}/${id}/onboarding?checkout=cancel`,
      portalReturnUrl: `${origin}/${id}/settings/billing`,
    };
  } catch {
    return { successUrl: "", cancelUrl: "", portalReturnUrl: "" };
  }
}

const attachStripePricingToPlan = async (plan) => {
  const entitlements = normalizePlanEntitlements(plan);
  try {
    const pricing = await resolveAndValidateStripePrices({
      stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
      stripeYearlyPriceId: plan.stripeYearlyPriceId,
    });
    return { ...plan, entitlements, pricing };
  } catch (_err) {
    return { ...plan, entitlements, pricing: null };
  }
};

const BillingService = {
  listPublicPlans: async () => {
    const plans = await entitlementService.getPublicPlans();
    return Promise.all(plans.map((plan) => attachStripePricingToPlan(plan)));
  },

  listPlansForAdmin: async () => {
    const plans = await Plan.find({}).sort({ displayOrder: 1, createdAt: 1 }).lean();
    return Promise.all(plans.map((plan) => attachStripePricingToPlan(plan)));
  },

  listSubscriptionsForAdmin: async ({
    page = 1,
    limit = 10,
    search = "",
    status,
    billingCycle,
    cancelAtPeriodEnd,
  }) => {
    const filters = {};
    if (status) filters.status = String(status);
    if (billingCycle) filters.billingCycle = String(billingCycle);
    if (typeof cancelAtPeriodEnd === "boolean") filters.cancelAtPeriodEnd = cancelAtPeriodEnd;

    const matchStage = [{ $match: filters }];
    const lookupStage = [
      {
        $lookup: {
          from: "organizations",
          localField: "organization",
          foreignField: "_id",
          as: "organization",
        },
      },
      { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "plans",
          localField: "plan",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
    ];

    const searchText = String(search || "").trim();
    if (searchText) {
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      matchStage.push({
        $match: {
          $or: [
            { "organization.name": regex },
            { "plan.name": regex },
            { "plan.code": regex },
            { "planSnapshot.name": regex },
            { "planSnapshot.code": regex },
            { stripeCustomerId: regex },
            { stripeSubscriptionId: regex },
            { stripePriceId: regex },
            { status: regex },
          ],
        },
      });
    }

    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const safeLimit = Math.max(1, Number(limit) || 10);

    const [rowsAgg] = await OrganizationSubscription.aggregate([
      ...matchStage,
      ...lookupStage,
      {
        $sort: { updatedAt: -1 },
      },
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: safeLimit },
            {
              $project: {
                _id: 1,
                status: 1,
                billingCycle: 1,
                stripeCustomerId: 1,
                stripeSubscriptionId: 1,
                stripePriceId: 1,
                cancelAtPeriodEnd: 1,
                currentPeriodStart: 1,
                currentPeriodEnd: 1,
                trialStart: 1,
                trialEnd: 1,
                lastSyncedAt: 1,
                createdAt: 1,
                updatedAt: 1,
                organization: {
                  _id: "$organization._id",
                  name: "$organization.name",
                  slug: "$organization.slug",
                },
                plan: {
                  _id: "$plan._id",
                  name: "$plan.name",
                  code: "$plan.code",
                },
                planSnapshot: "$planSnapshot",
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const items = rowsAgg?.rows || [];
    const total = rowsAgg?.total?.[0]?.count || 0;

    const summaryAgg = await OrganizationSubscription.aggregate([
      ...matchStage,
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          activeSubscriptions: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          trialingSubscriptions: { $sum: { $cond: [{ $eq: ["$status", "trialing"] }, 1, 0] } },
          pastDueSubscriptions: { $sum: { $cond: [{ $eq: ["$status", "past_due"] }, 1, 0] } },
          canceledSubscriptions: { $sum: { $cond: [{ $eq: ["$status", "canceled"] }, 1, 0] } },
          incompleteSubscriptions: { $sum: { $cond: [{ $eq: ["$status", "incomplete"] }, 1, 0] } },
          scheduledToCancel: { $sum: { $cond: [{ $eq: ["$cancelAtPeriodEnd", true] }, 1, 0] } },
        },
      },
    ]);

    const summary = summaryAgg?.[0] || {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      pastDueSubscriptions: 0,
      canceledSubscriptions: 0,
      incompleteSubscriptions: 0,
      scheduledToCancel: 0,
    };

    return {
      items,
      pagination: buildPaginationMeta({
        page: Number(page) || 1,
        limit: safeLimit,
        total,
      }),
      summary,
    };
  },

  getAdminSubscriptionDetail: async ({ subscriptionId }) => {
    const subscription = await OrganizationSubscription.findById(subscriptionId)
      .populate("organization", "name slug")
      .populate("plan", "name code")
      .lean();
    if (!subscription) return null;

    const webhookFilters = [
      ...(subscription.organization?._id ? [{ organization: subscription.organization._id }] : []),
      ...(subscription.stripeSubscriptionId ? [{ stripeSubscriptionId: subscription.stripeSubscriptionId }] : []),
    ];
    const webhookEvents =
      webhookFilters.length > 0
        ? await StripeWebhookEvent.find({ $or: webhookFilters }).sort({ createdAt: -1 }).limit(30).lean()
        : [];

    const now = Date.now();
    const periodEndTs = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : null;
    const trialEndTs = subscription.trialEnd ? new Date(subscription.trialEnd).getTime() : null;
    const riskFlags = [
      ...(subscription.status === "past_due"
        ? [{ code: "PAST_DUE", severity: "high", label: "Payment is past due." }]
        : []),
      ...(subscription.status === "incomplete" || subscription.status === "incomplete_expired"
        ? [{ code: "INCOMPLETE", severity: "high", label: "Subscription was not completed." }]
        : []),
      ...(subscription.cancelAtPeriodEnd
        ? [{ code: "CANCEL_SCHEDULED", severity: "medium", label: "Subscription is scheduled to end." }]
        : []),
      ...(periodEndTs && periodEndTs < now
        ? [{ code: "PERIOD_ENDED", severity: "high", label: "Current period end date has passed." }]
        : []),
      ...(trialEndTs && trialEndTs < now && subscription.status === "trialing"
        ? [{ code: "TRIAL_PASSED", severity: "medium", label: "Trial end date has passed." }]
        : []),
      ...(!subscription.lastSyncedAt
        ? [{ code: "NEVER_SYNCED", severity: "medium", label: "Subscription was never synced from Stripe." }]
        : []),
    ];

    const lifecycleEvents = [
      {
        key: "created",
        type: "created",
        title: "Subscription record created",
        date: subscription.createdAt || null,
        meta: {
          status: subscription.status,
          billingCycle: subscription.billingCycle,
        },
      },
      ...(subscription.trialStart ? [{ key: "trial_start", type: "trial", title: "Trial started", date: subscription.trialStart }] : []),
      ...(subscription.trialEnd ? [{ key: "trial_end", type: "trial", title: "Trial ends", date: subscription.trialEnd }] : []),
      ...(subscription.currentPeriodStart
        ? [{ key: "period_start", type: "period", title: "Current period started", date: subscription.currentPeriodStart }]
        : []),
      ...(subscription.currentPeriodEnd
        ? [
            {
              key: "period_end",
              type: "period",
              title: subscription.cancelAtPeriodEnd ? "Subscription ends at period end" : "Next renewal date",
              date: subscription.currentPeriodEnd,
            },
          ]
        : []),
      ...(subscription.updatedAt ? [{ key: "updated", type: "updated", title: "Last updated", date: subscription.updatedAt }] : []),
    ]
      .filter((event) => event.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      subscription,
      riskFlags,
      lifecycleEvents,
      webhookEvents: webhookEvents.map((event) => ({
        eventId: event.eventId,
        eventType: event.eventType,
        status: event.status,
        failureReason: event.failureReason,
        stripeSubscriptionId: event.stripeSubscriptionId || null,
        processedAt: event.processedAt || null,
        createdAt: event.createdAt,
      })),
    };
  },

  syncAdminSubscriptionFromStripe: async ({ subscriptionId }) => {
    const subscription = await OrganizationSubscription.findById(subscriptionId).lean();
    if (!subscription?.stripeSubscriptionId || !subscription?.organization) return null;
    const stripeSubscription = await getStripe().subscriptions.retrieve(subscription.stripeSubscriptionId);
    await subscriptionService.upsertSubscriptionFromStripe({
      organizationId: subscription.organization,
      subscription: stripeSubscription,
    });
    return BillingService.getAdminSubscriptionDetail({ subscriptionId });
  },

  setAdminSubscriptionCancellation: async ({ subscriptionId, cancelAtPeriodEnd }) => {
    const subscription = await OrganizationSubscription.findById(subscriptionId).lean();
    if (!subscription?.stripeSubscriptionId || !subscription?.organization) return null;
    const stripeSubscription = cancelAtPeriodEnd
      ? await subscriptionService.cancelSubscription({
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          immediate: false,
        })
      : await subscriptionService.resumeSubscription({
          stripeSubscriptionId: subscription.stripeSubscriptionId,
        });
    await subscriptionService.upsertSubscriptionFromStripe({
      organizationId: subscription.organization,
      subscription: stripeSubscription,
    });
    return BillingService.getAdminSubscriptionDetail({ subscriptionId });
  },

  upsertPlan: async ({ id = null, payload }) => {
    if (!payload.stripeMonthlyPriceId || !payload.stripeYearlyPriceId) {
      throw createBillingError(
        "STRIPE_PRICE_REQUIRED",
        "Both monthly and yearly Stripe price IDs are required.",
        400
      );
    }
    const pricing = await resolveAndValidateStripePrices({
      stripeMonthlyPriceId: payload.stripeMonthlyPriceId,
      stripeYearlyPriceId: payload.stripeYearlyPriceId,
    });
    const entitlements = entitlementService.sanitizePlanInputEntitlements(payload.entitlements || {});
    if (id) {
      const saved = await Plan.findByIdAndUpdate(id, { ...payload, entitlements }, { new: true, lean: true });
      return { ...saved, entitlements: normalizePlanEntitlements(saved), pricing };
    }
    const saved = await Plan.create({ ...payload, entitlements });
    const plain = saved.toObject ? saved.toObject() : saved;
    return { ...plain, entitlements: normalizePlanEntitlements(plain), pricing };
  },

  validatePriceIds: async ({ stripeMonthlyPriceId, stripeYearlyPriceId }) =>
    resolveAndValidateStripePrices({ stripeMonthlyPriceId, stripeYearlyPriceId }),

  getOrganizationBillingState: async (organizationId) => {
    let subscription = await entitlementService.getSubscriptionWithPlan(organizationId);
    if (subscription?.stripeSubscriptionId && !subscription?.currentPeriodEnd) {
      try {
        const stripeSubscription = await getStripe().subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );
        try {
          await subscriptionService.upsertSubscriptionFromStripe({
            organizationId,
            subscription: stripeSubscription,
          });
        } catch (_upsertErr) {
          const period = resolveStripePeriodDates(stripeSubscription);
          await OrganizationSubscription.findOneAndUpdate(
            { organization: organizationId },
            {
              status: subscriptionService.normalizeStripeStatus(stripeSubscription.status),
              currentPeriodStart: period.currentPeriodStart,
              currentPeriodEnd: period.currentPeriodEnd,
              trialStart: period.trialStart,
              trialEnd: period.trialEnd,
              cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
              lastSyncedAt: new Date(),
            }
          );
        }
        subscription = await entitlementService.getSubscriptionWithPlan(organizationId);
      } catch (_err) {
        // Keep existing local snapshot if live sync fails.
      }
    }
    const usage = await entitlementService.listUsageSummary({ organizationId });
    return {
      subscription,
      usage,
      access: {
        canUseProduct: subscriptionService.canAccessOrganization(subscription),
        hasSubscriptionRecord: Boolean(subscription),
        requiresCheckout: !subscriptionService.canAccessOrganization(subscription),
      },
    };
  },

  createCheckoutSession: async ({ organizationId, planId, billingCycle }) => {
    const [organization, plan] = await Promise.all([
      Organization.findById(organizationId).lean(),
      Plan.findById(planId),
    ]);
    if (!organization || !plan) return null;
    const selectedPriceId =
      billingCycle === "yearly" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
    await resolveSingleStripePrice({
      priceId: selectedPriceId,
      expectedInterval: billingCycle === "yearly" ? "year" : "month",
      label: billingCycle,
    });
    const urls = stripeReturnUrlsForOrganization(organizationId);
    return subscriptionService.createCheckoutSession({
      organizationId,
      organizationName: organization.name,
      plan,
      billingCycle,
      successUrl: urls.successUrl || envConfig.STRIPE_SUCCESS_URL,
      cancelUrl: urls.cancelUrl || envConfig.STRIPE_CANCEL_URL,
    });
  },

  createPortalSession: async ({ organizationId }) => {
    const subscription = await OrganizationSubscription.findOne({ organization: organizationId }).lean();
    if (!subscription?.stripeCustomerId) return null;
    const urls = stripeReturnUrlsForOrganization(organizationId);
    return subscriptionService.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: urls.portalReturnUrl || envConfig.STRIPE_SUCCESS_URL,
    });
  },

  changePlan: async ({ organizationId, planId, billingCycle }) => {
    const [subscription, targetPlan] = await Promise.all([
      OrganizationSubscription.findOne({ organization: organizationId }).lean(),
      Plan.findById(planId),
    ]);
    if (!subscription?.stripeSubscriptionId || !targetPlan) return null;
    const targetPriceId =
      billingCycle === "yearly" ? targetPlan.stripeYearlyPriceId : targetPlan.stripeMonthlyPriceId;
    if (!targetPriceId) throw new Error("Target plan is missing Stripe price id for this cycle.");
    const stripeSubscription = await subscriptionService.changePlan({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      targetPriceId,
    });
    return subscriptionService.upsertSubscriptionFromStripe({ organizationId, subscription: stripeSubscription });
  },

  cancelSubscription: async ({ organizationId, immediate }) => {
    const subscription = await OrganizationSubscription.findOne({ organization: organizationId }).lean();
    if (!subscription?.stripeSubscriptionId) return null;
    const stripeSubscription = await subscriptionService.cancelSubscription({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      immediate,
    });
    return subscriptionService.upsertSubscriptionFromStripe({ organizationId, subscription: stripeSubscription });
  },

  resumeSubscription: async ({ organizationId }) => {
    const subscription = await OrganizationSubscription.findOne({ organization: organizationId }).lean();
    if (!subscription?.stripeSubscriptionId) return null;
    const stripeSubscription = await subscriptionService.resumeSubscription({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });
    return subscriptionService.upsertSubscriptionFromStripe({ organizationId, subscription: stripeSubscription });
  },

  trackExtractionUsage: async ({ organizationId, amount = 1 }) =>
    usageService.incrementUsage({
      organizationId,
      metricKey: "max_monthly_extractions",
      amount,
    }),
};

module.exports = BillingService;
