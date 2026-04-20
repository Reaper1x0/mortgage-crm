const { v4: uuidv4 } = require("uuid");
const { PDFDocument } = require("pdf-lib");
const { Template, MasterField, Submission, File } = require("../models");
const { renderPdfBuffer } = require("./pdfRender.service");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");
const storageService = require("./storage.service");
const AuditTrailService = require("./auditTrail.service");
const { getSignedFileUrl } = require("../utils/fileUrl.utils");

async function getPdfPageCount(fileBuffer) {
  const bytes = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().length;
}

const TemplateService = {
  createTemplate: async ({ name, file, workspaceId }) => {
    if (!file?.buffer) throw new Error("Template PDF buffer is missing");

    const pageCount = await getPdfPageCount(file.buffer);

    const storageInfo = await storageService.uploadBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      displayName: file.originalname,
      folder: `uploads/templates/${workspaceId}`,
      contentType: file.mimetype || "application/pdf",
      customMetadata: {
        workspaceId: String(workspaceId),
        type: "template_pdf",
      },
    });

    const doc = await Template.create({
      workspace: workspaceId,
      name,
      file: {
        originalName: file.originalname,
        storagePath: storageInfo.storage_path,
        url: storageInfo.url,
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

    const templateBuffer = await storageService.getObjectBuffer(tpl.file.storagePath);

    const pdfBuffer = await renderPdfBuffer({
      templatePdfBytes: templateBuffer,
      placements: tpl.placements,
      masterFieldsByKey,
      valuesByKey,
    });
    const outputName = `${templateId}-${uuidv4()}.pdf`;

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

    const signedUrl = savedFile?.storage_path
      ? await getSignedFileUrl(savedFile.storage_path, 60)
      : null;

    // Always return S3 URL shape (prefer signed URL over stored convenience URL)
    return {
      outputFileName: outputName,
      outputStoragePath: savedFile ? savedFile.storage_path : null,
      outputUrl: signedUrl || (savedFile ? savedFile.url : null),
      fileId: savedFile ? String(savedFile._id) : null,
      fileUrl: signedUrl || (savedFile ? savedFile.url : null),
    };
  },
};

module.exports = TemplateService;
