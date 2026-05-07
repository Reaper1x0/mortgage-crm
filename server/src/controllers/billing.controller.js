const { R2XX, R4XX } = require("../Responses");
const { catchAsync } = require("../utils");
const { billingService } = require("../services");
const { OrganizationSubscription } = require("../models");
const { constructWebhookEvent, getStripe } = require("../billing/stripe.service");
const subscriptionService = require("../billing/subscription.service");
const { parsePagination } = require("../utils/pagination.utils");

const mapBillingError = (error) => {
  if (error?.billingCode) {
    const statusCode = Number(error.statusCode || 400);
    const reasonByCode = {
      STRIPE_PRICE_REQUIRED: "Monthly and yearly Stripe price IDs are required.",
      STRIPE_PRICE_NOT_FOUND: error?.message || "Stripe price ID is invalid.",
      STRIPE_PRICE_INACTIVE: "Provided Stripe prices must be active.",
      STRIPE_PRICE_NOT_RECURRING: "Provided Stripe prices must be recurring.",
      STRIPE_PRICE_INTERVAL_MISMATCH:
        "Monthly price must be monthly and yearly price must be yearly.",
      STRIPE_PRICE_CURRENCY_MISMATCH: "Monthly and yearly Stripe prices must use the same currency.",
    };
    return {
      statusCode,
      reason: reasonByCode[error.billingCode] || error.message || "Billing validation failed.",
      props: { code: error.billingCode, ...((error.meta && typeof error.meta === "object") ? error.meta : {}) },
    };
  }
  const message = String(error?.message || "");
  if (message.includes("Stripe is not configured")) {
    return {
      statusCode: 503,
      reason: "Billing is temporarily unavailable because Stripe is not configured.",
      props: { code: "STRIPE_NOT_CONFIGURED" },
    };
  }
  if (message.includes("Stripe webhook secret is not configured")) {
    return {
      statusCode: 503,
      reason: "Billing webhook is not configured.",
      props: { code: "STRIPE_WEBHOOK_NOT_CONFIGURED" },
    };
  }
  if (message.includes("missing Stripe price id") || message.includes("not configured for this plan")) {
    return {
      statusCode: 400,
      reason: "Selected plan is not configured for the requested billing cycle.",
      props: { code: "PLAN_PRICE_NOT_CONFIGURED" },
    };
  }
  if (error?.type === "StripeInvalidRequestError" || message.includes("No such price")) {
    const stripeMessage = error?.raw?.message || error?.message || "";
    const stripeParam = error?.raw?.param || error?.param || null;
    return {
      statusCode: 400,
      reason:
        stripeMessage ||
        "Stripe rejected the selected price ID. Verify this price exists in the same Stripe account and mode.",
      props: {
        code: "STRIPE_PRICE_NOT_FOUND",
        stripeParam,
      },
    };
  }
  return null;
};

const BillingController = {
  listPublicPlans: catchAsync(async (_req, res) => {
    const plans = await billingService.listPublicPlans();
    return R2XX(res, "Plans fetched successfully", 200, { plans });
  }),

  listAdminPlans: catchAsync(async (_req, res) => {
    const plans = await billingService.listPlansForAdmin();
    return R2XX(res, "Plans fetched successfully", 200, { plans });
  }),

  listAdminSubscriptions: catchAsync(async (req, res) => {
    const { page, limit } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "updatedAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["updatedAt"],
    });
    const data = await billingService.listSubscriptionsForAdmin({
      page,
      limit,
      search: req.query.search,
      status: req.query.status,
      billingCycle: req.query.billingCycle,
      cancelAtPeriodEnd:
        typeof req.query.cancelAtPeriodEnd === "undefined" ||
        String(req.query.cancelAtPeriodEnd).trim() === ""
          ? undefined
          : String(req.query.cancelAtPeriodEnd).toLowerCase() === "true",
    });
    return R2XX(res, "Admin subscriptions fetched successfully", 200, {
      subscriptions: data.items,
      summary: data.summary,
      pagination: data.pagination,
    });
  }),

  getAdminSubscriptionDetail: catchAsync(async (req, res) => {
    const detail = await billingService.getAdminSubscriptionDetail({ subscriptionId: req.params.id });
    if (!detail) return R4XX(res, 404, "Subscription not found.");
    return R2XX(res, "Admin subscription detail fetched successfully", 200, detail);
  }),

  syncAdminSubscription: catchAsync(async (req, res) => {
    try {
      const detail = await billingService.syncAdminSubscriptionFromStripe({ subscriptionId: req.params.id });
      if (!detail) return R4XX(res, 404, "Subscription not found.");
      return R2XX(res, "Subscription synced from Stripe successfully", 200, detail);
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  setAdminSubscriptionCancellation: catchAsync(async (req, res) => {
    try {
      const detail = await billingService.setAdminSubscriptionCancellation({
        subscriptionId: req.params.id,
        cancelAtPeriodEnd: Boolean(req.body.cancelAtPeriodEnd),
      });
      if (!detail) return R4XX(res, 404, "Subscription not found.");
      return R2XX(
        res,
        req.body.cancelAtPeriodEnd
          ? "Subscription scheduled for cancellation at period end"
          : "Subscription auto-renew resumed",
        200,
        detail
      );
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  upsertPlan: catchAsync(async (req, res) => {
    try {
      const plan = await billingService.upsertPlan({ id: req.params.id, payload: req.body });
      return R2XX(res, req.params.id ? "Plan updated successfully" : "Plan created successfully", 200, {
        plan,
      });
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  validateStripePrices: catchAsync(async (req, res) => {
    try {
      const pricing = await billingService.validatePriceIds({
        stripeMonthlyPriceId: req.body.stripeMonthlyPriceId,
        stripeYearlyPriceId: req.body.stripeYearlyPriceId,
      });
      return R2XX(res, "Stripe prices validated successfully", 200, { pricing });
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  getOrganizationBilling: catchAsync(async (req, res) => {
    const state = await billingService.getOrganizationBillingState(req.organizationId);
    return R2XX(res, "Billing details fetched successfully", 200, state);
  }),

  createCheckoutSession: catchAsync(async (req, res) => {
    try {
      const session = await billingService.createCheckoutSession({
        organizationId: req.organizationId,
        planId: req.body.planId,
        billingCycle: req.body.billingCycle,
      });
      if (!session) return R4XX(res, 404, "Plan or organization not found.");
      return R2XX(res, "Checkout session created successfully", 200, {
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  createPortalSession: catchAsync(async (req, res) => {
    try {
      const session = await billingService.createPortalSession({ organizationId: req.organizationId });
      if (!session) return R4XX(res, 404, "No billing profile found for organization.");
      return R2XX(res, "Billing portal session created successfully", 200, { portalUrl: session.url });
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  changePlan: catchAsync(async (req, res) => {
    try {
      const subscription = await billingService.changePlan({
        organizationId: req.organizationId,
        planId: req.body.planId,
        billingCycle: req.body.billingCycle,
      });
      if (!subscription) return R4XX(res, 404, "Active subscription not found.");
      return R2XX(res, "Plan changed successfully", 200, { subscription });
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  cancelSubscription: catchAsync(async (req, res) => {
    try {
      const subscription = await billingService.cancelSubscription({
        organizationId: req.organizationId,
        immediate: Boolean(req.body.immediate),
      });
      if (!subscription) return R4XX(res, 404, "Active subscription not found.");
      return R2XX(res, "Subscription cancellation updated successfully", 200, { subscription });
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  resumeSubscription: catchAsync(async (req, res) => {
    try {
      const subscription = await billingService.resumeSubscription({
        organizationId: req.organizationId,
      });
      if (!subscription) return R4XX(res, 404, "Active subscription not found.");
      return R2XX(res, "Subscription renewal restored successfully", 200, { subscription });
    } catch (error) {
      const mapped = mapBillingError(error);
      if (mapped) return R4XX(res, mapped.statusCode, mapped.reason, mapped.props);
      throw error;
    }
  }),

  handleStripeWebhook: catchAsync(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    let event;
    try {
      event = constructWebhookEvent(req.rawBody || req.body, signature);
    } catch (error) {
      return R4XX(res, 400, "Invalid webhook signature.");
    }

    const begin = await subscriptionService.beginWebhookEvent(event.id, event.type);
    if (begin.isDuplicate) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          let eventOrgId = session.metadata?.organizationId || null;
          const eventStripeSubId =
            typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;
          if (session.metadata?.organizationId && session.subscription) {
            const orgId = session.metadata.organizationId;
            const sub = await getStripe().subscriptions.retrieve(session.subscription);
            await subscriptionService.upsertSubscriptionFromStripe({ organizationId: orgId, subscription: sub });
          }
          await subscriptionService.completeWebhookEvent(event.id, "processed", null, {
            organizationId: eventOrgId,
            stripeSubscriptionId: eventStripeSubId,
          });
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const orgId = sub.metadata?.organizationId;
          const eventStripeSubId = sub.id || null;
          let eventOrgId = orgId || null;
          if (orgId) {
            await subscriptionService.upsertSubscriptionFromStripe({ organizationId: orgId, subscription: sub });
          } else {
            const updated = await OrganizationSubscription.findOneAndUpdate(
              { stripeSubscriptionId: sub.id },
              {
                status: subscriptionService.normalizeStripeStatus(sub.status),
                cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
                lastSyncedAt: new Date(),
              }
            );
            if (updated?.organization) eventOrgId = updated.organization;
          }
          await subscriptionService.completeWebhookEvent(event.id, "processed", null, {
            organizationId: eventOrgId,
            stripeSubscriptionId: eventStripeSubId,
          });
          break;
        }
        case "invoice.paid":
        case "invoice.payment_failed":
        case "customer.subscription.trial_will_end":
          await subscriptionService.completeWebhookEvent(event.id, "processed");
          break;
        default:
          await subscriptionService.completeWebhookEvent(event.id, "processed");
          break;
      }
      return res.status(200).json({ received: true });
    } catch (error) {
      await subscriptionService.completeWebhookEvent(event.id, "failed", error.message || "Webhook failed");
      return res.status(500).json({ received: false });
    }
  }),
};

module.exports = BillingController;
