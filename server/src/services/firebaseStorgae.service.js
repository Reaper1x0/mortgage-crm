// src/services/FirebaseStorageService.js
const { getBucket } = require("../config/firebaseAdmin");
const crypto = require("crypto");
const path = require("path");
const mime = require("mime-types");

/**
 * Returned object: store this in MongoDB (File model)
 */
function buildFileInfo({ bucketName, storagePath, originalName, displayName, contentType, size, md5Hash, downloadUrl }) {
  const ext = path.extname(originalName || "") || (contentType ? `.${mime.extension(contentType) || ""}` : "");
  const type = contentType ? String(contentType).split("/")[0] : ""; // image/audio/application/text...

  return {
    display_name: displayName || originalName || "",
    original_name: originalName || displayName || "",
    url: downloadUrl,                 // convenience
    bucket: bucketName,
    storage_path: storagePath,         // IMPORTANT for delete/replace
    content_type: contentType || "",
    type,                              // image/audio/application...
    extension: ext || "",
    size_in_bytes: size || 0,
    checksum_md5: md5Hash || "",
    meta: {},
  };
}

class FirebaseStorageService {
  /**
   * Upload a file buffer to Firebase Storage.
   * @param {Object} params
   * @param {Buffer} params.buffer - file bytes
   * @param {string} params.originalName - original filename (e.g. invoice.pdf)
   * @param {string} [params.displayName] - optional display name
   * @param {string} [params.folder] - e.g. "uploads/org123/user456"
   * @param {string} [params.contentType] - e.g. "application/pdf"
   * @param {Object} [params.customMetadata] - stored in Firebase object metadata
   */
  async uploadBuffer({ buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("uploadBuffer: buffer is required");
    if (!originalName) throw new Error("uploadBuffer: originalName is required");

    const bucket = getBucket();
    const bucketName = bucket.name;

    const safeExt = path.extname(originalName) || "";
    const baseName = path.basename(originalName, safeExt).replace(/\s+/g, "_");
    const unique = crypto.randomBytes(8).toString("hex");

    const detectedType = contentType || mime.lookup(originalName) || "application/octet-stream";
    const storagePath = `${folder}/${Date.now()}_${baseName}_${unique}${safeExt}`;

    // Token-based download URL (works without signed URLs)
    const token = crypto.randomUUID();

    const file = bucket.file(storagePath);

    const md5Hash = crypto.createHash("md5").update(buffer).digest("base64");

    await file.save(buffer, {
      resumable: false,
      contentType: detectedType,
      metadata: {
        contentType: detectedType,
        metadata: {
          ...customMetadata,
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const downloadUrl =
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}` +
      `/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;

    return buildFileInfo({
      bucketName,
      storagePath,
      originalName,
      displayName: displayName || originalName,
      contentType: detectedType,
      size: buffer.length,
      md5Hash,
      downloadUrl,
    });
  }

  /**
   * Convenience: upload from local filesystem path
   */
  async uploadFromPath({ filePath, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    const fs = require("fs");
    const buffer = fs.readFileSync(filePath);
    const name = originalName || path.basename(filePath);
    return this.uploadBuffer({ buffer, originalName: name, displayName, folder, contentType, customMetadata });
  }

  /**
   * Replace/update an existing stored file:
   * - deletes old object if exists
   * - uploads new buffer to NEW path (recommended)
   * Returns: { oldDeleted: boolean, file: <new fileInfo> }
   */
  async replaceFile({ oldStoragePath, buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    let oldDeleted = false;
    if (oldStoragePath) {
      try {
        await this.deleteByPath(oldStoragePath);
        oldDeleted = true;
      } catch (_) {
        // ignore if not found
      }
    }
    const file = await this.uploadBuffer({ buffer, originalName, displayName, folder, contentType, customMetadata });
    return { oldDeleted, file };
  }

  /**
   * Delete a file by its storage path
   */
  async deleteByPath(storagePath) {
    if (!storagePath) throw new Error("deleteByPath: storagePath is required");
    const bucket = getBucket();
    const file = bucket.file(storagePath);
    await file.delete({ ignoreNotFound: true });
    return { deleted: true, storagePath };
  }

  /**
   * Optional: create a time-limited signed URL for private access
   * (Useful if you don’t want token URLs stored forever)
   */
  async getSignedUrl(storagePath, expiresInMinutes = 60) {
    const bucket = getBucket();
    const file = bucket.file(storagePath);
    const expires = Date.now() + expiresInMinutes * 60 * 1000;

    const [url] = await file.getSignedUrl({
      action: "read",
      expires,
    });

    return { storagePath, url, expiresAt: new Date(expires).toISOString() };
  }
}

module.exports = { FirebaseStorageService };
