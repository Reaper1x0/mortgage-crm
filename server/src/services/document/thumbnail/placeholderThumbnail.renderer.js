const { renderTextPreviewImage } = require("./canvasTextPreview");
const { encodeHeroWebp } = require("./thumbnail.encode.util");

async function renderPlaceholderThumbnail(fileName, formatLabel = "FILE") {
  const png = renderTextPreviewImage({
    title: fileName,
    body: "Preview unavailable. Open the file to view the full document.",
    badgeLabel: formatLabel,
    badgeColor: "#64748B",
  });

  return encodeHeroWebp(png);
}

module.exports = {
  renderPlaceholderThumbnail,
};
