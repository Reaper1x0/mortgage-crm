const Joi = require("joi");

const MASTER_FIELD_TYPES = ["string", "number", "date", "boolean", "array", "object"];

const listMasterFields = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.alternatives()
      .try(Joi.number().integer().min(-1).max(200), Joi.string().valid("all", "*", "0", "-1"))
      .default(10),
    sortBy: Joi.string()
      .valid("createdAt", "updatedAt", "key", "type", "required", "label")
      .default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    search: Joi.string().allow(""),
    type: Joi.string().valid(...MASTER_FIELD_TYPES).allow(""),
    required: Joi.string().valid("true", "false").allow(""),
    createdFrom: Joi.date().iso().optional().allow("", null),
    createdTo: Joi.date().iso().optional().allow("", null),
  }),
};

const bulkDeleteMasterFields = {
  body: Joi.object().keys({
    keys: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  }),
};

const bulkPreviewMasterFields = {
  body: Joi.object().keys({}),
};

const bulkImportMasterFields = {
  body: Joi.object().keys({
    rows: Joi.array().items(Joi.object().unknown(true)).required(),
    mapping: Joi.object({
      key: Joi.string().trim().required(),
      label: Joi.string().trim().allow("", null),
      type: Joi.string().trim().required(),
      required: Joi.string().trim().allow("", null),
      description: Joi.string().trim().allow("", null),
      validation_rules: Joi.string().trim().allow("", null),
    }).required(),
  }),
};

module.exports = {
  listMasterFields,
  bulkDeleteMasterFields,
  bulkPreviewMasterFields,
  bulkImportMasterFields,
  MASTER_FIELD_TYPES,
};
