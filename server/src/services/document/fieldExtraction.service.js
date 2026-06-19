const llmService = require("../llm/llm.service");

const FIELD_KEYS_DETECTOR_SYSTEM_PROMPT = `
You are a document field KEY detector.

You will receive:
1) DOCUMENT TEXT for exactly one file
2) A list of allowed field keys with their descriptions/labels

TASK:
- Analyze the document text and identify which field keys from the provided list have corresponding data in the document.
- Match document content to field keys based on semantic meaning, not just exact string matches.
- For example, if the document contains "Property: Lot 12, Block 5..." and there's a key like "property_address" or "property_description", include that key.
- If the document contains "Mortgagor: Name: John Doe" and there's a key like "mortgagor_name" or "borrower_name", include that key.
- Return ONLY a JSON object with this exact shape:

{
  "present_keys": ["key1","key2",...]
}

RULES:
- Output ONLY keys from the provided list (use exact key strings as provided).
- Match based on semantic meaning: look for content that relates to each field's purpose.
- Be comprehensive: include all keys where you can find related information in the document.
- Use the field descriptions/labels to help understand what each key represents.
- If a field's concept appears in the document (even with different wording), include the key.
- Do NOT invent keys that aren't in the provided list.
`;

/**
 * PASS B: Full extraction but only for a reduced schema (present keys only)
 * Enhanced with validation and comprehensive traceability
 */
const FIELD_EXTRACTION_SYSTEM_PROMPT = `
You are an extraction engine. Follow these rules strictly:

CONTEXT
- You will receive TEXT FOR EXACTLY ONE DOCUMENT FILE.
- Extract values ONLY from that document's text.
- You will receive validation rules for each field from the schema.

GOAL
- Extract values for ONLY the fields provided in the schema.
- Return ONLY the fields that are present (do not include missing fields).
- Validate each extracted value against the field's validation rules.
- Provide comprehensive traceability information for each extraction.

STRICT RULES
- Return ONLY a single JSON object (no prose).
- Keys MUST match exactly from the provided schema.
- Do NOT invent data. Use exact spans as they appear in the text.
- If a field is not explicitly present: DO NOT include it in the array.
- If multiple conflicting values appear for the same field, DO NOT resolve them:
  - present: true
  - value: first found value (or null if unclear)
  - conflicts: include all distinct conflicting raw values
- For each occurrence, provide the exact snippet, page number (if available), and line context
- Validate each extracted value against ALL validation rules provided for that field
- Document the source location (snippet, page) for traceability

OUTPUT JSON SHAPE
{
  "fields": [
    {
      "key": "<from schema>",
      "present": true,
      "value": { "raw": "<string|number>", "normalized": "<string|number|omitted>" } | null,
      "conflicts": [{ "raw": "<string|number>" }, ...],
      "occurrences": [
        {
          "snippet": "<exact surrounding text with the value highlighted>",
          "page": <number or null>,
          "line_hint": "<line number or context>"
        }
      ],
      "confidence": "high|medium|low",
      "notes": "",
      "validation": {
        "validated": true,
        "passed": true|false,
        "errors": [
          {
            "rule": "<validation rule that failed>",
            "message": "<human-readable error message>",
            "severity": "error|warning"
          }
        ]
      },
      "traceability": {
        "document_name": "<file name>",
        "extraction_method": "llm",
        "extracted_at": "<ISO timestamp>"
      }
    }
  ]
}

VALIDATION RULES:
- For each field, check ALL validation_rules provided in the schema
- If a rule fails, add an error entry with:
  - rule: the exact rule string that failed
  - message: a clear explanation of why it failed
  - severity: "error" for critical failures, "warning" for minor issues
- If all rules pass, set "passed": true and "errors": []
- Always set "validated": true if you attempted validation

TRACEABILITY REQUIREMENTS:
- document_name: Use the FILE_NAME provided
- extraction_method: Always "llm"
- extracted_at: Current timestamp in ISO format
- For occurrences: Provide the most specific location information available
  - snippet: Include enough context to identify where the value was found (at least 50 chars before and after)
  - page: Extract page number if mentioned in the text or if document structure indicates it
  - line_hint: Provide line number, paragraph number, or section identifier if available
`;

function sanitizeExtractedFields(fieldsArray, allowedKeysSet, fileName, fileId) {
  if (!Array.isArray(fieldsArray)) return [];

  const out = [];
  const extractedAt = new Date();
  
  for (const f of fieldsArray) {
    const key = String(f?.key || "").trim();
    if (!key) continue;

    // drop anything not in schema
    if (allowedKeysSet && !allowedKeysSet.has(key) && key !== "legal_name") continue;

    // Sanitize validation results
    const validation = f?.validation || {};
    const validationErrors = Array.isArray(validation.errors)
      ? validation.errors
          .map((e) => ({
            rule: String(e?.rule || ""),
            message: String(e?.message || ""),
            severity: ["error", "warning"].includes(e?.severity) ? e.severity : "error",
          }))
          .filter((e) => e.rule && e.message)
      : [];

    // Sanitize occurrences with enhanced traceability
    const occurrences = Array.isArray(f?.occurrences)
      ? f.occurrences.map((o) => ({
          snippet: String(o?.snippet || ""),
          page: typeof o?.page === "number" ? o.page : null,
          line_hint: String(o?.line_hint || ""),
          document_name: String(fileName || ""),
          document_id: fileId || null,
          extracted_at: extractedAt,
        }))
      : [];

    // Sanitize traceability
    const traceability = f?.traceability || {};
    
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
      occurrences,
      confidence: ["high", "medium", "low"].includes(f?.confidence) ? f.confidence : "low",
      notes: typeof f?.notes === "string" ? f.notes : "",
      validation: {
        validated: Boolean(validation.validated),
        passed: Boolean(validation.passed) && validationErrors.length === 0,
        errors: validationErrors,
        validated_at: validation.validated ? extractedAt : null,
      },
      traceability: {
        document_name: String(traceability.document_name || fileName || ""),
        document_id: traceability.document_id || fileId || null,
        file_id: fileId || null,
        extracted_at: traceability.extracted_at ? new Date(traceability.extracted_at) : extractedAt,
        extraction_method: traceability.extraction_method || "llm",
      },
    });
  }
  return out;
}

function buildCompactSchema(masterFieldsItems) {
  // Compact schema: includes key, label, description, and type for better matching
  return (masterFieldsItems || []).map((m) => ({
    key: m.key,
    label: m.label || m.label_on_form || "",
    description: m.description || "",
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

ALLOWED FIELD KEYS (analyze the document and identify which keys have matching data):
Each field has:
- key: The exact key string you must use in your response
- label: A human-readable label for the field
- description: What this field represents
- type: The data type (string, number, date, etc.)

<<<
${JSON.stringify(compactSchema, null, 2)}
>>>

INSTRUCTIONS:
1. Read through the document text carefully
2. For each field in the schema, check if the document contains information that matches that field's purpose
3. Match based on meaning: if the document mentions "Property: Lot 12..." and there's a field about property address/description, include that field's key
4. If the document mentions "Mortgagor: Name: John Doe" and there's a field about mortgagor/borrower name, include that field's key
5. Return ALL keys where you can find related information in the document
6. Use ONLY the exact key strings from the schema above
`;

  // logs for token comparison
  console.log("[LLM-A] file:", fileName);
  console.log("[LLM-A] extractedTextLen:", text.length);
  console.log("[LLM-A] schemaFieldsCount:", compactSchema.length);
  console.log("[LLM-A] schemaJSONStringLen:", JSON.stringify(compactSchema).length);
  console.log("[LLM-A] userPromptLen:", userPrompt.length);

  let payload;
  try {
    const result = await llmService.extractJson({
      systemPrompt: FIELD_KEYS_DETECTOR_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0,
      maxTokens: 4096,
    });
    payload = result.parsed || {};
  } catch (e) {
    console.error("[LLM-A] invalid JSON:", e);
    return { presentKeys: [], allowedKeys };
  }

  console.log("[LLM-A] parsed payload:", JSON.stringify(payload, null, 2));

  const presentKeysRaw = Array.isArray(payload?.present_keys) ? payload.present_keys : [];
  console.log("[LLM-A] presentKeysRaw (before filtering):", presentKeysRaw);
  console.log("[LLM-A] allowedKeys sample (first 10):", Array.from(allowedKeys).slice(0, 10));
  
  const presentKeys = presentKeysRaw
    .map((k) => String(k || "").trim())
    .filter((k) => k && allowedKeys.has(k));

  console.log("[LLM-A] presentKeysCount:", presentKeys.length);
  console.log("[LLM-A] presentKeys:", presentKeys);
  
  if (presentKeys.length === 0 && presentKeysRaw.length > 0) {
    console.warn("[LLM-A] WARNING: LLM returned keys but none matched allowedKeys!");
    console.warn("[LLM-A] Keys returned by LLM:", presentKeysRaw);
    console.warn("[LLM-A] Total allowed keys:", allowedKeys.size);
  }
  
  return { presentKeys, allowedKeys };
}

/**
 * Extract fields for a single chunk of the schema
 */
async function extractFieldsForChunk({ text, fileName, schemaChunk, fileId }) {
  const allowedKeys = new Set(schemaChunk.map((f) => String(f.key)));

  const userPrompt = `
FILE_NAME: ${fileName}

DOCUMENT TEXT (single file):
<<<
${text}
>>>

FIELDS (reduced schema; match by "key"):
<<<
${JSON.stringify({ fields: schemaChunk }, null, 2)}
>>>

INSTRUCTIONS:
1. Extract values for each field from the document text
2. For each extracted value, validate it against ALL validation_rules provided for that field
3. Provide comprehensive traceability:
   - Include exact snippets showing where the value was found
   - Include page numbers if available in the document
   - Include line hints or section identifiers
   - Set document_name to: "${fileName}"
   - Set extraction_method to: "llm"
   - Set extracted_at to current ISO timestamp
4. For validation:
   - Test each validation rule against the extracted value
   - If a rule fails, add an error with the rule name, clear message, and severity
   - Set "validated": true and "passed": false if any errors exist
   - Set "validated": true and "passed": true if all rules pass
`;

  console.log("[LLM-B] chunk size:", schemaChunk.length);
  console.log("[LLM-B] chunkSchemaJSONStringLen:", JSON.stringify(schemaChunk).length);
  console.log("[LLM-B] userPromptLen:", userPrompt.length);

  let payload;
  try {
    const result = await llmService.extractJson({
      systemPrompt: FIELD_EXTRACTION_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0,
      maxTokens: 16384,
    });
    payload = result.parsed || {};
  } catch (e) {
    console.error("[LLM-B] JSON parse error:", e.message);
    throw new Error(`Model returned invalid JSON: ${e.message}`);
  }

  const extracted = sanitizeExtractedFields(payload?.fields, allowedKeys, fileName, fileId);
  return extracted;
}

async function extractFieldsForPresentKeys({ text, fileName, masterFieldsItems, presentKeys, fileId }) {
  const presentSet = new Set((presentKeys || []).map((k) => String(k)));
  const reducedSchema = (masterFieldsItems || [])
    .filter((m) => presentSet.has(String(m.key)))
    .map((m) => ({
      key: m.key,
      type: m.type,
      required: !!m.required,
      description: m.description || "",
      validation_rules: Array.isArray(m.validation_rules) ? m.validation_rules : [],
    }));

  // If Pass A returns nothing, don't waste a Pass B call
  if (!reducedSchema.length) {
    return [];
  }

  // Chunk size: process in batches to avoid token limits
  // With validation and traceability, each field can be quite large, so use smaller chunks
  const CHUNK_SIZE = 30; // Reduced from 50 to handle detailed responses
  
  // If we have many fields, split into chunks
  if (reducedSchema.length > CHUNK_SIZE) {
    console.log(`[LLM-B] Splitting ${reducedSchema.length} fields into chunks of ${CHUNK_SIZE}`);
    
    const chunks = [];
    for (let i = 0; i < reducedSchema.length; i += CHUNK_SIZE) {
      chunks.push(reducedSchema.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`[LLM-B] Processing ${chunks.length} chunks`);
    
    // Process chunks sequentially to avoid rate limits
    const allExtracted = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[LLM-B] Processing chunk ${i + 1}/${chunks.length}`);
      try {
        const chunkResults = await extractFieldsForChunk({
          text,
          fileName,
          schemaChunk: chunks[i],
          fileId,
        });
        allExtracted.push(...chunkResults);
      } catch (err) {
        console.error(`[LLM-B] Chunk ${i + 1} failed:`, err.message);
        // Continue with other chunks even if one fails
        // The error will be logged but we'll return what we have
      }
    }
    
    console.log(`[LLM-B] Total extracted fields: ${allExtracted.length}`);
    
    // Log validation summary
    const validationSummary = allExtracted.reduce((acc, f) => {
      if (f.validation?.validated) {
        acc.validated++;
        if (f.validation.passed) acc.passed++;
        if (f.validation.errors?.length) acc.failed++;
      }
      return acc;
    }, { validated: 0, passed: 0, failed: 0 });
    console.log("[LLM-B] validationSummary:", validationSummary);
    
    return allExtracted;
  }

  // For smaller requests, process using the chunk function (single chunk)
  console.log(`[LLM-B] Processing ${reducedSchema.length} fields in single request`);
  
  const extracted = await extractFieldsForChunk({
    text,
    fileName,
    schemaChunk: reducedSchema,
    fileId,
  });

  console.log("[LLM-B] returnedFieldsCount(sanitized):", extracted.length);
  
  // Log validation summary
  const validationSummary = extracted.reduce((acc, f) => {
    if (f.validation?.validated) {
      acc.validated++;
      if (f.validation.passed) acc.passed++;
      if (f.validation.errors?.length) acc.failed++;
    }
    return acc;
  }, { validated: 0, passed: 0, failed: 0 });
  console.log("[LLM-B] validationSummary:", validationSummary);

  return extracted;
}

/**
 * Used by replace endpoint (kept compatible, now also two-pass)
 */
async function runFieldExtractionForSingleText({ text, fileName, masterFields, fileId }) {
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
    fileId: fileId || null,
  });

  return extracted_fields;
}


module.exports = {
  runFieldExtractionForSingleText,
};
