const { formatOcrTextAsMarkdown } = require("../markdownFormatters");
const { detectTextFromBytes } = require("../textract.service");

async function convertImageToMarkdown({ buffer, fileName }) {
  const text = await detectTextFromBytes(buffer);
  return {
    markdown: formatOcrTextAsMarkdown(fileName, text),
    method: "textract",
  };
}

module.exports = { convertImageToMarkdown };
