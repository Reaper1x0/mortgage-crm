const Joi = require("joi");

const createWorkspace = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(120).required(),
    organizationId: Joi.string().trim().length(24).optional(),
    organizationName: Joi.string().trim().min(2).max(120).optional(),
  }),
};

module.exports = {
  createWorkspace,
};
