const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { PDFDocument } = require("pdf-lib");
const { Template, MasterField, Submission, File } = require("../models");
const { renderPdfToFile } = require("./pdfRender.service");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");
const storageService = require("./storage.service");
const AuditTrailService = require("./auditTrail.service");

const RENDER_DIR = path.join(process.cwd(), "uploads", "rendered");
fs.mkdirSync(RENDER_DIR, { recursive: true });

async function getPdfPageCount(filePath) {
  const bytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().length;
}

const TemplateService = {
  createTemplate: async ({ name, file, workspaceId }) => {
    const pageCount = await getPdfPageCount(file.path);

    const doc = await Template.create({
      workspace: workspaceId,
      name,
      file: {
        originalName: file.originalname,
        storagePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
      },
      pageCount,
      placements: [],
    });

    return doc;
  },

  listTemplates: async (opts = {}) => {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, workspaceId } = opts;

    return mongoosePaginate({
      model: Template,
      filter: { workspace: workspaceId },
      sort,
      page,
      limit,
      lean: true,
    });
  },

  getTemplateById: async (id, workspaceId) => {
    return Template.findOne({ _id: id, workspace: workspaceId });
  },

  savePlacements: async (templateId, placements, workspaceId) => {
    // Optional: validate duplicates placementId
    const ids = new Set();
    for (const p of placements) {
      if (!p.placementId) throw new Error("placementId is required");
      if (ids.has(p.placementId))
        throw new Error(`Duplicate placementId: ${p.placementId}`);
      ids.add(p.placementId);
    }

    return Template.findOneAndUpdate(
      { _id: templateId, workspace: workspaceId },
      { placements },
      { new: true }
    );
  },

  renderTemplate: async ({ templateId, valuesByKey, submissionId = null, userId = null, workspaceId }) => {
    const tpl = await Template.findOne({ _id: templateId, workspace: workspaceId });
    if (!tpl) throw new Error("Template not found");

    const keys = [...new Set(tpl.placements.map((p) => p.fieldKey))];
    const masterFields = await MasterField.find({ key: { $in: keys }, workspace: workspaceId });

    const masterFieldsByKey = {};
    for (const f of masterFields) masterFieldsByKey[f.key] = f;

    const outputName = `${templateId}-${uuidv4()}.pdf`;
    const outputPath = path.join(RENDER_DIR, outputName);

    await renderPdfToFile({
      templatePdfPath: tpl.file.storagePath,
      outputPdfPath: outputPath,
      placements: tpl.placements,
      masterFieldsByKey,
      valuesByKey,
    });

    // Read the generated PDF buffer
    const pdfBuffer = fs.readFileSync(outputPath);

    // Store in database using unified storage service
    let savedFile = null;
    if (submissionId && userId) {
      const storageInfo = await storageService.uploadBuffer({
        buffer: pdfBuffer,
        originalName: outputName,
        displayName: `Generated_${tpl.name}_${new Date().toISOString().split("T")[0]}.pdf`,
        folder: `uploads/submissions/${submissionId}/generated`,
        contentType: "application/pdf",
        customMetadata: {
          submissionId,
          templateId: String(templateId),
          templateName: tpl.name,
          generated: true,
          skipAuditLog: true, // Skip document_uploaded audit log since we log document_generated separately
        },
      });

      savedFile = await File.create({
        ...storageInfo,
        owner_id: userId,
        uploaded_by: userId,
        uploaded_at: new Date(),
        status: "uploaded",
        meta: storageInfo.meta,
      });

      // Add to submission's generated_documents array
      await Submission.findOneAndUpdate({ _id: submissionId, workspace: workspaceId }, {
        $push: {
          generated_documents: {
            template_id: templateId,
            template_name: tpl.name,
            file_id: savedFile._id,
            generated_by: userId,
            generated_at: new Date(),
            download_count: 0,
          },
        },
      });

      // Log audit trail
      await AuditTrailService.log({
        entity_type: "generated_document",
        entity_id: savedFile._id,
        user_id: userId,
        workspace: workspaceId,
        action: "document_generated",
        action_details: {
          template_id: String(templateId),
          template_name: tpl.name,
          file_name: outputName,
          file_size: pdfBuffer.length,
        },
        document_id: savedFile._id,
        document_name: outputName,
        submission_id: submissionId,
      });
    }

    // return a public URL served by express static
    return {
      outputFileName: outputName,
      outputStoragePath: outputPath,
      outputUrl: `/uploads/rendered/${outputName}`,
      fileId: savedFile ? String(savedFile._id) : null,
      fileUrl: savedFile ? savedFile.url : null,
    };
  },
};

module.exports = TemplateService;
