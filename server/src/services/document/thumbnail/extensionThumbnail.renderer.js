const path = require("path");
const sharp = require("sharp");
const {
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WEBP_QUALITY,
} = require("./thumbnail.constants");

const EXT_COLORS = {
  pdf: "#DC2626",
  docx: "#2563EB",
  doc: "#2563EB",
  xlsx: "#16A34A",
  csv: "#16A34A",
  txt: "#64748B",
  png: "#7C3AED",
  jpg: "#7C3AED",
  jpeg: "#7C3AED",
  gif: "#7C3AED",
  webp: "#7C3AED",
  image: "#7C3AED",
};

function extractExtension(fileName, documentType) {
  const ext = path.extname(fileName || "").replace(/^\./, "").toLowerCase();
  if (ext) return ext.slice(0, 8);
  if (documentType && documentType !== "unknown") return documentType;
  return "file";
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fitFontSize(label) {
  if (label.length <= 4) return 96;
  if (label.length <= 6) return 72;
  return 56;
}

/**
 * Renders a simple hero thumbnail with the file extension prominently displayed.
 */
async function renderExtensionThumbnail(fileName, documentType) {
  const extKey = extractExtension(fileName, documentType);
  const label = extKey.toUpperCase();
  const color = EXT_COLORS[extKey] || "#64748B";
  const fontSize = fitFontSize(label);

  const svg = `
    <svg width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F8FAFC"/>
          <stop offset="100%" stop-color="#E2E8F0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="48" y="48" width="${THUMBNAIL_WIDTH - 96}" height="${THUMBNAIL_HEIGHT - 96}" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
      <text
        x="50%"
        y="52%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Segoe UI, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="${color}"
      >${escapeXml(label)}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
    .webp({ quality: THUMBNAIL_WEBP_QUALITY })
    .toBuffer();
}

module.exports = {
  renderExtensionThumbnail,
  extractExtension,
};
