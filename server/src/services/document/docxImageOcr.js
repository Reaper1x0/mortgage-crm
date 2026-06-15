const mammoth = require("mammoth");
const { formatEmbeddedImageOcrBlock } = require("./markdownFormatters");
const { detectTextFromBytes } = require("./textract.service");

const PLACEHOLDER_PREFIX = "docx-ocr-placeholder://";
const MIN_IMAGE_BYTES = 2048;
const OCR_SUPPORTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
  "image/tif",
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isOcrSupportedImage(contentType, buffer) {
  const type = String(contentType || "").toLowerCase();
  if (!type.startsWith("image/")) return false;
  if (!buffer || buffer.length < MIN_IMAGE_BYTES) return false;
  return OCR_SUPPORTED_TYPES.has(type);
}

function createDocxImageOcrSession() {
  const blocks = new Map();
  let imageCount = 0;
  let ocrCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  async function ocrEmbeddedImage(image) {
    imageCount += 1;
    const index = imageCount;

    let buffer;
    try {
      buffer = await image.readAsBuffer();
    } catch (err) {
      failedCount += 1;
      console.error(`DOCX embedded image ${index} read failed:`, err?.message || err);
      return null;
    }

    if (!isOcrSupportedImage(image.contentType, buffer)) {
      skippedCount += 1;
      return null;
    }

    try {
      const text = await detectTextFromBytes(buffer);
      const block = formatEmbeddedImageOcrBlock(text, index);
      if (!block) {
        skippedCount += 1;
        return null;
      }

      ocrCount += 1;
      const placeholder = `${PLACEHOLDER_PREFIX}${index}`;
      blocks.set(placeholder, block);
      return placeholder;
    } catch (err) {
      failedCount += 1;
      console.error(`DOCX embedded image ${index} OCR failed:`, err?.message || err);
      return null;
    }
  }

  const convertImage = mammoth.images.imgElement(async (image) => {
    const placeholder = await ocrEmbeddedImage(image);
    if (!placeholder) {
      return { src: "", alt: "" };
    }
    return { src: placeholder };
  });

  function resolvePlaceholders(markdown) {
    let result = String(markdown || "");

    for (const [placeholder, block] of blocks.entries()) {
      const pattern = new RegExp(`!\\[[^\\]]*\\]\\(${escapeRegExp(placeholder)}\\)`, "g");
      result = result.replace(pattern, block);
    }

    return result.replace(/!\[\]\(\)/g, "").trim();
  }

  function getStats() {
    return {
      imageCount,
      ocrCount,
      skippedCount,
      failedCount,
    };
  }

  function getMethod() {
    return ocrCount > 0 ? "mammoth+textract" : "mammoth";
  }

  return {
    convertImage,
    resolvePlaceholders,
    getStats,
    getMethod,
  };
}

module.exports = {
  createDocxImageOcrSession,
  PLACEHOLDER_PREFIX,
};
