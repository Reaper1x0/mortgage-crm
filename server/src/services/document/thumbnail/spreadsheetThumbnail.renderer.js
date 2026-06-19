const xlsx = require("xlsx");
const { renderTextPreviewImage } = require("./canvasTextPreview");
const { encodeHeroWebp } = require("./thumbnail.encode.util");

function sheetToPreviewText(workbook, maxRows = 12) {
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return "";
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  return rows
    .slice(0, maxRows)
    .map((row) => (Array.isArray(row) ? row.join("  |  ") : String(row)))
    .join("\n")
    .trim();
}

async function renderSpreadsheetThumbnail(buffer, fileName, badgeLabel = "XLSX") {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("renderSpreadsheetThumbnail: buffer is required");
  }

  const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
  const previewText = sheetToPreviewText(workbook);
  if (!previewText) {
    throw new Error("Spreadsheet has no previewable content");
  }

  const png = renderTextPreviewImage({
    title: fileName,
    body: previewText.slice(0, 1200),
    badgeLabel,
    badgeColor: "#16A34A",
  });

  return encodeHeroWebp(png);
}

module.exports = {
  renderSpreadsheetThumbnail,
};
