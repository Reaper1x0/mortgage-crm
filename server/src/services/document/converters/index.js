const { detectDocumentType } = require("../documentType");
const { convertPdfToMarkdown } = require("./pdf.converter");
const { convertDocxToMarkdown } = require("./docx.converter");
const { convertImageToMarkdown } = require("./image.converter");
const { convertXlsxToMarkdown } = require("./spreadsheet.converter");
const { convertCsvToMarkdown, convertTxtToMarkdown } = require("./plainText.converter");

async function convertByType(type, input) {
  switch (type) {
    case "pdf":
      return convertPdfToMarkdown(input);
    case "docx":
      return convertDocxToMarkdown(input);
    case "image":
      return convertImageToMarkdown(input);
    case "xlsx":
      return convertXlsxToMarkdown(input);
    case "csv":
      return convertCsvToMarkdown(input);
    case "txt":
      return convertTxtToMarkdown(input);
    case "doc":
      throw new Error(
        "Legacy .doc files are not supported. Please upload DOCX, PDF, or image files."
      );
    default:
      throw new Error(
        "Unsupported file type for conversion. Please upload PDF, DOCX, XLSX, CSV, TXT, or image files."
      );
  }
}

module.exports = { convertByType };
