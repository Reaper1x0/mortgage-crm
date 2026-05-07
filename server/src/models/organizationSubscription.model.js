const mongoose = require("mongoose");

const organizationSubscriptionSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null, index: true },
    stripePriceId: { type: String, default: null },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "past_due",
        "unpaid",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "paused",
      ],
      default: "incomplete",
      index: true,
    },
    trialStart: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    lastSyncedAt: { type: Date, default: null },
    planSnapshot: {
      code: { type: String, default: "" },
      name: { type: String, default: "" },
      entitlements: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrganizationSubscription", organizationSubscriptionSchema);
