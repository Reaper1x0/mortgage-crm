const { R2XX, R4XX } = require("../Responses");
const { templateService } = require("../services");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const AuditTrailService = require("../services/auditTrail.service");
const storageService = require("../services/storage.service");

const TemplateController = {
  createTemplate: catchAsync(async (req, res) => {
    const { name } = req.body;
    const userId = req.user;
    if (!name) return R4XX(res, 400, "Template name is required");
    if (!req.file) return R4XX(res, 400, "PDF file is required");

    const template = await templateService.createTemplate({
      name,
      file: req.file,
      workspaceId: req.workspaceId,
    });

    // Log audit trail
    await AuditTrailService.log({
      entity_type: "template",
      entity_id: template._id,
      user_id: userId,
      workspace: req.workspaceId,
      action: "template_created",
      action_details: {
        template_id: template._id,
        template_name: name,
        file_name: req.file.originalname,
      },
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
      workspaceId: req.workspaceId,
    });

    const templatesWithUrls = await Promise.all(
      (items || []).map(async (item) => {
        const template = item.toObject ? item.toObject() : { ...item };
        if (template?.file?.storagePath) {
          const signed = await storageService.getSignedUrl(template.file.storagePath, 60);
          template.file.url = signed.url;
        }
        return template;
      })
    );

    return R2XX(res, "Templates fetched", 200, {
      templates: templatesWithUrls,
      pagination,
    });
  }),

  getTemplate: catchAsync(async (req, res) => {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id, req.workspaceId);
    if (!template) return R4XX(res, 404, "Template not found");
    const templateObj = template.toObject ? template.toObject() : { ...template };
    if (templateObj?.file?.storagePath) {
      const signed = await storageService.getSignedUrl(templateObj.file.storagePath, 60);
      templateObj.file.url = signed.url;
    }
    return R2XX(res, "Template fetched", 200, { template: templateObj });
  }),

  getTemplateFile: catchAsync(async (req, res) => {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id, req.workspaceId);
    if (!template) return R4XX(res, 404, "Template not found");

    const fileBuffer = await storageService.getObjectBuffer(template.file.storagePath);
    const fileName = template.file.originalName || `template-${id}.pdf`;

    res.setHeader("Content-Type", template.file.mimeType || "application/pdf");
    res.setHeader("Content-Length", String(fileBuffer.length));
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${String(fileName).replace(/"/g, "")}"`
    );
    return res.status(200).send(fileBuffer);
  }),

  savePlacements: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { placements } = req.body;
    const userId = req.user;

    if (!Array.isArray(placements))
      return R4XX(res, 400, "placements must be an array");

    const updated = await templateService.savePlacements(id, placements, req.workspaceId);
    if (!updated) return R4XX(res, 404, "Template not found");

    // Log audit trail
    await AuditTrailService.log({
      entity_type: "template",
      entity_id: id,
      user_id: userId,
      workspace: req.workspaceId,
      action: "template_updated",
      action_details: {
        template_id: id,
        template_name: updated.name,
        placements_count: placements.length,
        update_type: "placements",
      },
    });

    return R2XX(res, "Placements saved", 200, { template: updated });
  }),

  renderTemplate: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { values, submissionId } = req.body; // { values: { key: value }, submissionId?: string }
    const valuesByKey = values || {};
    const userId = req.user;

    try {
      const result = await templateService.renderTemplate({
        templateId: id,
        valuesByKey,
        submissionId: submissionId || null,
        userId: userId || null,
        workspaceId: req.workspaceId,
      });
      return R2XX(res, "Rendered", 200, { result });
    } catch (e) {
      return R4XX(res, 400, e.message || "Render failed");
    }
  }),
};

module.exports = TemplateController;
