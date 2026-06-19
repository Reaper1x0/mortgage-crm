const { Submission, File } = require("../models");
const { FileService } = require("./file.service");
const MasterFieldService = require("./masterFields.service");
const SubmissionService = require("./submission.service");
const { recomputeSubmissionFields } = require("./submissionFields.service");
const AuditTrailService = require("./auditTrail.service");
const { billingService } = require("./index");
const { runFieldExtractionForSingleText } = require("./document/fieldExtraction.service");
const documentIndexService = require("./rag/documentIndex.service");
const { getSignedFileUrl } = require("../utils/fileUrl.utils");

function submissionUploadFolder(submissionId) {
  return `uploads/submissions/${submissionId}`;
}

function buildSubmissionFileMeta({ submissionId, workspaceId, organizationId, extra = {} }) {
  return { submissionId, workspaceId, organizationId, ...extra };
}

async function readPreparedDocumentText(fileDoc) {
  const { markdown } = await documentIndexService.readMarkdownFromFile(fileDoc);
  return String(markdown || "").trim();
}

async function clearRagIndexForFile(fileDoc) {
  if (!fileDoc?._id) return;
  await documentIndexService.deleteChunksForFile(fileDoc._id);
  fileDoc.meta = {
    ...(fileDoc.meta || {}),
    rag_index_status: "pending",
    rag_indexed_at: null,
    rag_chunk_count: 0,
    rag_error: null,
  };
  await fileDoc.save();
}

function inferExtractionStatus(docEntry) {
  if (docEntry.extraction_status) return docEntry.extraction_status;
  const count = Array.isArray(docEntry.extracted_fields) ? docEntry.extracted_fields.length : 0;
  return count > 0 ? "extracted" : "pending";
}

async function uploadSubmissionDocument({ submissionId, file, userId, workspaceId, organizationId }) {
  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) {
    const err = new Error("Submission not found.");
    err.statusCode = 404;
    throw err;
  }

  let savedFile;
  try {
    savedFile = await FileService.createFromUpload(
      {
        file,
        displayName: file.originalname,
        folder: submissionUploadFolder(submissionId),
        meta: buildSubmissionFileMeta({ submissionId, workspaceId, organizationId }),
      },
      userId,
      userId
    );
  } catch (uploadErr) {
    const err = new Error(uploadErr?.message || "Failed to upload document.");
    err.statusCode = 400;
    throw err;
  }

  const text = await readPreparedDocumentText(savedFile).catch(() => "");
  if (!text) {
    await FileService.hardDelete(savedFile._id, userId);
    const err = new Error("No readable text could be prepared from this document.");
    err.statusCode = 400;
    throw err;
  }

  submission.documents.push({
    userId,
    document: savedFile._id,
    extracted_fields: [],
    uploadDate: new Date(),
    document_name: file.originalname,
    document_type: savedFile.meta?.document_type || file.mimetype || "",
    upload_status: "uploaded",
    extraction_status: "pending",
    upload_error: null,
    extraction_error: null,
    extracted_at: null,
  });

  await submission.save();
  const docEntry = submission.documents[submission.documents.length - 1];

  return {
    docEntryId: docEntry._id,
    savedFile,
    original_name: file.originalname,
  };
}

async function uploadSubmissionDocuments({ submissionId, files, userId, workspaceId, organizationId }) {
  const results = [];
  for (const file of files) {
    try {
      const { docEntryId, savedFile, original_name } = await uploadSubmissionDocument({
        submissionId,
        file,
        userId,
        workspaceId,
        organizationId,
      });
      results.push({
        original_name,
        ok: true,
        docEntryId: String(docEntryId),
        file: {
          id: savedFile._id,
          storage_path: savedFile.storage_path,
          url: await getSignedFileUrl(savedFile.storage_path, 60),
        },
      });
    } catch (err) {
      results.push({
        original_name: file.originalname,
        ok: false,
        reason: err?.message || "Upload failed.",
      });
    }
  }
  return results;
}

async function logExtractedFieldsAudit({
  extracted_fields,
  submissionId,
  userId,
  workspaceId,
  fileId,
  documentName,
  extraDetails = {},
}) {
  for (const field of extracted_fields) {
    await AuditTrailService.log({
      entity_type: "field",
      entity_id: `${submissionId}_${field.key}`,
      user_id: userId,
      workspace: workspaceId,
      action: "field_extracted",
      action_details: {
        field_key: field.key,
        raw_value: field.value?.raw,
        normalized_value: field.value?.normalized,
        confidence: field.confidence,
        ...extraDetails,
      },
      field_key: field.key,
      field_source: "extraction",
      document_id: fileId,
      document_name: documentName,
      submission_id: submissionId,
    });
  }
}

async function extractSubmissionDocumentFields({
  submissionId,
  docEntryId,
  userId,
  workspaceId,
  organizationId,
}) {
  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) {
    const err = new Error("Submission not found.");
    err.statusCode = 404;
    throw err;
  }

  const docEntry = submission.documents.id(docEntryId);
  if (!docEntry) {
    const err = new Error("Document entry not found.");
    err.statusCode = 404;
    throw err;
  }

  if (docEntry.upload_status === "upload_failed") {
    const err = new Error("Document upload failed. Re-upload before extracting.");
    err.statusCode = 400;
    throw err;
  }

  if (docEntry.extraction_status === "extracting") {
    const err = new Error("Extraction is already in progress for this document.");
    err.statusCode = 409;
    throw err;
  }

  docEntry.extraction_status = "extracting";
  docEntry.extraction_error = null;
  await submission.save();

  const fileDoc = await File.findById(docEntry.document);
  if (!fileDoc || fileDoc.status === "deleted") {
    docEntry.extraction_status = "extract_failed";
    docEntry.extraction_error = "File not found.";
    await submission.save();
    const err = new Error("File not found.");
    err.statusCode = 404;
    throw err;
  }

  const fileName = docEntry.document_name || fileDoc.display_name || fileDoc.original_name;

  try {
    const text = await readPreparedDocumentText(fileDoc);
    if (!text) {
      throw new Error("No readable text in document.");
    }

    const masterSchemaFields = await MasterFieldService.getAllMasterFields({
      limit: -1,
      workspaceId,
    });

    const extracted_fields = await runFieldExtractionForSingleText({
      text,
      fileName,
      masterFields: masterSchemaFields,
      fileId: fileDoc._id,
    });

    docEntry.extracted_fields = extracted_fields;
    docEntry.extraction_status = "extracted";
    docEntry.extracted_at = new Date();
    docEntry.extraction_error = null;

    if (submission.status === "pending") {
      submission.status = "review";
    }

    await submission.save();

    await logExtractedFieldsAudit({
      extracted_fields,
      submissionId,
      userId,
      workspaceId,
      fileId: fileDoc._id,
      documentName: fileName,
    });

    await billingService.trackExtractionUsage({
      organizationId,
      amount: 1,
    });

    await recomputeSubmissionFields(submissionId, userId, workspaceId);

    return {
      docEntryId: String(docEntryId),
      extracted_fields_count: extracted_fields.length,
      extraction_status: docEntry.extraction_status,
    };
  } catch (err) {
    docEntry.extraction_status = "extract_failed";
    docEntry.extraction_error = err?.message || "Extraction failed.";
    await submission.save();
    const wrapped = new Error(docEntry.extraction_error);
    wrapped.statusCode = err?.statusCode || 400;
    throw wrapped;
  }
}

async function replaceSubmissionDocument({ submissionId, docEntryId, file, userId, workspaceId, organizationId }) {
  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) {
    const err = new Error("Submission not found.");
    err.statusCode = 404;
    throw err;
  }

  const docEntry = submission.documents.id(docEntryId);
  if (!docEntry) {
    const err = new Error("Document entry not found.");
    err.statusCode = 404;
    throw err;
  }

  const oldFileId = docEntry.document;

  let savedFile;
  try {
    savedFile = await FileService.createFromUpload(
      {
        file,
        displayName: file.originalname,
        folder: submissionUploadFolder(submissionId),
        meta: buildSubmissionFileMeta({
          submissionId,
          workspaceId,
          organizationId,
          replaced_docEntryId: docEntryId,
          replaced_oldFileId: String(oldFileId),
        }),
      },
      userId,
      userId
    );
  } catch (uploadErr) {
    const err = new Error(uploadErr?.message || "Failed to upload replacement document.");
    err.statusCode = 400;
    throw err;
  }

  const text = await readPreparedDocumentText(savedFile).catch(() => "");
  if (!text) {
    await FileService.hardDelete(savedFile._id, userId);
    const err = new Error("No readable text could be prepared from the replacement document.");
    err.statusCode = 400;
    throw err;
  }

  await clearRagIndexForFile(savedFile);

  await Submission.updateOne(
    { _id: submissionId, workspace: workspaceId, "documents._id": docEntryId },
    {
      $set: {
        "documents.$.document": savedFile._id,
        "documents.$.extracted_fields": [],
        "documents.$.uploadDate": new Date(),
        "documents.$.document_name": file.originalname,
        "documents.$.document_type": savedFile.meta?.document_type || file.mimetype || "",
        "documents.$.upload_status": "uploaded",
        "documents.$.extraction_status": "pending",
        "documents.$.upload_error": null,
        "documents.$.extraction_error": null,
        "documents.$.extracted_at": null,
      },
    }
  );

  const warnings = [];
  try {
    if (oldFileId) {
      const oldFile = await File.findById(oldFileId);
      if (oldFile) await clearRagIndexForFile(oldFile);
      await FileService.hardDelete(oldFileId, userId, userId);
    }
  } catch (e) {
    console.error("Old file hard delete failed:", e);
    warnings.push({
      code: "OLD_FILE_DELETE_FAILED",
      message: "Old file could not be deleted (will remain orphan until cleanup).",
    });
  }

  await recomputeSubmissionFields(submissionId, userId, workspaceId);

  return {
    docEntryId: String(docEntryId),
    oldFileId: String(oldFileId),
    newFileId: String(savedFile._id),
    warnings,
  };
}

async function deleteSubmissionDocument({ submissionId, docEntryId, userId, workspaceId }) {
  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) {
    const err = new Error("Submission not found.");
    err.statusCode = 404;
    throw err;
  }

  const docEntry = submission.documents.id(docEntryId);
  if (!docEntry) {
    const err = new Error("Document entry not found.");
    err.statusCode = 404;
    throw err;
  }

  const fileId = docEntry.document;

  await Submission.updateOne(
    { _id: submissionId, workspace: workspaceId },
    { $pull: { documents: { _id: docEntryId } } }
  );

  await recomputeSubmissionFields(submissionId, userId, workspaceId);

  const warnings = [];
  try {
    if (fileId) {
      const fileDoc = await File.findById(fileId);
      if (fileDoc) await clearRagIndexForFile(fileDoc);
      await FileService.hardDelete(fileId, userId, userId);
    }
  } catch (e) {
    console.error("File hard delete failed:", e);
    warnings.push({
      code: "FILE_DELETE_FAILED",
      message: "File could not be deleted (will remain orphan until cleanup).",
    });
  }

  return {
    docEntryId: String(docEntryId),
    fileId: String(fileId),
    warnings,
  };
}

module.exports = {
  uploadSubmissionDocument,
  uploadSubmissionDocuments,
  extractSubmissionDocumentFields,
  replaceSubmissionDocument,
  deleteSubmissionDocument,
  inferExtractionStatus,
};
