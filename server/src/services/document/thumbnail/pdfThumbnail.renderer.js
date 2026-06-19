const { createCanvas } = require("@napi-rs/canvas");
const { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } = require("./thumbnail.constants");
const { openPdfDocument } = require("./pdfDocument.util");
const { encodeHeroWebp } = require("./thumbnail.encode.util");

async function renderPdfThumbnail(buffer) {
  const pdf = await openPdfDocument(buffer);

  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = THUMBNAIL_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // pdfjs node integration only needs canvasContext + viewport (not `canvas`).
    await page.render({ canvasContext: context, viewport }).promise;

    return encodeHeroWebp(canvas.toBuffer("image/png"));
  } finally {
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
  }
}

module.exports = {
  renderPdfThumbnail,
};
