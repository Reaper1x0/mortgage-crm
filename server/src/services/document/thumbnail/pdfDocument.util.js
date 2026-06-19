const path = require("path");

let pdfjsModulePromise = null;

function getStandardFontDataUrl() {
  try {
    const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
    return `${path.join(pdfjsRoot, "standard_fonts").replace(/\\/g, "/")}/`;
  } catch {
    return undefined;
  }
}

function loadPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsModulePromise;
}

async function openPdfDocument(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("openPdfDocument: buffer is required");
  }

  const pdfjs = await loadPdfJs();
  const standardFontDataUrl = getStandardFontDataUrl();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: false,
    ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
  });

  const pdf = await loadingTask.promise;
  if (!pdf.numPages) {
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
    throw new Error("PDF has no pages");
  }

  return pdf;
}

module.exports = {
  openPdfDocument,
};
