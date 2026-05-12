const mongoose = require("mongoose");

const stripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true, index: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      default: null,
      index: true,
    },
    stripeSubscriptionId: { type: String, default: null, index: true },
    processedAt: { type: Date, default: null },
    status: { type: String, enum: ["processing", "processed", "failed"], default: "processing" },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StripeWebhookEvent", stripeWebhookEventSchema);
