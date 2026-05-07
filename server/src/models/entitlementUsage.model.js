const mongoose = require("mongoose");
const { ENTITLEMENT_KEYS } = require("../billing/entitlementCatalog");

const entitlementUsageSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
      index: true,
    },
    metricKey: {
      type: String,
      required: true,
      enum: ENTITLEMENT_KEYS,
      index: true,
    },
    periodKey: {
      type: String,
      required: true,
      index: true,
    },
    usedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

entitlementUsageSchema.index({ organization: 1, metricKey: 1, periodKey: 1 }, { unique: true });

module.exports = mongoose.model("EntitlementUsage", entitlementUsageSchema);
