const { renderTextPreviewImage } = require("./canvasTextPreview");
const { encodeHeroWebp } = require("./thumbnail.encode.util");

async function renderTextThumbnail(buffer, fileName, badgeLabel = "TXT") {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("renderTextThumbnail: buffer is required");
  }

  const text = buffer.toString("utf8").replace(/\u0000/g, "").trim();
  if (!text) {
    throw new Error("Text file is empty");
  }

  const png = renderTextPreviewImage({
    title: fileName,
    body: text.slice(0, 1400),
    badgeLabel,
    badgeColor: "#64748B",
  });

  return encodeHeroWebp(png);
}

module.exports = {
  renderTextThumbnail,
};
