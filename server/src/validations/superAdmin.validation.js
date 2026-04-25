const Joi = require("joi");

const listSystemUsers = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    role: Joi.string().valid("superAdmin", "user"),
    orgRole: Joi.string().valid("Owner", "Admin", "Member", "Viewer"),
    search: Joi.string().allow(""),
  }),
};

module.exports = {
  listSystemUsers,
};
