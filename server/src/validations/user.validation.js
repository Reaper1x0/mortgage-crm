const Joi = require("joi");
const { fullName, usernameValidator } = require("./custom.validation");
const { AUTH } = require("../constants");

const createUser = {
  body: Joi.object().keys({
    fullName: Joi.string()
      .required()
      .custom(fullName)
      .messages({
        "string.pattern.base": AUTH.VALID_NAME,
      }),
    username: Joi.string()
      .required()
      .custom(usernameValidator)
      .messages({
        "string.pattern.base": AUTH.VALID_USERNAME,
      }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": AUTH.VALID_EMAIL,
      }),
    password: Joi.string().min(8).required().messages({
      "string.min": AUTH.PASSWORD_LENGTH,
      "any.required": AUTH.PASSWORD_REQUIRED,
    }),
    role: Joi.string()
      .valid("Admin", "Agent", "Viewer")
      .default("Viewer")
      .messages({
        "any.only": "Role must be one of: Admin, Agent, Viewer",
      }),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    fullName: Joi.string().custom(fullName).messages({
      "string.pattern.base": AUTH.VALID_NAME,
    }),
    username: Joi.string().custom(usernameValidator).messages({
      "string.pattern.base": AUTH.VALID_USERNAME,
    }),
    email: Joi.string().email({ tlds: { allow: false } }).messages({
      "string.email": AUTH.VALID_EMAIL,
    }),
    role: Joi.string()
      .valid("Admin", "Agent", "Viewer")
      .messages({
        "any.only": "Role must be one of: Admin, Agent, Viewer",
      }),
    password: Joi.string().min(8).messages({
      "string.min": AUTH.PASSWORD_LENGTH,
    }),
  }),
};

const getUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const deleteUser = {
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
    role: Joi.string().valid("Admin", "Agent", "Viewer"),
    search: Joi.string().allow(""),
  }),
};

module.exports = {
  createUser,
  updateUser,
  getUser,
  deleteUser,
  listUsers,
};

