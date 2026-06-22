const Joi = require("joi");
const { objectId } = require("./custom.validation");

const optionalString = Joi.string().allow("").optional();

const createLead = {
  body: Joi.object().keys({
    fullName: Joi.string().trim().required(),
    email: Joi.string().email({ tlds: { allow: false } }).allow("").optional(),
    phone: optionalString,
    company: optionalString,
    source: optionalString,
    notes: optionalString,
  }),
};

const updateLead = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      fullName: Joi.string().trim().optional(),
      email: Joi.string().email({ tlds: { allow: false } }).allow("").optional(),
      phone: optionalString,
      company: optionalString,
      source: optionalString,
      notes: optionalString,
    })
    .min(1),
};

const deleteLead = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
};

const listLeads = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    search: Joi.string().allow(""),
    source: Joi.string().allow(""),
    company: Joi.string().allow(""),
    createdFrom: Joi.date().iso().optional().allow("", null),
    createdTo: Joi.date().iso().optional().allow("", null),
  }),
};

const bulkDeleteLeads = {
  body: Joi.object().keys({
    ids: Joi.array().items(Joi.string().required().custom(objectId)).min(1).required(),
  }),
};

const moveLeadToClient = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
};

const bulkMoveLeadsToClients = {
  body: Joi.object().keys({
    ids: Joi.array().items(Joi.string().required().custom(objectId)).min(1).required(),
  }),
};

const bulkPreviewLeads = {
  body: Joi.object().keys({}),
};

const bulkImportLeads = {
  body: Joi.object().keys({
    rows: Joi.array().items(Joi.object().unknown(true)).required(),
    mapping: Joi.object({
      fullName: Joi.string().trim().required(),
      email: Joi.string().trim().allow("", null),
      phone: Joi.string().trim().allow("", null),
      company: Joi.string().trim().allow("", null),
      source: Joi.string().trim().allow("", null),
      notes: Joi.string().trim().allow("", null),
    }).required(),
  }),
};

module.exports = {
  createLead,
  updateLead,
  deleteLead,
  listLeads,
  bulkDeleteLeads,
  moveLeadToClient,
  bulkMoveLeadsToClients,
  bulkPreviewLeads,
  bulkImportLeads,
};
