const pdfParse = require("pdf-parse");
const {
  formatPdfTextAsMarkdown,
  formatOcrTextAsMarkdown,
} = require("../markdownFormatters");
const { detectTextFromBytes, detectTextFromS3 } = require("../textract.service");

const PDF_TEXT_LAYER_MIN_CHARS = 20;

async function extractPdfTextLayer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return String(data?.text || "").trim();
  } catch (_) {
    return "";
  }
}

async function convertPdfToMarkdown({ buffer, fileName, storagePath = null }) {
  const textLayer = await extractPdfTextLayer(buffer);
  if (textLayer.length > PDF_TEXT_LAYER_MIN_CHARS) {
    return {
      markdown: formatPdfTextAsMarkdown(fileName, textLayer),
      method: "pdf-parse",
    };
  }

  const ocrText = storagePath
    ? await detectTextFromS3(storagePath)
    : await detectTextFromBytes(buffer);

  return {
    markdown: formatOcrTextAsMarkdown(fileName, ocrText),
    method: "textract",
  };
}

module.exports = { convertPdfToMarkdown };
