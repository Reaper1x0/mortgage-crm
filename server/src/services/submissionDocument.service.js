const { Submission, File } = require("../models");
const { FileService } = require("./file.service");
const MasterFieldService = require("./masterFields.service");
const SubmissionService = require("./submission.service");
const { recomputeSubmissionFields } = require("./submissionFields.service");
const AuditTrailService = require("./auditTrail.service");
const { billingService } = require("./index");
const { runFieldExtractionForSingleText } = require("./document/fieldExtraction.service");
const documentIndexService = require("./rag/documentIndex.service");
const { extractTextFromFile } = require("./textextraction.service");
const llmService = require("./llm/llm.service");
const { getSignedFileUrl } = require("../utils/fileUrl.utils");

function submissionUploadFolder(submissionId) {
  return `uploads/submissions/${submissionId}`;
}

function buildSubmissionFileMeta({ submissionId, workspaceId, organizationId, extra = {} }) {
  return { submissionId, workspaceId, organizationId, ...extra };
}

function submissionIdentityFolder(submissionId) {
  return `${submissionUploadFolder(submissionId)}/identity`;
}

const CNIC_LOG = "[CNIC]";
const OCR_TEXT_LOG_LIMIT = 4000;

function truncateForLog(text, limit = OCR_TEXT_LOG_LIMIT) {
  const s = String(text ?? "");
  if (s.length <= limit) return s;
  return `${s.slice(0, limit)}\n... [truncated ${s.length - limit} of ${s.length} chars]`;
}

function logCnic(message, details = {}) {
  const { ocrText, ...rest } = details;
  const lines = [`${CNIC_LOG} ${message}`];
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") {
      lines.push(`${CNIC_LOG}   ${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${CNIC_LOG}   ${key}: ${value}`);
    }
  }
  if (ocrText !== undefined) {
    lines.push(`${CNIC_LOG}   ocr_text:`);
    lines.push(truncateForLog(ocrText) || "(empty)");
  }
  console.log(lines.join("\n"));
}

function normalizeLegalName(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function titleCaseName(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const TEMPLATE_MARKERS = [
  "psdlegit",
  "psd template",
  "psd tamplaie",
  "template",
  "specimen",
  "sample",
  "demo",
  "mock",
  "not valid",
  "quality product",
  "fake",
  "novelty",
];

function detectTemplateSignals(text) {
  const lower = String(text || "").toLowerCase();
  return TEMPLATE_MARKERS.filter((marker) => lower.includes(marker));
}

function parseNameFromOcrHeuristic(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const isLabelOrNoise = (line) =>
    /^(id|sex|date|expiry|expiration|nationality|country|surname|given|nom|name|card|permanent|resident|canada|government|document|birth|place)/i.test(
      line
    ) ||
    /\d{4}[-/]\d/.test(line) ||
    line.length > 50;

  const looksLikeNameLine = (line) =>
    /^[A-Za-z][A-Za-z\s\-']{1,40}$/.test(line) && line.split(/\s+/).length <= 3;

  for (let i = 0; i < lines.length; i += 1) {
    if (/^name\s*(?:\/\s*nom)?$/i.test(lines[i]) || /^nom$/i.test(lines[i])) {
      const nameLines = [];
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j += 1) {
        const line = lines[j];
        if (isLabelOrNoise(line) && !/^[A-Za-z\-']{2,30}$/.test(line)) break;
        if (looksLikeNameLine(line)) nameLines.push(line);
      }

      if (nameLines.length >= 2) {
        const [firstLine, secondLine] = nameLines;
        if (firstLine.split(/\s+/).length === 1 && secondLine.split(/\s+/).length === 1) {
          return titleCaseName(`${secondLine} ${firstLine}`);
        }
        return titleCaseName(nameLines.join(" "));
      }

      if (nameLines.length === 1 && nameLines[0].includes(" ")) {
        return titleCaseName(nameLines[0]);
      }
    }
  }

  const fullNamePattern = /^[A-Za-z]+(?:\s+[A-Za-z]+){1,2}$/;
  const labelWords = new Set([
    "canada",
    "government",
    "permanent",
    "resident",
    "card",
    "passport",
    "nationality",
    "document",
    "identity",
    "sample",
    "specimen",
  ]);

  for (const line of lines) {
    if (!fullNamePattern.test(line) || line.length < 5 || line.length > 45) continue;
    const words = line.toLowerCase().split(/\s+/);
    if (words.some((word) => labelWords.has(word))) continue;
    return titleCaseName(line);
  }

  return null;
}

function normalizeConfidence(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return null;
}

function normalizeAuthenticity(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "likely_genuine" ||
    normalized === "uncertain" ||
    normalized === "likely_template_or_sample"
  ) {
    return normalized;
  }
  return null;
}

function buildAuthenticityAssessment({ llmParsed, templateHits, extractionMethod }) {
  let documentAuthenticity =
    normalizeAuthenticity(llmParsed?.document_authenticity) || "uncertain";
  let authenticityNote = llmParsed?.authenticity_note
    ? String(llmParsed.authenticity_note).trim()
    : null;
  let nameConfidence = normalizeConfidence(llmParsed?.name_confidence) || "medium";

  if (templateHits.length) {
    documentAuthenticity = "likely_template_or_sample";
    const hitNote = `Document may be a template or sample (detected: ${templateHits.join(", ")}). Verify authenticity separately.`;
    authenticityNote = authenticityNote ? `${authenticityNote} ${hitNote}` : hitNote;
    if (nameConfidence === "high") nameConfidence = "medium";
  }

  if (extractionMethod === "heuristic") {
    if (nameConfidence === "high") nameConfidence = "medium";
    if (!authenticityNote) {
      authenticityNote =
        "Name extracted from OCR layout patterns; not confirmed by AI model.";
    }
  }

  return { documentAuthenticity, authenticityNote, nameConfidence };
}

async function extractLegalNameFromIdentityText(text) {
  const systemPrompt = `
You are an extraction engine for government-issued identity documents from any country
(passports, national ID cards, driver's licenses, permanent resident cards, etc.).

Given the DOCUMENT TEXT (OCR output), extract the card holder's full legal name as it appears on the document.

Return ONLY a JSON object:

{
  "legal_name": "<full name string — provide your best guess if any holder name appears; use null ONLY if no personal name is visible>",
  "name_confidence": "high" | "medium" | "low",
  "document_authenticity": "likely_genuine" | "uncertain" | "likely_template_or_sample",
  "authenticity_note": "<1-2 sentences about whether this appears genuine vs sample/template/fake — does NOT block name extraction>",
  "document_type": "<brief label e.g. Canadian PR card, Pakistani CNIC, passport>"
}

Rules:
- ALWAYS extract the most likely holder name even if the document looks like a template, sample, PSD mockup, or demo card.
- If multiple names conflict, pick the one most clearly labeled as the holder (Name, Nom, Given names, Surname, etc.).
- name_confidence reflects certainty about the NAME text, not document authenticity.
- document_authenticity is separate: flag template/sample markers (e.g. PSDLEGIT, SPECIMEN, SAMPLE, TEMPLATE).
- Do NOT add keys beyond those listed.
DOCUMENT TEXT:
<<<
${text}
>>>
`;

  const result = await llmService.extractJson({
    systemPrompt,
    userPrompt: "Extract identity fields as strict JSON.",
    temperature: 0,
    maxTokens: 768,
  });

  const llmParsed = result?.parsed ?? null;
  const rawLegalName = llmParsed?.legal_name;
  let legalName = normalizeLegalName(rawLegalName);
  let extractionMethod = "llm";

  const templateHits = detectTemplateSignals(text);

  if (!legalName) {
    const heuristicName = parseNameFromOcrHeuristic(text);
    if (heuristicName) {
      legalName = heuristicName;
      extractionMethod = "heuristic";
    }
  }

  const authenticity = buildAuthenticityAssessment({
    llmParsed,
    templateHits,
    extractionMethod,
  });

  const documentTypeDetected = llmParsed?.document_type
    ? String(llmParsed.document_type).trim()
    : null;

  let failureReason = null;
  if (legalName) {
    failureReason = null;
  } else if (rawLegalName === null || rawLegalName === undefined) {
    failureReason = "No holder name found in OCR text (LLM and heuristic both failed)";
  } else {
    failureReason = `LLM returned empty or invalid legal_name: ${JSON.stringify(rawLegalName)}`;
  }

  logCnic("LLM name extraction finished", {
    provider: result?.provider,
    model: result?.model,
    llm_raw_json: result?.content,
    llm_parsed: llmParsed,
    legal_name: legalName ?? "(not extracted)",
    extraction_method: extractionMethod,
    name_confidence: authenticity.nameConfidence,
    document_authenticity: authenticity.documentAuthenticity,
    authenticity_note: authenticity.authenticityNote || undefined,
    document_type_detected: documentTypeDetected || undefined,
    template_markers: templateHits.length ? templateHits : undefined,
    failure_reason: failureReason || undefined,
  });

  return {
    legalName,
    nameConfidence: authenticity.nameConfidence,
    documentAuthenticity: authenticity.documentAuthenticity,
    authenticityNote: authenticity.authenticityNote,
    documentTypeDetected,
    extractionMethod,
    llmContent: result?.content ?? null,
    llmParsed,
    failureReason,
  };
}

async function uploadOrReplaceIdentityDocument({
  submissionId,
  file,
  userId,
  workspaceId,
  organizationId,
}) {
  logCnic("Identity upload started", {
    submission_id: submissionId,
    file_name: file?.originalname,
    mime_type: file?.mimetype,
    size_bytes: file?.size,
  });

  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) {
    const err = new Error("Submission not found.");
    err.statusCode = 404;
    throw err;
  }

  const oldFileId = submission.identity_document?.file || null;

  let savedFile;
  try {
    savedFile = await FileService.createFromUpload(
      {
        file,
        displayName: file.originalname,
        folder: submissionIdentityFolder(submissionId),
        meta: buildSubmissionFileMeta({
          submissionId,
          workspaceId,
          organizationId,
          type: "identity_document",
        }),
      },
      userId,
      userId
    );
  } catch (uploadErr) {
    logCnic("Identity upload failed (file save)", {
      submission_id: submissionId,
      error: uploadErr?.message || String(uploadErr),
    });
    const err = new Error(uploadErr?.message || "Failed to upload identity document.");
    err.statusCode = 400;
    throw err;
  }

  let text = "";
  let legalName = null;
  let nameConfidence = null;
  let documentAuthenticity = null;
  let authenticityNote = null;
  let documentTypeDetected = null;
  let extractionStatus = "extract_failed";
  let extractionError = null;
  let failureReason = null;
  let llmContent = null;
  let llmParsed = null;

  try {
    text = await extractTextFromFile({
      ...file,
      buffer: file.buffer,
    });
    const trimmedText = String(text || "").trim();

    logCnic("OCR text extracted from identity image", {
      submission_id: submissionId,
      file_name: file.originalname,
      ocr_text_length: trimmedText.length,
      ocrText: trimmedText,
    });

    if (!trimmedText) {
      failureReason = "OCR_EMPTY";
      extractionError = "No readable text found in ID image.";
      logCnic("Legal name not extracted", {
        submission_id: submissionId,
        outcome: "failed",
        reason: failureReason,
        detail: "OCR returned no text — image may be blank, too blurry, or unsupported format.",
      });
    } else {
      const nameResult = await extractLegalNameFromIdentityText(trimmedText);
      legalName = nameResult.legalName;
      nameConfidence = nameResult.nameConfidence;
      documentAuthenticity = nameResult.documentAuthenticity;
      authenticityNote = nameResult.authenticityNote;
      documentTypeDetected = nameResult.documentTypeDetected;
      llmContent = nameResult.llmContent;
      llmParsed = nameResult.llmParsed;
      failureReason = nameResult.failureReason;

      if (legalName) {
        extractionStatus = "extracted";
        logCnic("Legal name extracted successfully", {
          submission_id: submissionId,
          legal_name: legalName,
          name_confidence: nameConfidence,
          document_authenticity: documentAuthenticity,
          authenticity_note: authenticityNote || undefined,
          document_type_detected: documentTypeDetected || undefined,
          extraction_method: nameResult.extractionMethod,
          ocr_text_length: trimmedText.length,
        });
      } else {
        extractionError = failureReason || "Legal name could not be detected from this image.";
        logCnic("Legal name not extracted", {
          submission_id: submissionId,
          outcome: "failed",
          reason: failureReason || "UNKNOWN",
          ocr_text_length: trimmedText.length,
          llm_raw_json: llmContent,
          llm_parsed: llmParsed,
          ocrText: trimmedText,
          hint: "Check ocr_text above — if name is visible but LLM returned null, improve image quality or enter name manually.",
        });
      }
    }
  } catch (err) {
    failureReason = "EXTRACTION_EXCEPTION";
    extractionError = err?.message || "Failed to extract text from ID image.";
    logCnic("Legal name extraction error", {
      submission_id: submissionId,
      outcome: "error",
      reason: failureReason,
      error: extractionError,
      stack: err?.stack?.split("\n").slice(0, 3).join(" | "),
      ocr_text_length: String(text || "").trim().length,
      ocrText: String(text || "").trim() || undefined,
    });
  }

  submission.identity_document = {
    file: savedFile._id,
    document_name: file.originalname,
    uploaded_at: new Date(),
    uploaded_by: userId,
    extraction_status: extractionStatus,
    extraction_error: extractionError,
    extracted_at: extractionStatus === "extracted" ? new Date() : null,
    name_confidence: nameConfidence,
    document_authenticity: documentAuthenticity,
    authenticity_note: authenticityNote,
    document_type_detected: documentTypeDetected,
  };

  if (legalName) {
    submission.legal_name = legalName;
  }

  await submission.save();

  if (oldFileId && String(oldFileId) !== String(savedFile._id)) {
    try {
      const oldFile = await File.findById(oldFileId);
      if (oldFile) await clearRagIndexForFile(oldFile);
      await FileService.hardDelete(oldFileId, userId, userId);
    } catch (deleteErr) {
      console.error("Old identity file delete failed:", deleteErr);
    }
  }

  if (legalName) {
    await billingService.trackExtractionUsage({
      organizationId,
      amount: 1,
    });
  }

  logCnic("Identity upload finished", {
    submission_id: submissionId,
    status: extractionStatus,
    legal_name: legalName ?? "(not extracted)",
    failure_reason: failureReason || undefined,
    ocr_text_length: String(text || "").length,
    needs_manual_entry: !legalName,
  });

  return {
    legalName,
    nameConfidence,
    documentAuthenticity,
    authenticityNote,
    documentTypeDetected,
    rawTextLength: String(text || "").length,
    extractionStatus,
    extractionError,
    failureReason,
    savedFile,
  };
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
    const masterFieldCount = Array.isArray(masterSchemaFields?.items)
      ? masterSchemaFields.items.length
      : 0;

    if (masterFieldCount === 0) {
      throw new Error(
        "No master fields found in this workspace. Import or create a master field schema before extracting.",
      );
    }

    console.log(
      `[extract] workspaceId=${workspaceId} masterFields=${masterFieldCount} file=${fileName} textLen=${text.length}`,
    );

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

async function deleteGeneratedDocument({ submissionId, generatedDocId, userId, workspaceId }) {
  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) {
    const err = new Error("Submission not found.");
    err.statusCode = 404;
    throw err;
  }

  const entry = submission.generated_documents.id(generatedDocId);
  if (!entry) {
    const err = new Error("Generated document not found.");
    err.statusCode = 404;
    throw err;
  }

  const fileId = entry.file_id;

  await Submission.updateOne(
    { _id: submissionId, workspace: workspaceId },
    { $pull: { generated_documents: { _id: generatedDocId } } }
  );

  const warnings = [];
  try {
    if (fileId) {
      await FileService.hardDelete(fileId, userId, userId);
    }
  } catch (e) {
    console.error("Generated file hard delete failed:", e);
    warnings.push({
      code: "FILE_DELETE_FAILED",
      message: "File could not be deleted (will remain orphan until cleanup).",
    });
  }

  return {
    generatedDocId: String(generatedDocId),
    fileId: fileId ? String(fileId) : null,
    warnings,
  };
}

module.exports = {
  uploadSubmissionDocument,
  uploadSubmissionDocuments,
  extractSubmissionDocumentFields,
  replaceSubmissionDocument,
  deleteSubmissionDocument,
  deleteGeneratedDocument,
  uploadOrReplaceIdentityDocument,
  inferExtractionStatus,
};
