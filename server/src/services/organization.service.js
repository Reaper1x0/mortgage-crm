const { Organization, OrganizationMember } = require("../models");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const OrganizationService = {
  createOrganization: async ({ name, createdBy }) => {
    const base = slugify(name) || "organization";
    let slug = base;
    let counter = 1;
    while (await Organization.findOne({ slug })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }

    const organization = await Organization.create({
      name: String(name || "Organization").trim(),
      slug,
      createdBy,
    });

    await OrganizationMember.create({
      user: createdBy,
      organization: organization._id,
      role: "Owner",
    });

    return organization;
  },

  findMembership: async (userId, organizationId) => {
    return OrganizationMember.findOne({ user: userId, organization: organizationId }).lean();
  },

  listForUser: async (userId) => {
    const memberships = await OrganizationMember.find({ user: userId }).populate("organization").lean();
    return memberships
      .filter((m) => m.organization)
      .map((m) => ({
        organizationId: String(m.organization._id),
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        branding: m.organization.branding || null,
      }));
  },

  updateBranding: async (organizationId, brandingPatch = {}) => {
    const organization = await Organization.findById(organizationId);
    if (!organization) return null;

    const next = { ...(organization.branding?.toObject ? organization.branding.toObject() : organization.branding) };
    for (const [key, val] of Object.entries(brandingPatch)) {
      if (typeof val !== "undefined") next[key] = val;
    }
    organization.branding = next;
    await organization.save();
    return organization;
  },

  updateProfile: async (organizationId, profilePatch = {}) => {
    const organization = await Organization.findById(organizationId);
    if (!organization) return null;

    const directFields = [
      "name",
      "legalName",
      "website",
      "industry",
      "size",
      "contactEmail",
      "phone",
    ];
    directFields.forEach((field) => {
      if (typeof profilePatch[field] !== "undefined") organization[field] = profilePatch[field];
    });

    if (profilePatch.address && typeof profilePatch.address === "object") {
      organization.address = {
        ...(organization.address?.toObject ? organization.address.toObject() : organization.address || {}),
        ...profilePatch.address,
      };
    }

    if (profilePatch.settings && typeof profilePatch.settings === "object") {
      organization.settings = {
        ...(organization.settings?.toObject ? organization.settings.toObject() : organization.settings || {}),
        ...profilePatch.settings,
      };
    }

    await organization.save();
    return organization;
  },
};

module.exports = OrganizationService;
