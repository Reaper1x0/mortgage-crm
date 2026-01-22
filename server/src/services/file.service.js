// backend/services/fileService.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const mime = require("mime-types");
const mongoose = require("mongoose");
const { File } = require("../models");

// const { FirebaseStorageService } = require("./FirebaseStorageService"); // ✅ enable later

function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

function safeName(name = "") {
  return String(name).trim().replace(/\s+/g, "_");
}

function inferContentType({ mimetype, originalname }) {
  return (
    mimetype || mime.lookup(originalname || "") || "application/octet-stream"
  );
}

/**
 * ✅ TEMP / Vercel-safe temp file helper (if you ever need it)
 */
function writeTempFile(buffer, ext = "") {
  const tempDir = path.join(os.tmpdir(), "tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filepath = path.join(
    tempDir,
    `tmp-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`
  );
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * ✅ Pretend "Firebase upload" (returns the same shape you would store)
 * Replace this later with FirebaseStorageService.uploadBuffer(...)
 */
async function pretendFirebaseUpload({
  buffer,
  originalName,
  displayName,
  folder = "uploads",
  bucketName = "fake-bucket",
  contentType,
  customMetadata = {},
}) {
  const detectedType =
    contentType || mime.lookup(originalName) || "application/octet-stream";
  const ext =
    path.extname(originalName || "") ||
    (detectedType ? `.${mime.extension(detectedType) || ""}` : "");
  const baseName = safeName(path.basename(originalName || "file", ext));
  const unique = crypto.randomBytes(8).toString("hex");

  const storagePath = `${folder}/${Date.now()}_${baseName}_${unique}${ext}`;
  const md5Hash = crypto.createHash("md5").update(buffer).digest("hex");

  // fake downloadable URL (replace later with real firebase url / signed url)
  const url = `https://storage.example.com/${encodeURIComponent(
    bucketName
  )}/${encodeURIComponent(storagePath)}`;

  const type = detectedType ? String(detectedType).split("/")[0] : "";

  return {
    display_name: displayName || originalName || "",
    original_name: originalName || displayName || "",
    storage_path: storagePath,
    bucket: bucketName,
    url,
    type,
    content_type: detectedType,
    extension: ext || "",
    size_in_bytes: buffer?.length || 0,
    checksum_md5: md5Hash,
    meta: {
      ...customMetadata,
    },
  };
}

class FileService {
  /**
   * ✅ CREATE (Upload + Save in Mongo)
   * @param {Object} params
   * @param {Object} params.file - multer file (buffer/path/originalname/mimetype/size)
   * @param {string} [params.displayName]
   * @param {string} [params.folder] - e.g. "uploads/org123/user456"
   * @param {Object} [params.meta] - additional meta to store in Mongo
   * @param {ObjectId|string} ownerId
   */
  static async createFromUpload(
    { file, displayName, folder = "uploads", meta = {} },
    ownerId
  ) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("createFromUpload: valid ownerId is required");
    if (!file) throw new Error("createFromUpload: file is required");

    const originalName = file.originalname || file.name || "file";
    const contentType = inferContentType({
      mimetype: file.mimetype,
      originalname: originalName,
    });

    let buffer = file.buffer;
    if (!buffer && file.path) {
      buffer = fs.readFileSync(file.path);
    }
    if (!buffer || !Buffer.isBuffer(buffer))
      throw new Error("createFromUpload: file buffer is missing");

    // ✅ Later you will enable firebase upload here:
    // const storage = new FirebaseStorageService();
    // const firebaseInfo = await storage.uploadBuffer({
    //   buffer,
    //   originalName,
    //   displayName: displayName || originalName,
    //   folder,
    //   contentType,
    //   customMetadata: meta,
    // });

    // ✅ For now: pretend firebase upload
    const firebaseInfo = await pretendFirebaseUpload({
      buffer,
      originalName,
      displayName: displayName || originalName,
      folder,
      contentType,
      customMetadata: meta,
    });

    const doc = await File.create({
      ...firebaseInfo,
      owner_id: ownerId,
      status: "uploaded",
      meta: { ...(firebaseInfo.meta || {}), ...(meta || {}) },
    });

    return doc;
  }

  /**
   * ✅ LIST (owner scoped) with optional pagination
   */
  static async list({ page = 1, pageSize = 25, status }, ownerId) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("list: valid ownerId is required");

    const q = { owner_id: ownerId };
    if (status) q.status = status;

    const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize);
    const limit = Math.min(100, Math.max(1, pageSize));

    const [items, total] = await Promise.all([
      File.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      File.countDocuments(q),
    ]);

    return {
      items,
      page: Math.max(1, page),
      pageSize: limit,
      total,
    };
  }

  /**
   * ✅ GET BY ID (owner scoped)
   */
  static async getById(fileId, ownerId) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("getById: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("getById: valid fileId is required");

    return File.findOne({ _id: fileId, owner_id: ownerId });
  }

  /**
   * ✅ UPDATE (owner scoped)
   * Allow only safe fields (display_name, meta)
   */
  static async update(fileId, { display_name, meta }, ownerId) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("update: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("update: valid fileId is required");

    const $set = {};
    if (typeof display_name === "string")
      $set.display_name = display_name.trim();

    // merge meta
    const updateDoc = { $set };
    if (meta && typeof meta === "object") {
      updateDoc.$set.meta = meta;
    }

    return File.findOneAndUpdate(
      { _id: fileId, owner_id: ownerId, status: { $ne: "deleted" } },
      updateDoc,
      { new: true }
    );
  }

  /**
   * ✅ SOFT DELETE (owner scoped)
   * Marks status=deleted, (optionally deletes in Firebase later)
   */
  static async softDelete(fileId, ownerId) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("softDelete: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("softDelete: valid fileId is required");

    const file = await File.findOne({ _id: fileId, owner_id: ownerId });
    if (!file) return null;

    // ✅ Later: delete from firebase storage
    // const storage = new FirebaseStorageService();
    // await storage.deleteByPath(file.storage_path);

    file.status = "deleted";
    await file.save();
    return file;
  }

  /**
   * ✅ HARD DELETE (owner scoped)
   * Removes Mongo record (optionally delete from Firebase)
   */
  static async hardDelete(fileId, ownerId) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("hardDelete: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("hardDelete: valid fileId is required");

    const file = await File.findOne({ _id: fileId, owner_id: ownerId });
    if (!file) return null;

    // ✅ Later: delete from firebase storage (uncomment)
    // const storage = new FirebaseStorageService();
    // await storage.deleteByPath(file.storage_path);

    // ✅ For now: pretend delete (does nothing)
    await pretendFirebaseDeleteByPath(file.storage_path, file.bucket);

    await File.deleteOne({ _id: fileId, owner_id: ownerId });
    return { deleted: true, fileId };
  }

  /**
   * ✅ REPLACE (upload new, mark old deleted)
   * Returns: { oldFile, newFile }
   */
  static async replace(
    fileId,
    { file: newFile, displayName, folder = "uploads", meta = {} },
    ownerId
  ) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("replace: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("replace: valid fileId is required");
    if (!newFile) throw new Error("replace: new file is required");

    const oldFile = await File.findOne({ _id: fileId, owner_id: ownerId });
    if (!oldFile) return null;

    const created = await FileService.createFromUpload(
      {
        file: newFile,
        displayName: displayName || newFile.originalname,
        folder,
        meta,
      },
      ownerId
    );

    // ✅ Later: delete old file in firebase
    // const storage = new FirebaseStorageService();
    // await storage.deleteByPath(oldFile.storage_path);

    oldFile.status = "deleted";
    await oldFile.save();

    return { oldFile, newFile: created };
  }
  static async pretendFirebaseDeleteByPath(
    storagePath,
    bucketName = "fake-bucket"
  ) {
    // no-op for now
    return { deleted: true, bucket: bucketName, storagePath };
  }
}

module.exports = { FileService };
