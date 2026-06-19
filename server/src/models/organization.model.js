const mongoose = require("mongoose");

const brandingSchema = new mongoose.Schema(
  {
    logoUrl: { type: String, trim: true, default: null },
    logoFile: { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null },
  },
  { _id: false }
);

const organizationSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    legalName: { type: String, trim: true, default: null, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    website: { type: String, trim: true, default: null },
    industry: { type: String, trim: true, default: null },
    size: { type: String, trim: true, default: null },
    contactEmail: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    address: {
      line1: { type: String, trim: true, default: null },
      line2: { type: String, trim: true, default: null },
      city: { type: String, trim: true, default: null },
      state: { type: String, trim: true, default: null },
      postalCode: { type: String, trim: true, default: null },
      country: { type: String, trim: true, default: null },
    },
    settings: {
      timezone: { type: String, trim: true, default: "UTC" },
      locale: { type: String, trim: true, default: "en" },
      currency: { type: String, trim: true, default: "USD" },
    },
    branding: { type: brandingSchema, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  },
  { timestamps: true }
);

organizationSchema.index({ slug: 1 }, { unique: true });

const Organization = mongoose.model("organizations", organizationSchema);

module.exports = Organization;
