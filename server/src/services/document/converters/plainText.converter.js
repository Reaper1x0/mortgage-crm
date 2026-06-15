const {
  formatCsvAsMarkdown,
  formatPlainTextAsMarkdown,
} = require("../markdownFormatters");

async function convertCsvToMarkdown({ buffer, fileName }) {
  const csvText = buffer.toString("utf8");
  return {
    markdown: formatCsvAsMarkdown(fileName, csvText),
    method: "csv",
  };
}

async function convertTxtToMarkdown({ buffer, fileName }) {
  const text = buffer.toString("utf8");
  return {
    markdown: formatPlainTextAsMarkdown(fileName, text),
    method: "txt",
  };
}

module.exports = {
  convertCsvToMarkdown,
  convertTxtToMarkdown,
};
