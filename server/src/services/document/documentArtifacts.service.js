const storageService = require("../storage.service");
const { convertFileToMarkdown } = require("./markdownConversion.service");
const { createAndUploadThumbnail, thumbnailStoragePath } = require("./documentThumbnail.service");

function sidecarPaths(storagePath) {
  const base = String(storagePath || "").replace(/\\/g, "/");
  return {
    mdStoragePath: `${base}.md`,
    metadataStoragePath: `${base}.metadata.json`,
  };
}

function buildMetadataPayload({ fileDoc, context, conversion }) {
  const paths = sidecarPaths(fileDoc.storage_path);

  return {
    schemaVersion: 1,
    fileId: String(fileDoc._id),
    submissionId: context.submissionId ? String(context.submissionId) : null,
    workspaceId: context.workspaceId ? String(context.workspaceId) : null,
    organizationId: context.organizationId ? String(context.organizationId) : null,
    originalFileName: fileDoc.original_name,
    displayName: fileDoc.display_name,
    originalStoragePath: fileDoc.storage_path,
    mdStoragePath: paths.mdStoragePath,
    metadataStoragePath: paths.metadataStoragePath,
    contentType: fileDoc.content_type,
    sizeInBytes: fileDoc.size_in_bytes,
    checksumMd5: fileDoc.checksum_md5,
    documentType: conversion.type,
    conversionMethod: conversion.method,
    embeddedImages: conversion.embeddedImages || null,
    convertedAt: new Date().toISOString(),
  };
}

async function uploadMarkdown(storagePath, markdown) {
  const paths = sidecarPaths(storagePath);
  await storageService.uploadToKey({
    key: paths.mdStoragePath,
    buffer: Buffer.from(markdown, "utf8"),
    contentType: "text/markdown; charset=utf-8",
  });
  return paths.mdStoragePath;
}

async function uploadMetadata(storagePath, metadata) {
  const paths = sidecarPaths(storagePath);
  await storageService.uploadJson({
    key: paths.metadataStoragePath,
    body: metadata,
  });
  return paths.metadataStoragePath;
}

async function attachToSubmissionDocument({ fileDoc, file, context = {} }) {
  const conversion = await convertFileToMarkdown(file, {
    storagePath: fileDoc.storage_path,
  });

  let thumbnail = null;
  try {
    thumbnail = await createAndUploadThumbnail({
      storagePath: fileDoc.storage_path,
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname || fileDoc.original_name,
      fallbackText: conversion.plainText,
    });
  } catch (thumbnailErr) {
    console.error(
      `[artifacts] Thumbnail generation failed for ${fileDoc.original_name}:`,
      thumbnailErr?.message || thumbnailErr
    );
  }

  const metadata = buildMetadataPayload({ fileDoc, context, conversion });
  if (thumbnail) {
    metadata.thumbnailStoragePath = thumbnail.thumbnail_storage_path;
    metadata.thumbnailKind = thumbnail.thumbnail_kind;
    metadata.thumbnailSource = thumbnail.thumbnail_source;
  }

  const mdStoragePath = await uploadMarkdown(fileDoc.storage_path, conversion.markdown);
  const metadataStoragePath = await uploadMetadata(fileDoc.storage_path, metadata);

  return {
    md_storage_path: mdStoragePath,
    metadata_storage_path: metadataStoragePath,
    ...(thumbnail
      ? {
          thumbnail_storage_path: thumbnail.thumbnail_storage_path,
          thumbnail_kind: thumbnail.thumbnail_kind,
          thumbnail_source: thumbnail.thumbnail_source,
        }
      : {}),
    document_type: conversion.type,
    conversion_method: conversion.method,
    converted_at: metadata.convertedAt,
    embedded_images_ocr_count: conversion.embeddedImages?.ocrCount ?? 0,
    plainText: conversion.plainText,
  };
}

async function deleteSidecarsForStoragePath(storagePath, meta = {}) {
  const paths = sidecarPaths(storagePath);
  const thumbPath =
    meta.thumbnail_storage_path ||
    thumbnailStoragePath(storagePath);
  const legacySvgThumb = `${String(storagePath || "").replace(/\\/g, "/")}.thumbnail.svg`;
  const keys = new Set([
    paths.mdStoragePath,
    paths.metadataStoragePath,
    meta.md_storage_path,
    meta.metadata_storage_path,
  ].filter(Boolean));

  if (thumbPath && thumbPath !== storagePath) {
    keys.add(thumbPath);
  }
  if (legacySvgThumb !== storagePath && legacySvgThumb !== thumbPath) {
    keys.add(legacySvgThumb);
  }

  for (const key of keys) {
    try {
      await storageService.deleteByPath(key);
    } catch (err) {
      console.error(`Failed to delete document sidecar ${key}:`, err?.message || err);
    }
  }
}

module.exports = {
  sidecarPaths,
  attachToSubmissionDocument,
  deleteSidecarsForStoragePath,
};
