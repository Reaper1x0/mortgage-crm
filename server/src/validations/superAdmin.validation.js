const Joi = require("joi");

const listSystemUsers = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    role: Joi.string().valid("superAdmin", "user"),
    search: Joi.string().allow(""),
  }),
};

const listOrganizations = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow(""),
    subscriptionStatus: Joi.string().valid(
      "",
      "none",
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "paused"
    ),
  }),
};

const listWorkspaces = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow(""),
    subscriptionStatus: Joi.string().valid(
      "",
      "none",
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "paused"
    ),
  }),
};

module.exports = {
  listSystemUsers,
  listOrganizations,
  listWorkspaces,
};
