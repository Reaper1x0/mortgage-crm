const Joi = require("joi");

const getUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const listUsers = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    role: Joi.string(),
    workspaceRoleId: Joi.string().hex().length(24),
    search: Joi.string().allow(""),
  }),
};

module.exports = {
  getUser,
  listUsers,
};
