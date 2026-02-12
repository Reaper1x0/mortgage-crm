// Unified File Storage Service
// This service handles all file uploads, deletions, and storage operations
// Currently uses local filesystem (uploads folder)
// Future: Can be switched to Firebase Storage by uncommenting Firebase code

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mime = require("mime-types");
const mongoose = require("mongoose");

// Firebase Storage (commented out for now - uncomment when ready)
// const { FirebaseStorageService } = require("./firebaseStorgae.service");
// const { getBucket } = require("../config/firebaseAdmin");

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const RENDERED_DIR = path.join(UPLOADS_DIR, "rendered");

// Ensure directories exist
[UPLOADS_DIR, RENDERED_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

function safeName(name = "") {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\s+/g, "_");
}

function inferContentType({ mimetype, originalname }) {
  return mimetype || mime.lookup(originalname) || "application/octet-stream";
}

/**
 * Generate a unique storage path
 */
function generateStoragePath({ folder = "uploads", originalName, prefix = "" }) {
  const ext = path.extname(originalName || "") || "";
  const baseName = safeName(path.basename(originalName || "file", ext));
  const unique = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  const fileName = prefix ? `${prefix}_${timestamp}_${baseName}_${unique}${ext}` : `${timestamp}_${baseName}_${unique}${ext}`;
  return path.join(folder, fileName);
}

/**
 * Local filesystem storage implementation
 */
class LocalStorageService {
  async uploadBuffer({ buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error("uploadBuffer: buffer is required");
    }
    if (!originalName) {
      throw new Error("uploadBuffer: originalName is required");
    }

    const detectedType = contentType || mime.lookup(originalName) || "application/octet-stream";
    const storagePath = generateStoragePath({ folder, originalName });
    const fullPath = path.join(UPLOADS_DIR, storagePath);

    // Ensure folder exists
    const folderPath = path.dirname(fullPath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Write file to disk
    fs.writeFileSync(fullPath, buffer);

    const md5Hash = crypto.createHash("md5").update(buffer).digest("hex");
    const ext = path.extname(originalName) || "";
    const type = detectedType ? String(detectedType).split("/")[0] : "";

    // Generate URL (served by express static middleware)
    const url = `/uploads/${storagePath.replace(/\\/g, "/")}`;

    return {
      display_name: displayName || originalName || "",
      original_name: originalName || displayName || "",
      storage_path: storagePath,
      bucket: null, // Not used for local storage
      url,
      type,
      content_type: detectedType,
      extension: ext || "",
      size_in_bytes: buffer.length,
      checksum_md5: md5Hash,
      meta: customMetadata,
    };
  }

  async uploadFromPath({ filePath, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`uploadFromPath: file not found at ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const name = originalName || path.basename(filePath);
    return this.uploadBuffer({ buffer, originalName: name, displayName, folder, contentType, customMetadata });
  }

  async deleteByPath(storagePath) {
    if (!storagePath) {
      throw new Error("deleteByPath: storagePath is required");
    }

    const fullPath = path.join(UPLOADS_DIR, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return { deleted: true, storagePath };
  }

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

  async getSignedUrl(storagePath, expiresInMinutes = 60) {
    // For local storage, return the public URL
    const url = `/uploads/${storagePath.replace(/\\/g, "/")}`;
    const expires = Date.now() + expiresInMinutes * 60 * 1000;
    return { storagePath, url, expiresAt: new Date(expires).toISOString() };
  }
}

/**
 * Firebase Storage implementation (commented out - uncomment when ready)
 */
// class FirebaseStorageService {
//   async uploadBuffer({ buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
//     const firebaseService = new (require("./firebaseStorgae.service").FirebaseStorageService)();
//     return firebaseService.uploadBuffer({ buffer, originalName, displayName, folder, contentType, customMetadata });
//   }

//   async uploadFromPath({ filePath, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
//     const firebaseService = new (require("./firebaseStorgae.service").FirebaseStorageService)();
//     return firebaseService.uploadFromPath({ filePath, originalName, displayName, folder, contentType, customMetadata });
//   }

//   async deleteByPath(storagePath) {
//     const firebaseService = new (require("./firebaseStorgae.service").FirebaseStorageService)();
//     return firebaseService.deleteByPath(storagePath);
//   }

//   async replaceFile({ oldStoragePath, buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
//     const firebaseService = new (require("./firebaseStorgae.service").FirebaseStorageService)();
//     return firebaseService.replaceFile({ oldStoragePath, buffer, originalName, displayName, folder, contentType, customMetadata });
//   }

//   async getSignedUrl(storagePath, expiresInMinutes = 60) {
//     const firebaseService = new (require("./firebaseStorgae.service").FirebaseStorageService)();
//     return firebaseService.getSignedUrl(storagePath, expiresInMinutes);
//   }
// }

// Choose storage implementation
// Change this to use FirebaseStorageService when ready
const StorageService = new LocalStorageService();
// const StorageService = new FirebaseStorageService();

class UnifiedStorageService {
  /**
   * Upload a file buffer
   * @param {Object} params
   * @param {Buffer} params.buffer - file bytes
   * @param {string} params.originalName - original filename
   * @param {string} [params.displayName] - optional display name
   * @param {string} [params.folder] - e.g. "uploads/submissions/123"
   * @param {string} [params.contentType] - MIME type
   * @param {Object} [params.customMetadata] - additional metadata
   */
  async uploadBuffer({ buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    return StorageService.uploadBuffer({ buffer, originalName, displayName, folder, contentType, customMetadata });
  }

  /**
   * Upload from local filesystem path
   */
  async uploadFromPath({ filePath, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    return StorageService.uploadFromPath({ filePath, originalName, displayName, folder, contentType, customMetadata });
  }

  /**
   * Delete a file by storage path
   */
  async deleteByPath(storagePath) {
    return StorageService.deleteByPath(storagePath);
  }

  /**
   * Replace an existing file
   */
  async replaceFile({ oldStoragePath, buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    return StorageService.replaceFile({ oldStoragePath, buffer, originalName, displayName, folder, contentType, customMetadata });
  }

  /**
   * Get a signed/accessible URL for a file
   */
  async getSignedUrl(storagePath, expiresInMinutes = 60) {
    return StorageService.getSignedUrl(storagePath, expiresInMinutes);
  }
}

module.exports = new UnifiedStorageService();

