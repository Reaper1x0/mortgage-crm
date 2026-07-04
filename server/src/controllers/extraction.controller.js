// backend/controllers/extractionController.js — CNIC identity extraction only.
// Submission document upload/extract lives in submissionDocument.controller.js

const { R2XX, R4XX, R5XX } = require("../Responses");
const { catchAsync } = require("../utils");
const SubmissionService = require("../services/submission.service");
const submissionDocumentService = require("../services/submissionDocument.service");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");

const ExtractionController = {
  handleCnicUpload: catchAsync(async (req, res) => {
    const file = req.file;
    const submissionId = req.params.id || req.body.submissionId;

    if (!submissionId) return R4XX(res, 400, "Submission id is required.");
    if (!file) return R4XX(res, 400, "Identity document file is required.");

    try {
      const result = await submissionDocumentService.uploadOrReplaceIdentityDocument({
        submissionId,
        file,
        userId: req.user,
        workspaceId: req.workspaceId,
        organizationId: req.organizationId,
      });

      const identitySubmission = await SubmissionService.getSubmissionIdentity(
        submissionId,
        req.workspaceId
      );
      if (!identitySubmission) return R4XX(res, 404, "Submission not found.");
      const signedIdentity = await attachSignedUrlsDeep(identitySubmission);

      const identityPayload = {
        submissionId: signedIdentity._id,
        legal_name: signedIdentity.legal_name ?? null,
        identity_document: signedIdentity.identity_document ?? null,
      };

      const extractionMeta = {
        nameConfidence: result.nameConfidence ?? null,
        documentAuthenticity: result.documentAuthenticity ?? null,
        authenticityNote: result.authenticityNote ?? null,
        documentTypeDetected: result.documentTypeDetected ?? null,
      };

      if (!result.legalName) {
        console.log(
          `[CNIC] API response: legal name missing for submission ${submissionId} — ` +
            `status=${result.extractionStatus}, reason=${result.failureReason || result.extractionError || "unknown"}, ` +
            `ocr_chars=${result.rawTextLength}`
        );
        return R2XX(
          res,
          result.extractionError ||
            "ID uploaded, but legal name could not be detected. Try a clearer image or enter manually.",
          200,
          {
            legalName: null,
            rawTextLength: result.rawTextLength,
            ...identityPayload,
            ...extractionMeta,
            needsManualLegalName: true,
            extractionStatus: result.extractionStatus,
          }
        );
      }

      const successMessage =
        result.documentAuthenticity === "likely_template_or_sample"
          ? "Legal name extracted. Document may be a template or sample — verify authenticity separately."
          : "Identity document processed successfully.";

      return R2XX(res, successMessage, 200, {
        legalName: result.legalName,
        rawTextLength: result.rawTextLength,
        ...identityPayload,
        ...extractionMeta,
        needsManualLegalName: false,
        extractionStatus: result.extractionStatus,
      });
    } catch (err) {
      if (err?.statusCode === 404) return R4XX(res, 404, err.message);
      if (err?.statusCode === 400) return R4XX(res, 400, err.message);
      console.error("CNIC identity upload failed:", err);
      return R5XX(res, { details: "Failed to process identification document." });
    }
  }),
};

module.exports = ExtractionController;
