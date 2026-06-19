// backend/controllers/extractionController.js — CNIC identity extraction only.
// Submission document upload/extract lives in submissionDocument.controller.js

const { extractTextFromFile } = require("../services/textextraction.service");
const { R2XX, R4XX, R5XX } = require("../Responses");
const { catchAsync } = require("../utils");
const SubmissionService = require("../services/submission.service");
const llmService = require("../services/llm/llm.service");
const { billingService } = require("../services");

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

  const result = await llmService.extractJson({
    systemPrompt,
    userPrompt: "Extract legal_name as strict JSON.",
    temperature: 0,
    maxTokens: 512,
  });
  return result?.parsed?.legal_name || null;
}

const ExtractionController = {
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

    const updated = await SubmissionService.updateSubmission(
      submissionId,
      { legal_name: legalName },
      req.workspaceId
    );
    if (!updated) return R4XX(res, 404, "Submission not found.");
    await billingService.trackExtractionUsage({
      organizationId: req.organizationId,
      amount: 1,
    });

    return R2XX(res, "CNIC processed successfully.", 200, {
      legalName,
      rawTextLength: text.length,
      submission: updated,
      needsManualLegalName: false,
    });
  }),
};

module.exports = ExtractionController;
