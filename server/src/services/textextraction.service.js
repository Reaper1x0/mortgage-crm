const { convertFileToMarkdown } = require("./document/markdownConversion.service");

async function extractTextFromFile(file, options = {}) {
  const { plainText } = await convertFileToMarkdown(file, options);
  return plainText;
}

module.exports = { extractTextFromFile };
