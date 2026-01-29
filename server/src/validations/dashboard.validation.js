const Joi = require("joi");

/**
 * Validation schema for dashboard query parameters
 * Supports range (daily|weekly|monthly) and optional date range
 */
const dashboardQuery = {
  query: Joi.object().keys({
    range: Joi.string()
      .valid("daily", "weekly", "monthly")
      .required()
      .messages({
        "any.only": "Range must be one of: daily, weekly, monthly",
        "any.required": "Range parameter is required",
      }),
    startDate: Joi.string()
      .isoDate()
      .optional()
      .messages({
        "string.isoDate": "startDate must be a valid ISO date string",
      }),
    endDate: Joi.string()
      .isoDate()
      .optional()
      .messages({
        "string.isoDate": "endDate must be a valid ISO date string",
      }),
  }).custom((value, helpers) => {
    // If both startDate and endDate are provided, validate startDate <= endDate
    if (value.startDate && value.endDate) {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      if (start > end) {
        return helpers.error("any.custom", {
          message: "startDate must be less than or equal to endDate",
        });
      }
    }
    return value;
  }),
};

module.exports = {
  dashboardQuery,
};

