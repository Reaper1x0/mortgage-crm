const mammoth = require("mammoth");
const { formatDocxMarkdown } = require("../markdownFormatters");
const { createDocxImageOcrSession } = require("../docxImageOcr");

async function convertDocxToMarkdown({ buffer, fileName }) {
  const imageSession = createDocxImageOcrSession();

  const result = await mammoth.convertToMarkdown(
    { buffer },
    { convertImage: imageSession.convertImage }
  );

  const bodyWithOcr = imageSession.resolvePlaceholders(result?.value || "");
  const stats = imageSession.getStats();

  return {
    markdown: formatDocxMarkdown(fileName, bodyWithOcr),
    method: imageSession.getMethod(),
    embeddedImages: stats,
  };
}

module.exports = { convertDocxToMarkdown };
