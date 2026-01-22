const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { PDFDocument } = require("pdf-lib");
const { Template, MasterField } = require("../models");
const { renderPdfToFile } = require("./pdfRender.service");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

const RENDER_DIR = path.join(process.cwd(), "uploads", "rendered");
fs.mkdirSync(RENDER_DIR, { recursive: true });

async function getPdfPageCount(filePath) {
  const bytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().length;
}

const TemplateService = {
  createTemplate: async ({ name, file }) => {
    const pageCount = await getPdfPageCount(file.path);

    const doc = await Template.create({
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
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = opts;

    return mongoosePaginate({
      model: Template,
      filter: {},
      sort,
      page,
      limit,
      lean: true,
    });
  },

  getTemplateById: async (id) => {
    return Template.findById(id);
  },

  savePlacements: async (templateId, placements) => {
    // Optional: validate duplicates placementId
    const ids = new Set();
    for (const p of placements) {
      if (!p.placementId) throw new Error("placementId is required");
      if (ids.has(p.placementId))
        throw new Error(`Duplicate placementId: ${p.placementId}`);
      ids.add(p.placementId);
    }

    return Template.findByIdAndUpdate(
      templateId,
      { placements },
      { new: true }
    );
  },

  renderTemplate: async ({ templateId, valuesByKey }) => {
    const tpl = await Template.findById(templateId);
    if (!tpl) throw new Error("Template not found");

    const keys = [...new Set(tpl.placements.map((p) => p.fieldKey))];
    const masterFields = await MasterField.find({ key: { $in: keys } });

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

    // return a public URL served by express static
    return {
      outputFileName: outputName,
      outputStoragePath: outputPath,
      outputUrl: `/uploads/rendered/${outputName}`,
    };
  },
};

module.exports = TemplateService;
