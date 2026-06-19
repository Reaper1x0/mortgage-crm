const storageService = require("../storage.service");
const { detectDocumentType } = require("./documentType");
const {
  getThumbnailRenderer,
  renderPlaceholderThumbnail,
} = require("./thumbnail/thumbnail.registry");
const { renderTextThumbnail } = require("./thumbnail/textThumbnail.renderer");

function thumbnailStoragePath(storagePath) {
  const base = String(storagePath || "").replace(/\\/g, "/");
  return `${base}.thumbnail.webp`;
}

async function uploadThumbnailWebp(storagePath, webpBuffer) {
  const key = thumbnailStoragePath(storagePath);
  await storageService.uploadToKey({
    key,
    buffer: webpBuffer,
    contentType: "image/webp",
  });
  return key;
}

async function renderPrimaryThumbnail({ documentType, buffer, fileName }) {
  const render = getThumbnailRenderer(documentType);
  return render({ buffer, fileName });
}

async function renderFallbackThumbnail({ documentType, fileName, fallbackText }) {
  const label = String(documentType || "file").toUpperCase();

  // Avoid misleading PDF cards: extracted markdown is not a visual page preview.
  if (documentType === "pdf") {
    return renderPlaceholderThumbnail(fileName, label);
  }

  const body = String(fallbackText || "").trim();
  if (!body) {
    return renderPlaceholderThumbnail(fileName, label);
  }

  return renderTextThumbnail(Buffer.from(body.slice(0, 4000), "utf8"), fileName, label);
}

/**
 * Creates a visual thumbnail (WebP) for supported submission documents.
 */
async function createAndUploadThumbnail({
  storagePath,
  buffer,
  mimetype,
  originalname,
  fallbackText = null,
}) {
  if (!storagePath) {
    throw new Error("createAndUploadThumbnail: storagePath is required");
  }
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("createAndUploadThumbnail: buffer is required");
  }

  const documentType = detectDocumentType({ mimetype, originalname });
  const fileName = originalname || "Document";

  let webpBuffer;
  let thumbnailSource = "rendered";

  try {
    webpBuffer = await renderPrimaryThumbnail({ documentType, buffer, fileName });
  } catch (primaryError) {
    const hasFallback = documentType === "pdf" || String(fallbackText || "").trim();
    if (!hasFallback) {
      console.error(
        `[thumbnail] Primary render failed for ${fileName} (${documentType}):`,
        primaryError?.message || primaryError
      );
      throw primaryError;
    }

    console.warn(
      `[thumbnail] Primary render failed for ${fileName} (${documentType}), using fallback:`,
      primaryError?.message || primaryError
    );

    webpBuffer = await renderFallbackThumbnail({ documentType, fileName, fallbackText });
    thumbnailSource = documentType === "pdf" ? "placeholder" : "text_fallback";
  }

  const thumbnailPath = await uploadThumbnailWebp(storagePath, webpBuffer);

  console.log(
    `[thumbnail] Created ${thumbnailPath} for ${fileName} (${thumbnailSource})`
  );

  return {
    thumbnail_storage_path: thumbnailPath,
    thumbnail_kind: documentType,
    thumbnail_source: thumbnailSource,
  };
}

module.exports = {
  thumbnailStoragePath,
  createAndUploadThumbnail,
};
