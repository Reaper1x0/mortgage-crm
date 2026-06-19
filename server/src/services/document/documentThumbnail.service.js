const storageService = require("../storage.service");
const { detectDocumentType } = require("./documentType");
const { renderExtensionThumbnail } = require("./thumbnail/extensionThumbnail.renderer");

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

/**
 * Creates a simple extension-label thumbnail (WebP) for submission documents.
 */
async function createAndUploadThumbnail({
  storagePath,
  mimetype,
  originalname,
}) {
  if (!storagePath) {
    throw new Error("createAndUploadThumbnail: storagePath is required");
  }

  const documentType = detectDocumentType({ mimetype, originalname });
  const fileName = originalname || "Document";

  const webpBuffer = await renderExtensionThumbnail(fileName, documentType);
  const thumbnailPath = await uploadThumbnailWebp(storagePath, webpBuffer);

  console.log(`[thumbnail] Created ${thumbnailPath} for ${fileName} (extension)`);

  return {
    thumbnail_storage_path: thumbnailPath,
    thumbnail_kind: documentType,
    thumbnail_source: "extension",
  };
}

module.exports = {
  thumbnailStoragePath,
  createAndUploadThumbnail,
};
