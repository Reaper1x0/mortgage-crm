const mongoose = require("mongoose");
const { ENTITLEMENT_KEYS } = require("../billing/entitlementCatalog");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, default: "", trim: true },
    displayOrder: { type: Number, default: 0 },
    stripeMonthlyPriceId: { type: String, default: null, trim: true },
    stripeYearlyPriceId: { type: String, default: null, trim: true },
    active: { type: Boolean, default: true },
    visible: { type: Boolean, default: true },
    recommended: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0, min: 0 },
    entitlements: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator(value) {
          const keys = Array.from(value?.keys?.() || []);
          return keys.every((key) => ENTITLEMENT_KEYS.includes(key));
        },
        message: "Unknown entitlement keys are not allowed.",
      },
    },
  },
  { timestamps: true }
);

planSchema.index({ active: 1, visible: 1, displayOrder: 1 });
planSchema.index({ stripeMonthlyPriceId: 1 }, { sparse: true });
planSchema.index({ stripeYearlyPriceId: 1 }, { sparse: true });

module.exports = mongoose.model("Plan", planSchema);
