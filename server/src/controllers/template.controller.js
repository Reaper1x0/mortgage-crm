const { R2XX, R4XX } = require("../Responses");
const { templateService } = require("../services");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");

const TemplateController = {
  createTemplate: catchAsync(async (req, res) => {
    const { name } = req.body;
    if (!name) return R4XX(res, 400, "Template name is required");
    if (!req.file) return R4XX(res, 400, "PDF file is required");

    const template = await templateService.createTemplate({
      name,
      file: req.file,
    });

    return R2XX(res, "Template created", 201, { template });
  }),

  listTemplates: catchAsync(async (req, res) => {
    const { page, limit, sort } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "name", "pageCount"],
    });

    const { items, pagination } = await templateService.listTemplates({
      page,
      limit,
      sort,
    });

    return R2XX(res, "Templates fetched", 200, {
      templates: items,
      pagination,
    });
  }),

  getTemplate: catchAsync(async (req, res) => {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id);
    if (!template) return R4XX(res, 404, "Template not found");
    return R2XX(res, "Template fetched", 200, { template });
  }),

  savePlacements: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { placements } = req.body;

    if (!Array.isArray(placements))
      return R4XX(res, 400, "placements must be an array");

    const updated = await templateService.savePlacements(id, placements);
    if (!updated) return R4XX(res, 404, "Template not found");

    return R2XX(res, "Placements saved", 200, { template: updated });
  }),

  renderTemplate: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { values } = req.body; // { values: { key: value } }
    const valuesByKey = values || {};

    try {
      const result = await templateService.renderTemplate({
        templateId: id,
        valuesByKey,
      });
      return R2XX(res, "Rendered", 200, { result });
    } catch (e) {
      return R4XX(res, 400, e.message || "Render failed");
    }
  }),
};

module.exports = TemplateController;
