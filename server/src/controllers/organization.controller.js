const { R2XX } = require("../Responses");
const { catchAsync } = require("../utils");
const organizationService = require("../services/organization.service");
const { FileService } = require("../services/file.service");

const OrganizationController = {
  listMine: catchAsync(async (req, res) => {
    const organizations = await organizationService.listForUser(req.user);
    return R2XX(res, "Organizations fetched successfully", 200, { organizations });
  }),

  create: catchAsync(async (req, res) => {
    const organization = await organizationService.createOrganization({
      name: req.body.name,
      createdBy: req.user,
    });
    return R2XX(res, "Organization created successfully", 201, {
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
    });
  }),

  updateBranding: catchAsync(async (req, res) => {
    const parseMaybeJson = (value) => {
      if (!value) return undefined;
      if (typeof value === "object") return value;
      try {
        return JSON.parse(value);
      } catch (_err) {
        return undefined;
      }
    };

    const patch = {
      primaryColor: req.body.primaryColor,
      secondaryColor: req.body.secondaryColor,
      themeMode: req.body.themeMode,
      logoUrl: typeof req.body.logoUrl !== "undefined" ? req.body.logoUrl : undefined,
      customVars: parseMaybeJson(req.body.customVars),
    };

    if (String(req.body.removeLogo || "").toLowerCase() === "true") {
      patch.logoUrl = null;
      patch.logoFile = null;
    }

    if (req.file) {
      const logo = await FileService.createFromUpload(
        {
          file: req.file,
          displayName: `organization-logo-${req.organizationId}`,
          folder: `uploads/branding/organizations/${req.organizationId}`,
          meta: {
            type: "branding_logo",
            organizationId: req.organizationId,
            skipAuditLog: true,
          },
        },
        req.user,
        req.user
      );
      patch.logoFile = logo._id;
      patch.logoUrl = logo.url || null;
    }

    const organization = await organizationService.updateBranding(req.organizationId, patch);
    return R2XX(res, "Organization branding updated successfully", 200, {
      organization: {
        _id: organization._id,
        branding: organization.branding,
      },
    });
  }),

  updateProfile: catchAsync(async (req, res) => {
    const toNullOrValue = (v) => (typeof v === "undefined" ? undefined : v === "" ? null : v);
    const profilePatch = {
      name: toNullOrValue(req.body.name),
      legalName: toNullOrValue(req.body.legalName),
      website: toNullOrValue(req.body.website),
      industry: toNullOrValue(req.body.industry),
      size: toNullOrValue(req.body.size),
      contactEmail: toNullOrValue(req.body.contactEmail),
      phone: toNullOrValue(req.body.phone),
      address: {
        line1: toNullOrValue(req.body.addressLine1),
        line2: toNullOrValue(req.body.addressLine2),
        city: toNullOrValue(req.body.addressCity),
        state: toNullOrValue(req.body.addressState),
        postalCode: toNullOrValue(req.body.addressPostalCode),
        country: toNullOrValue(req.body.addressCountry),
      },
      settings: {
        timezone: toNullOrValue(req.body.settingsTimezone),
        locale: toNullOrValue(req.body.settingsLocale),
        currency: toNullOrValue(req.body.settingsCurrency),
      },
    };

    const organization = await organizationService.updateProfile(req.organizationId, profilePatch);
    return R2XX(res, "Organization profile updated successfully", 200, {
      organization: {
        _id: organization._id,
        name: organization.name,
        legalName: organization.legalName,
        website: organization.website,
        industry: organization.industry,
        size: organization.size,
        contactEmail: organization.contactEmail,
        phone: organization.phone,
        address: organization.address,
        settings: organization.settings,
      },
    });
  }),
};

module.exports = OrganizationController;
