// Unified File Storage Service (S3-only)
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mime = require("mime-types");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

class S3StorageService {
  constructor() {
    this.region = getRequiredEnv("AWS_REGION");
    this.bucket = getRequiredEnv("S3_BUCKET_NAME");

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: getRequiredEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: getRequiredEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }

  async uploadBuffer({ buffer, originalName, displayName, folder = "uploads", contentType, customMetadata = {} }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error("uploadBuffer: buffer is required");
    }
    if (!originalName) {
      throw new Error("uploadBuffer: originalName is required");
    }

    const detectedType = inferContentType({ mimetype: contentType, originalname: originalName });
    const storagePath = generateStoragePath({ folder, originalName });
    const normalizedStoragePath = storagePath.replace(/\\/g, "/");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: normalizedStoragePath,
        Body: buffer,
        ContentType: detectedType,
        Metadata: Object.fromEntries(
          Object.entries(customMetadata || {}).map(([k, v]) => [String(k), String(v)])
        ),
      })
    );

    const md5Hash = crypto.createHash("md5").update(buffer).digest("hex");
    const ext = path.extname(originalName) || "";
    const type = detectedType ? String(detectedType).split("/")[0] : "";

    return {
      display_name: displayName || originalName || "",
      original_name: originalName || displayName || "",
      storage_path: normalizedStoragePath,
      bucket: this.bucket,
      // URL is always generated via signed URL on read, not stored at write-time.
      url: null,
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

    const normalizedStoragePath = String(storagePath).replace(/\\/g, "/");
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: normalizedStoragePath,
      })
    );

    return { deleted: true, storagePath: normalizedStoragePath };
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
    const normalizedStoragePath = String(storagePath).replace(/\\/g, "/");
    const expiresIn = Math.max(60, Math.floor(expiresInMinutes * 60));
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: normalizedStoragePath,
      }),
      { expiresIn }
    );
    const expires = Date.now() + expiresIn * 1000;
    return { storagePath, url, expiresAt: new Date(expires).toISOString() };
  }

  async getObjectBuffer(storagePath) {
    if (!storagePath) throw new Error("getObjectBuffer: storagePath is required");
    const normalizedStoragePath = String(storagePath).replace(/\\/g, "/");
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: normalizedStoragePath,
      })
    );
    return streamToBuffer(response.Body);
  }
}

const StorageService = new S3StorageService();

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

  async getObjectBuffer(storagePath) {
    return StorageService.getObjectBuffer(storagePath);
  }
}

module.exports = new UnifiedStorageService();

