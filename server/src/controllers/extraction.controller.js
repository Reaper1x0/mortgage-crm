// backend/controllers/extractionController.js
// ✅ Two-pass extraction added (Pass A: detect present keys, Pass B: extract only those keys)
// ✅ Keeps existing endpoints/response shapes working
// ✅ Minimizes token usage by NOT sending full schema descriptions
// ✅ Adds safe logs to compare token usage before/after

const openai = require("../config/openai.config");
const { extractTextFromFile } = require("../services/textextraction.service");
const { R2XX, R4XX, R5XX } = require("../Responses");
const { catchAsync } = require("../utils");
const SubmissionService = require("../services/submission.service");
const { FileService } = require("../services/file.service");
const { Submission } = require("../models");
const MasterFieldService = require("../services/masterFields.service");
const { recomputeSubmissionFields } = require("../services/submissionFields.service");

/**
 * Small helper to call OpenAI for CNIC name extraction
 */
async function extractLegalNameFromText(text) {
  const systemPrompt = `
You are an extraction engine for Pakistani CNICs.
Given the DOCUMENT TEXT, extract the full legal name of the card holder.
Return ONLY a JSON object:

{
  "legal_name": "<exact name string or null>"
}

- Do NOT add any other keys.
- If you are unsure, return "legal_name": null.
DOCUMENT TEXT:
<<<
${text}
>>>
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = completion.choices?.[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content);
    return parsed?.legal_name || null;
  } catch (err) {
    console.error("Failed to parse CNIC OpenAI response JSON:", err, content);
    return null;
  }
}

/**
 * PASS A: Cheap key presence detector
 * - Only returns keys it can confidently find in the doc text
 */
const FIELD_KEYS_DETECTOR_SYSTEM_PROMPT = `
You are a document field KEY detector.

You will receive:
1) DOCUMENT TEXT for exactly one file
2) A list of allowed field keys (and optional short labels)

TASK:
- Identify which keys are explicitly present in the document text.
- Return ONLY a JSON object with this exact shape:

{
  "present_keys": ["key1","key2",...]
}

RULES:
- Output ONLY keys from the provided list.
- Use exact key strings as provided.
- Do NOT invent keys.
- If unsure, DO NOT include the key.
- Keep the list reasonably complete; include all keys that appear.
`;

/**
 * PASS B: Full extraction but only for a reduced schema (present keys only)
 */
const FIELD_EXTRACTION_SYSTEM_PROMPT = `
You are an extraction engine. Follow these rules strictly:

CONTEXT
- You will receive TEXT FOR EXACTLY ONE DOCUMENT FILE.
- Extract values ONLY from that document's text.

GOAL
- Extract values for ONLY the fields provided in the schema.
- Return ONLY the fields that are present (do not include missing fields).

STRICT RULES
- Return ONLY a single JSON object (no prose).
- Keys MUST match exactly from the provided schema.
- Do NOT invent data. Use exact spans as they appear in the text.
- If a field is not explicitly present: DO NOT include it in the array.
- If multiple conflicting values appear for the same field, DO NOT resolve them:
  - present: true
  - value: first found value (or null if unclear)
  - conflicts: include all distinct conflicting raw values

OUTPUT JSON SHAPE
{
  "fields": [
    {
      "key": "<from schema>",
      "present": true,
      "value": { "raw": "<string|number>", "normalized": "<string|number|omitted>" } | null,
      "conflicts": [{ "raw": "<string|number>" }, ...],
      "occurrences": [
        { "snippet": "<short surrounding text>", "page": null, "line_hint": null }
      ],
      "confidence": "high|medium|low",
      "notes": ""
    }
  ]
}
`;

function sanitizeExtractedFields(fieldsArray, allowedKeysSet) {
  if (!Array.isArray(fieldsArray)) return [];

  const out = [];
  for (const f of fieldsArray) {
    const key = String(f?.key || "").trim();
    if (!key) continue;

    // drop anything not in schema
    if (allowedKeysSet && !allowedKeysSet.has(key) && key !== "legal_name") continue;

    out.push({
      key,
      value: {
        raw: f?.value?.raw ?? null,
        normalized: f?.value?.normalized ?? null,
      },
      conflicts: Array.isArray(f?.conflicts)
        ? f.conflicts
            .map((c) => ({ raw: c?.raw ?? null }))
            .filter((x) => x.raw !== null)
        : [],
      occurrences: Array.isArray(f?.occurrences)
        ? f.occurrences.map((o) => ({
            snippet: o?.snippet ?? "",
            page: o?.page ?? null,
            line_hint: o?.line_hint ?? null,
          }))
        : [],
      confidence: ["high", "medium", "low"].includes(f?.confidence) ? f.confidence : "low",
      notes: typeof f?.notes === "string" ? f.notes : "",
    });
  }
  return out;
}

function buildCompactSchema(masterFieldsItems) {
  // Compact schema: keeps tokens low but still usable for extraction
  return (masterFieldsItems || []).map((m) => ({
    key: m.key,
    label: m.label_on_form || m.label || "",
    type: m.type,
  }));
}

async function detectPresentKeysForSingleText({ text, fileName, masterFieldsItems }) {
  const compactSchema = buildCompactSchema(masterFieldsItems);
  const allowedKeys = new Set(compactSchema.map((f) => String(f.key)));

  const userPrompt = `
FILE_NAME: ${fileName}

DOCUMENT TEXT:
<<<
${text}
>>>

ALLOWED KEYS (use ONLY these exact key strings):
<<<
${JSON.stringify(compactSchema, null, 2)}
>>>
`;

  const messages = [
    { role: "system", content: FIELD_KEYS_DETECTOR_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  // logs for token comparison
  console.log("[LLM-A] file:", fileName);
  console.log("[LLM-A] extractedTextLen:", text.length);
  console.log("[LLM-A] schemaFieldsCount:", compactSchema.length);
  console.log("[LLM-A] schemaJSONStringLen:", JSON.stringify(compactSchema).length);
  console.log("[LLM-A] userPromptLen:", userPrompt.length);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = completion.choices?.[0]?.message?.content || "{}";
  console.log("[LLM-A] usage:", completion.usage);
  console.log("[LLM-A] model:", completion.model);
  console.log("[LLM-A] outputLen:", (content || "").length);

  let payload;
  try {
    payload = JSON.parse(content);
  } catch (e) {
    console.error("[LLM-A] invalid JSON:", e);
    return { presentKeys: [], allowedKeys };
  }

  const presentKeysRaw = Array.isArray(payload?.present_keys) ? payload.present_keys : [];
  const presentKeys = presentKeysRaw
    .map((k) => String(k || "").trim())
    .filter((k) => k && allowedKeys.has(k));

  console.log("[LLM-A] presentKeysCount:", presentKeys.length);
  return { presentKeys, allowedKeys };
}

async function extractFieldsForPresentKeys({ text, fileName, masterFieldsItems, presentKeys }) {
  const presentSet = new Set((presentKeys || []).map((k) => String(k)));
  const reducedSchema = (masterFieldsItems || [])
    .filter((m) => presentSet.has(String(m.key)))
    .map((m) => ({
      key: m.key,
      type: m.type,
      required: !!m.required,
      description: m.description || "", // ok if empty
    }));

  const allowedKeys = new Set(reducedSchema.map((f) => String(f.key)));

  // If Pass A returns nothing, don't waste a Pass B call
  if (!reducedSchema.length) {
    return [];
  }

  const userPrompt = `
FILE_NAME: ${fileName}

DOCUMENT TEXT (single file):
<<<
${text}
>>>

FIELDS (reduced schema; match by "key"):
<<<
${JSON.stringify({ fields: reducedSchema }, null, 2)}
>>>
`;

  const messages = [
    { role: "system", content: FIELD_EXTRACTION_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  console.log("[LLM-B] file:", fileName);
  console.log("[LLM-B] presentKeysCount:", reducedSchema.length);
  console.log("[LLM-B] reducedSchemaJSONStringLen:", JSON.stringify(reducedSchema).length);
  console.log("[LLM-B] userPromptLen:", userPrompt.length);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = completion.choices?.[0]?.message?.content || "{}";
  console.log("[LLM-B] usage:", completion.usage);
  console.log("[LLM-B] model:", completion.model);
  console.log("[LLM-B] outputLen:", (content || "").length);

  let payload;
  try {
    payload = JSON.parse(content);
  } catch (e) {
    throw new Error("Model returned invalid JSON.");
  }

  console.log(
    "[LLM-B] returnedFieldsCount(raw):",
    Array.isArray(payload?.fields) ? payload.fields.length : 0
  );

  const extracted = sanitizeExtractedFields(payload?.fields, allowedKeys);

  // Debug: keys dropped due to mismatch (helps explain 31->28 type issues)
  const returnedKeys = Array.isArray(payload?.fields) ? payload.fields.map((f) => String(f?.key || "").trim()) : [];
  const notAllowed = returnedKeys.filter((k) => k && !allowedKeys.has(k));
  if (notAllowed.length) console.log("[LLM-B] keysNotInReducedSchema:", notAllowed);

  console.log("[LLM-B] returnedFieldsCount(sanitized):", extracted.length);

  return extracted;
}

/**
 * Used by replace endpoint (kept compatible, now also two-pass)
 */
async function runFieldExtractionForSingleText({ text, fileName, masterFields }) {
  const masterItems = Array.isArray(masterFields?.items)
    ? masterFields.items
    : Array.isArray(masterFields)
    ? masterFields
    : [];

  const { presentKeys } = await detectPresentKeysForSingleText({
    text,
    fileName,
    masterFieldsItems: masterItems,
  });

  const extracted_fields = await extractFieldsForPresentKeys({
    text,
    fileName,
    masterFieldsItems: masterItems,
    presentKeys,
  });

  return extracted_fields;
}

const ExtractionController = {
  /**
   * POST /api/cnic/extract-name
   */
  handleCnicUpload: catchAsync(async (req, res) => {
    const file = req.file;
    const submissionId = req.params.id || req.body.submissionId;

    if (!submissionId) return R4XX(res, 400, "Submission id is required.");
    if (!file) return R4XX(res, 400, "CNIC file is required.");

    let text = "";
    try {
      text = await extractTextFromFile({
        ...file,
        buffer: file.buffer,
        path: file.path,
      });
    } catch (err) {
      console.error("Text extraction failed for CNIC:", err);
      return R5XX(res, { details: "Failed to extract text from CNIC." });
    }

    if (!text || !text.trim()) return R4XX(res, 400, "No readable text found in CNIC image/document.");

    let legalName = null;
    try {
      legalName = await extractLegalNameFromText(text);
    } catch (err) {
      console.error("OpenAI CNIC name extraction failed:", err);
    }

    if (!legalName) {
      return R2XX(res, "CNIC processed, but legal name could not be detected. Please upload a clearer image.", 200, {
        legalName: null,
        rawTextLength: text.length,
      });
    }

    const updated = await SubmissionService.updateSubmission(submissionId, { legal_name: legalName }, req.user);
    if (!updated) return R4XX(res, 404, "Submission not found.");

    return R2XX(res, "CNIC processed successfully.", 200, {
      legalName,
      rawTextLength: text.length,
      submission: updated,
      needsManualLegalName: false,
    });
  }),

  /**
   * POST /backend/api/extraction/documents/extract-fields/:id
   * (Your existing route name)
   */
  handleDocumentsUpload: catchAsync(async (req, res) => {
    const files = req.files || [];
    const submissionId = req.params.id || req.body.submissionId;
    const userId = req.user;

    if (!submissionId) return R4XX(res, 400, "Submission id is required.");
    if (!files.length) return R4XX(res, 400, "At least one document is required.");

    const personName = req.body?.personName || null;

    const submission = await Submission.findOne({ _id: submissionId });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    const results = [];
    const documentEntries = [];

    // Load schema once per request (saves time + avoids subtle differences per file)
    const masterSchemaFields = await MasterFieldService.getAllMasterFields({ limit: -1 });
    const masterItems = masterSchemaFields?.items || [];

    for (const file of files) {
      try {
        const savedFile = await FileService.createFromUpload(
          {
            file,
            displayName: file.originalname,
            folder: `uploads/submissions/${submissionId}`,
            meta: { submissionId },
          },
          userId
        );

        const text = await extractTextFromFile({
          ...file,
          buffer: file.buffer,
          path: file.path,
        });

        if (!text || !text.trim()) {
          results.push({
            original_name: file.originalname,
            ok: false,
            reason: "No readable text extracted.",
          });
          continue;
        }

        // ✅ Two-pass
        const { presentKeys } = await detectPresentKeysForSingleText({
          text,
          fileName: file.originalname,
          masterFieldsItems: masterItems,
        });

        const extracted_fields = await extractFieldsForPresentKeys({
          text,
          fileName: file.originalname,
          masterFieldsItems: masterItems,
          presentKeys,
        });

        documentEntries.push({
          userId,
          document: savedFile._id,
          extracted_fields,
          uploadDate: new Date(),
        });

        results.push({
          original_name: file.originalname,
          ok: true,
          file: {
            id: savedFile._id,
            url: savedFile.url,
            storage_path: savedFile.storage_path,
          },
          extracted_fields_count: extracted_fields.length,
          present_keys_count: presentKeys.length,
        });
      } catch (err) {
        console.error(`Document processing failed: ${file.originalname}`, err);
        results.push({
          original_name: file.originalname,
          ok: false,
          reason: err?.message || "Failed to process document.",
        });
      }
    }

    if (!documentEntries.length) {
      return R4XX(res, 400, "No documents could be processed successfully.", { results });
    }

    submission.documents.push(...documentEntries);
    if (submission.status === "pending") submission.status = "review";

    await submission.save();

    const updatedSubmission = await recomputeSubmissionFields(submission._id, userId);

    return R2XX(res, "Documents processed successfully.", 200, {
      personName: personName || updatedSubmission.legal_name || null,
      submission: updatedSubmission,
      results,
    });
  }),

  /**
   * GET /backend/api/submissions/:id/documents
   */
  listSubmissionDocuments: catchAsync(async (req, res) => {
    const userId = req.user;
    const submissionId = req.params.id;

    const submission = await Submission.findOne({ _id: submissionId }).populate("documents.document");
    if (!submission) return R4XX(res, 404, "Submission not found.");

    return R2XX(res, "Documents fetched successfully.", 200, {
      submissionId: submission._id,
      documents: submission.documents || [],
    });
  }),

  /**
   * PUT /backend/api/submissions/:id/documents/:docEntryId
   */
  replaceSubmissionDocument: catchAsync(async (req, res) => {
    const userId = req.user;
    const submissionId = req.params.id;
    const docEntryId = req.params.docEntryId;
    const file = req.file;

    if (!file) return R4XX(res, 400, "file is required.");

    const submission = await Submission.findOne({ _id: submissionId });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    const docEntry = submission.documents.id(docEntryId);
    if (!docEntry) return R4XX(res, 404, "Document entry not found.");

    const oldFileId = docEntry.document;

    const savedFile = await FileService.createFromUpload(
      {
        file,
        displayName: file.originalname,
        folder: `uploads/submissions/${submissionId}`,
        meta: {
          submissionId,
          replaced_docEntryId: docEntryId,
          replaced_oldFileId: String(oldFileId),
        },
      },
      userId
    );

    const text = await extractTextFromFile({
      ...file,
      buffer: file.buffer,
      path: file.path,
    });

    if (!text || !text.trim()) {
      await FileService.hardDelete(savedFile._id, userId);
      return R4XX(res, 400, "No readable text extracted from replacement document.");
    }

    const masterSchemaFields = await MasterFieldService.getAllMasterFields({ limit: -1 });

    let extracted_fields;
    try {
      extracted_fields = await runFieldExtractionForSingleText({
        text,
        fileName: file.originalname,
        masterFields: masterSchemaFields,
      });
    } catch (err) {
      await FileService.hardDelete(savedFile._id, userId);
      return R4XX(res, 400, err?.message || "Failed to extract fields from document.");
    }

    await Submission.updateOne(
      { _id: submissionId, "documents._id": docEntryId },
      {
        $set: {
          "documents.$.document": savedFile._id,
          "documents.$.extracted_fields": extracted_fields,
          "documents.$.uploadDate": new Date(),
        },
      }
    );

    const updatedSubmission = await recomputeSubmissionFields(submissionId, userId);

    const warnings = [];
    try {
      if (oldFileId) await FileService.hardDelete(oldFileId, userId);
    } catch (e) {
      console.error("Old file hard delete failed:", e);
      warnings.push({
        code: "OLD_FILE_DELETE_FAILED",
        message: "Old file could not be deleted (will remain orphan until cleanup).",
      });
    }

    return R2XX(res, "Document replaced successfully.", 200, {
      submission: updatedSubmission,
      replaced: {
        docEntryId,
        oldFileId: String(oldFileId),
        newFileId: String(savedFile._id),
      },
      warnings,
    });
  }),

  /**
   * DELETE /backend/api/submissions/:id/documents/:docEntryId
   */
  deleteSubmissionDocument: catchAsync(async (req, res) => {
    const userId = req.user;
    const submissionId = req.params.id;
    const docEntryId = req.params.docEntryId;

    const submission = await Submission.findOne({ _id: submissionId });
    if (!submission) return R4XX(res, 404, "Submission not found.");

    const docEntry = submission.documents.id(docEntryId);
    if (!docEntry) return R4XX(res, 404, "Document entry not found.");

    const fileId = docEntry.document;

    await Submission.updateOne({ _id: submissionId }, { $pull: { documents: { _id: docEntryId } } });

    const updatedSubmission = await recomputeSubmissionFields(submissionId, userId);

    const warnings = [];
    try {
      if (fileId) await FileService.hardDelete(fileId, userId);
    } catch (e) {
      console.error("File hard delete failed:", e);
      warnings.push({
        code: "FILE_DELETE_FAILED",
        message: "File could not be deleted (will remain orphan until cleanup).",
      });
    }

    return R2XX(res, "Document deleted successfully.", 200, {
      submission: updatedSubmission,
      deleted: { docEntryId, fileId: String(fileId) },
      warnings,
    });
  }),
};

module.exports = ExtractionController;
