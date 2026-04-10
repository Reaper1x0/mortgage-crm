const Joi = require("joi");

const createWorkspace = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(120).required(),
  }),
};

module.exports = {
  createWorkspace,
};
