const { renderImageThumbnail } = require("./imageThumbnail.renderer");
const { renderPdfThumbnail } = require("./pdfThumbnail.renderer");
const { renderDocxThumbnail } = require("./docxThumbnail.renderer");
const { renderSpreadsheetThumbnail } = require("./spreadsheetThumbnail.renderer");
const { renderTextThumbnail } = require("./textThumbnail.renderer");
const { renderPlaceholderThumbnail } = require("./placeholderThumbnail.renderer");

const RENDERERS = {
  image: ({ buffer }) => renderImageThumbnail(buffer),
  pdf: ({ buffer }) => renderPdfThumbnail(buffer),
  docx: ({ buffer, fileName }) => renderDocxThumbnail(buffer, fileName),
  doc: ({ fileName }) =>
    renderTextThumbnail(
      Buffer.from(`Legacy Word document: ${fileName}\n\nOpen the file to view full contents.`),
      fileName,
      "DOC"
    ),
  xlsx: ({ buffer, fileName }) => renderSpreadsheetThumbnail(buffer, fileName, "XLSX"),
  csv: ({ buffer, fileName }) => renderSpreadsheetThumbnail(buffer, fileName, "CSV"),
  txt: ({ buffer, fileName }) => renderTextThumbnail(buffer, fileName, "TXT"),
  default: ({ buffer, fileName }) => renderTextThumbnail(buffer, fileName, "FILE"),
};

function getThumbnailRenderer(documentType) {
  return RENDERERS[documentType] || RENDERERS.default;
}

module.exports = {
  getThumbnailRenderer,
  renderPlaceholderThumbnail,
};
