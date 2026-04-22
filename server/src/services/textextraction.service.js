const {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} = require("@aws-sdk/client-textract");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const { envConfig } = require("../config");

const POLL_INTERVAL_MS = Number(process.env.TEXTRACT_POLL_INTERVAL_MS || 2000);
const MAX_POLLS = Number(process.env.TEXTRACT_MAX_POLLS || 120);

const textractClient = new TextractClient({
  region: envConfig.AWS_REGION,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractLinesFromBlocks(blocks = []) {
  return blocks
    .filter((b) => b?.BlockType === "LINE" && b?.Text)
    .map((b) => b.Text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function extractTextFromTextractBytes(buffer) {
  const command = new DetectDocumentTextCommand({
    Document: { Bytes: buffer },
  });
  const response = await textractClient.send(command);
  return extractLinesFromBlocks(response?.Blocks || []);
}

async function extractTextFromTextractS3(storagePath) {
  const start = await textractClient.send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: envConfig.S3_BUCKET_NAME,
          Name: storagePath,
        },
      },
    })
  );

  const jobId = start?.JobId;
  if (!jobId) {
    throw new Error("Textract job did not return JobId");
  }

  let pollCount = 0;
  while (pollCount < MAX_POLLS) {
    pollCount += 1;
    const jobResult = await textractClient.send(
      new GetDocumentTextDetectionCommand({
        JobId: jobId,
      })
    );

    const status = jobResult?.JobStatus;
    if (status === "SUCCEEDED") {
      const allBlocks = [...(jobResult?.Blocks || [])];
      let nextToken = jobResult?.NextToken;

      while (nextToken) {
        const nextPage = await textractClient.send(
          new GetDocumentTextDetectionCommand({
            JobId: jobId,
            NextToken: nextToken,
          })
        );
        allBlocks.push(...(nextPage?.Blocks || []));
        nextToken = nextPage?.NextToken;
      }

      return extractLinesFromBlocks(allBlocks);
    }

    if (status === "FAILED") {
      throw new Error("Textract async job failed");
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Textract async job timed out");
}

async function extractPdfTextLayer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return (data?.text || "").trim();
  } catch (_) {
    return "";
  }
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return (result?.value || "").trim();
}

async function extractTextFromFile(file, options = {}) {
  const { storagePath = null } = options;
  const { mimetype, buffer } = file || {};
  const mime = String(mimetype || "").toLowerCase();
  const originalLower = String(file?.originalname || "").toLowerCase();
  const fileBuffer = buffer && Buffer.isBuffer(buffer) ? buffer : null;

  if (!fileBuffer) {
    throw new Error("extractTextFromFile requires an in-memory buffer.");
  }

  const isPdf = mime === "application/pdf" || originalLower.endsWith(".pdf");
  const isDocx =
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalLower.endsWith(".docx");
  const isLegacyDoc = mime === "application/msword" || originalLower.endsWith(".doc");
  const isImage =
    mime.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".tiff", ".tif"].some((ext) =>
      originalLower.endsWith(ext)
    );

  if (isPdf) {
    const textLayerText = await extractPdfTextLayer(fileBuffer);
    if (textLayerText.length > 20) return textLayerText;

    if (storagePath) {
      return extractTextFromTextractS3(storagePath);
    }

    return extractTextFromTextractBytes(fileBuffer);
  }

  if (isImage) {
    return extractTextFromTextractBytes(fileBuffer);
  }

  if (isDocx) {
    return extractDocxText(fileBuffer);
  }

  if (isLegacyDoc) {
    throw new Error(
      "Legacy .doc extraction is not supported in the new OCR pipeline. Please upload PDF, DOCX, or image files."
    );
  }

  throw new Error(
    "Unsupported file type for extraction. Please upload PDF, DOCX, or image files."
  );
}

module.exports = { extractTextFromFile };
