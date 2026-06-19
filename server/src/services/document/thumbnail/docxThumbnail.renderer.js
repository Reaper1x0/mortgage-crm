const AdmZip = require("adm-zip");
const mammoth = require("mammoth");
const sharp = require("sharp");
const { renderTextPreviewImage } = require("./canvasTextPreview");
const { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, THUMBNAIL_WEBP_QUALITY } = require("./thumbnail.constants");
const { encodeHeroWebp } = require("./thumbnail.encode.util");

const IMAGE_ENTRY_RE = /^word\/media\/.+\.(png|jpe?g|gif|webp|bmp|tiff?)$/i;

async function extractFirstDocxImage(buffer) {
  const zip = new AdmZip(buffer);
  const entry = zip
    .getEntries()
    .filter((item) => !item.isDirectory && IMAGE_ENTRY_RE.test(item.entryName.replace(/\\/g, "/")))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))[0];

  if (!entry) return null;
  const imageBuffer = entry.getData();
  if (!imageBuffer || imageBuffer.length < 512) return null;
  return imageBuffer;
}

async function renderDocxThumbnail(buffer, fileName) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("renderDocxThumbnail: buffer is required");
  }

  const embeddedImage = await extractFirstDocxImage(buffer);
  if (embeddedImage) {
    return sharp(embeddedImage)
      .rotate()
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: "cover",
        position: "top",
      })
      .webp({ quality: THUMBNAIL_WEBP_QUALITY })
      .toBuffer();
  }

  const raw = await mammoth.extractRawText({ buffer });
  const text = String(raw?.value || "").trim();
  if (!text) {
    throw new Error("DOCX has no previewable content");
  }

  const png = renderTextPreviewImage({
    title: fileName,
    body: text.slice(0, 1200),
    badgeLabel: "DOCX",
    badgeColor: "#2563EB",
  });

  return encodeHeroWebp(png);
}

module.exports = {
  renderDocxThumbnail,
};
