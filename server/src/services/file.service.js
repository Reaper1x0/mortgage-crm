// backend/services/fileService.js
// Uses unified storage service for all file operations
const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const { File } = require("../models");
const storageService = require("./storage.service");
const AuditTrailService = require("./auditTrail.service");

function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

/**
 * TEMP / Vercel-safe temp file helper (if you ever need it)
 */
function writeTempFile(buffer, ext = "") {
  const tempDir = path.join(os.tmpdir(), "tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filepath = path.join(
    tempDir,
    `tmp-${Date.now()}-${require("crypto").randomBytes(6).toString("hex")}${ext}`
  );
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

class FileService {
  /**
   * CREATE (Upload + Save in Mongo)
   * @param {Object} params
   * @param {Object} params.file - multer file (buffer/path/originalname/mimetype/size)
   * @param {string} [params.displayName]
   * @param {string} [params.folder] - e.g. "uploads/submissions/123"
   * @param {Object} [params.meta] - additional meta to store in Mongo
   * @param {ObjectId|string} ownerId - Owner of the file
   * @param {ObjectId|string} uploadedBy - User who uploaded (for audit trail)
   * @param {ObjectId|string} [submissionId] - Related submission (for audit trail)
   */
  static async createFromUpload(
    { file, displayName, folder = "uploads", meta = {} },
    ownerId,
    uploadedBy = null
  ) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("createFromUpload: valid ownerId is required");
    if (!file) throw new Error("createFromUpload: file is required");

    // Use ownerId as uploadedBy if not provided
    const uploaderId = uploadedBy && isObjectId(uploadedBy) ? uploadedBy : ownerId;

    const originalName = file.originalname || file.name || "file";
    const contentType = file.mimetype || require("mime-types").lookup(originalName) || "application/octet-stream";

    let buffer = file.buffer;
    if (!buffer && file.path) {
      buffer = fs.readFileSync(file.path);
    }
    if (!buffer || !Buffer.isBuffer(buffer))
      throw new Error("createFromUpload: file buffer is missing");

    // Use unified storage service
    const storageInfo = await storageService.uploadBuffer({
      buffer,
      originalName,
      displayName: displayName || originalName,
      folder,
      contentType,
      customMetadata: meta,
    });

    const doc = await File.create({
      ...storageInfo,
      owner_id: ownerId,
      uploaded_by: uploaderId,
      uploaded_at: new Date(),
      status: "uploaded",
      meta: { ...(storageInfo.meta || {}), ...(meta || {}) },
    });

    // Log audit trail only for actual documents (not profile pictures or other non-document files)
    // Skip audit logging for profile pictures, system files, etc.
    if (meta.type !== "profile_picture" && !meta.skipAuditLog) {
      await AuditTrailService.log({
        entity_type: "document",
        entity_id: doc._id,
        user_id: uploaderId,
        action: "document_uploaded",
        action_details: {
          file_name: originalName,
          file_size: buffer.length,
          content_type: contentType,
        },
        document_id: doc._id,
        document_name: originalName,
        submission_id: meta.submissionId || null,
      });
    }

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
   * SOFT DELETE (owner scoped)
   * Marks status=deleted (file remains in storage)
   */
  static async softDelete(fileId, ownerId, deletedBy = null) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("softDelete: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("softDelete: valid fileId is required");

    const file = await File.findOne({ _id: fileId, owner_id: ownerId });
    if (!file) return null;

    const deleterId = deletedBy && isObjectId(deletedBy) ? deletedBy : ownerId;

    file.status = "deleted";
    await file.save();

    // Log audit trail only for actual documents (not profile pictures or other non-document files)
    // Skip audit logging for profile pictures, system files, etc.
    if (file.meta?.type !== "profile_picture" && !file.meta?.skipAuditLog) {
      await AuditTrailService.log({
        entity_type: "document",
        entity_id: fileId,
        user_id: deleterId,
        action: "document_deleted",
        action_details: {
          file_name: file.original_name,
          soft_delete: true,
        },
        document_id: fileId,
        document_name: file.original_name,
        submission_id: file.meta?.submissionId || null,
      });
    }

    return file;
  }

  /**
   * HARD DELETE (owner scoped)
   * Removes Mongo record and deletes from storage
   */
  static async hardDelete(fileId, ownerId, deletedBy = null) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("hardDelete: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("hardDelete: valid fileId is required");

    const file = await File.findOne({ _id: fileId, owner_id: ownerId });
    if (!file) return null;

    const deleterId = deletedBy && isObjectId(deletedBy) ? deletedBy : ownerId;

    // Delete from storage using unified service
    try {
      await storageService.deleteByPath(file.storage_path);
    } catch (err) {
      console.error("Storage delete failed (continuing with DB delete):", err);
    }

    await File.deleteOne({ _id: fileId, owner_id: ownerId });

    // Log audit trail only for actual documents (not profile pictures or other non-document files)
    // Skip audit logging for profile pictures, system files, etc.
    if (file.meta?.type !== "profile_picture" && !file.meta?.skipAuditLog) {
      await AuditTrailService.log({
        entity_type: "document",
        entity_id: fileId,
        user_id: deleterId,
        action: "document_deleted",
        action_details: {
          file_name: file.original_name,
          storage_path: file.storage_path,
        },
        document_id: fileId,
        document_name: file.original_name,
        submission_id: file.meta?.submissionId || null,
      });
    }

    return { deleted: true, fileId };
  }

  /**
   * REPLACE (upload new, mark old deleted)
   * Returns: { oldFile, newFile }
   */
  static async replace(
    fileId,
    { file: newFile, displayName, folder = "uploads", meta = {} },
    ownerId,
    replacedBy = null
  ) {
    if (!ownerId || !isObjectId(ownerId))
      throw new Error("replace: valid ownerId is required");
    if (!fileId || !isObjectId(fileId))
      throw new Error("replace: valid fileId is required");
    if (!newFile) throw new Error("replace: new file is required");

    const oldFile = await File.findOne({ _id: fileId, owner_id: ownerId });
    if (!oldFile) return null;

    const replacerId = replacedBy && isObjectId(replacedBy) ? replacedBy : ownerId;

    const created = await FileService.createFromUpload(
      {
        file: newFile,
        displayName: displayName || newFile.originalname,
        folder,
        meta,
      },
      ownerId,
      replacerId
    );

    // Delete old file from storage
    try {
      await storageService.deleteByPath(oldFile.storage_path);
    } catch (err) {
      console.error("Storage delete failed for old file (continuing):", err);
    }

    oldFile.status = "deleted";
    await oldFile.save();

    // Log audit trail only for actual documents (not profile pictures or other non-document files)
    // Skip audit logging for profile pictures, system files, etc.
    if (oldFile.meta?.type !== "profile_picture" && !oldFile.meta?.skipAuditLog && meta.type !== "profile_picture" && !meta.skipAuditLog) {
      await AuditTrailService.log({
        entity_type: "document",
        entity_id: fileId,
        user_id: replacerId,
        action: "document_replaced",
        action_details: {
          old_file_name: oldFile.original_name,
          new_file_name: newFile.originalname,
          old_file_id: String(oldFile._id),
          new_file_id: String(created._id),
        },
        document_id: fileId,
        document_name: oldFile.original_name,
        submission_id: meta.submissionId || oldFile.meta?.submissionId || null,
      });
    }

    return { oldFile, newFile: created };
  }
}

module.exports = { FileService };
