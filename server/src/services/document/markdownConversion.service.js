const { detectDocumentType } = require("./documentType");
const { markdownToPlainText } = require("./markdownFormatters");
const { convertByType } = require("./converters");

function resolveFileName(file) {
  return file?.originalname || file?.name || "Document";
}

function resolveBuffer(file) {
  const buffer = file?.buffer;
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("convertFileToMarkdown requires an in-memory buffer.");
  }
  return buffer;
}

async function convertFileToMarkdown(file, options = {}) {
  const { storagePath = null } = options;
  const buffer = resolveBuffer(file);
  const fileName = resolveFileName(file);
  const type = detectDocumentType({
    mimetype: file?.mimetype,
    originalname: fileName,
  });

  const result = await convertByType(type, {
    buffer,
    fileName,
    storagePath,
  });

  return {
    ...result,
    type,
    plainText: markdownToPlainText(result.markdown),
  };
}

module.exports = {
  convertFileToMarkdown,
  markdownToPlainText,
};
