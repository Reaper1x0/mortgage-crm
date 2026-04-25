const Joi = require("joi");

const createOrganization = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(120).required(),
  }),
};

const updateProfile = {
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(2).max(120).optional(),
      legalName: Joi.string().trim().max(160).allow("", null).optional(),
      website: Joi.string().trim().allow("", null).optional(),
      industry: Joi.string().trim().allow("", null).optional(),
      size: Joi.string().trim().allow("", null).optional(),
      contactEmail: Joi.string().trim().email().allow("", null).optional(),
      phone: Joi.string().trim().allow("", null).optional(),
      addressLine1: Joi.string().trim().allow("", null).optional(),
      addressLine2: Joi.string().trim().allow("", null).optional(),
      addressCity: Joi.string().trim().allow("", null).optional(),
      addressState: Joi.string().trim().allow("", null).optional(),
      addressPostalCode: Joi.string().trim().allow("", null).optional(),
      addressCountry: Joi.string().trim().allow("", null).optional(),
      settingsTimezone: Joi.string().trim().allow("", null).optional(),
      settingsLocale: Joi.string().trim().allow("", null).optional(),
      settingsCurrency: Joi.string().trim().allow("", null).optional(),
    })
    .min(1),
};

module.exports = {
  createOrganization,
  updateProfile,
};
