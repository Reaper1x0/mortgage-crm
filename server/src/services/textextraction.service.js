// src/services/textextraction.service.js

const textract = require("textract");
const { createWorker } = require("tesseract.js");
const pdfParse = require("pdf-parse");
const { fromBuffer } = require("pdf2pic");

/**
 * CONFIG
 */
const OCR_LANGS = ["eng"];
const OCR_LANG_STR = OCR_LANGS.join("+");
const PDF_RENDER_DENSITY = 300;

/**
 * Tesseract Worker (singleton) - v6 safe
 */
let _workerPromise = null;
let _worker = null;

async function buildWorker() {
  let worker;
  try {
    worker = await createWorker(OCR_LANGS);
  } catch (_) {
    worker = await createWorker(OCR_LANG_STR);
  }

  if (typeof worker.loadLanguage === "function")
    await worker.loadLanguage(OCR_LANGS);
  if (typeof worker.initialize === "function")
    await worker.initialize(OCR_LANGS);

  return worker;
}

async function getOcrWorker() {
  if (_workerPromise) return _workerPromise;

  _workerPromise = (async () => {
    const w = await buildWorker();
    _worker = w;
    return w;
  })();

  return _workerPromise;
}

async function terminateOcrWorker() {
  try {
    if (_worker && typeof _worker.terminate === "function")
      await _worker.terminate();
  } catch (_) {
  } finally {
    _worker = null;
    _workerPromise = null;
  }
}

process.on("SIGINT", async () => {
  await terminateOcrWorker();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await terminateOcrWorker();
  process.exit(0);
});
process.on("exit", () => {
  if (_worker && typeof _worker.terminate === "function") {
    _worker.terminate().catch(() => {});
  }
});

async function ocrImageBuffer(imageBuffer) {
  const worker = await getOcrWorker();
  const res = await worker.recognize(imageBuffer);
  return res?.data?.text || "";
}

/**
 * PDF text extraction (native text layer)
 */
async function extractPdfTextLayer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return {
      text: (data?.text || "").trim(),
      pages: Number(data?.numpages || 0),
    };
  } catch (err) {
    console.warn("[PDF] Native text extraction failed, will fallback to OCR:", err?.message);
    return { text: "", pages: 0 };
  }
}

/**
 * PDF OCR fallback using in-memory conversion
 */
async function extractFromPdfViaOcr(buffer, pageCountHint = 0) {
  const targetPages = pageCountHint > 0 ? pageCountHint : 1;
  const convert = fromBuffer(buffer, {
    density: PDF_RENDER_DENSITY,
    format: "png",
    width: 2200,
    height: 3100,
    preserveAspectRatio: true,
  });

  let finalText = "";
  for (let i = 1; i <= targetPages; i++) {
    const rendered = await convert(i, { responseType: "base64" });
    const base64 = rendered?.base64 || "";
    if (!base64) continue;
    const imageBuffer = Buffer.from(base64, "base64");
    const text = await ocrImageBuffer(imageBuffer);

    finalText += `\n\n----- PAGE ${i} -----\n\n${text || ""}`;
  }
  console.log("[OCR] finalTextLen:", finalText.length);
  return finalText.trim();
}

/**
 * Office docs via textract
 */
function extractFromOfficeBuffer(buffer, mimeType = "application/octet-stream") {
  return new Promise((resolve, reject) => {
    textract.fromBufferWithMime(mimeType, buffer, (error, text) => {
      if (error) return reject(error);
      resolve(text || "");
    });
  });
}

/**
 * MAIN
 */
async function extractTextFromFile(file) {
  console.log("=== [extractTextFromFile] START ===");
  console.log("Incoming file:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    hasBuffer: !!file.buffer,
  });

  const { mimetype, buffer } = file;
  const ext = (mimetype || "").toLowerCase();
  const originalLower = (file.originalname || "").toLowerCase();
  const fileBuffer = buffer && Buffer.isBuffer(buffer) ? buffer : null;

  if (!fileBuffer) {
    throw new Error("extractTextFromFile requires an in-memory buffer.");
  }

  try {
    // PDF OCR ONLY
    if (ext === "application/pdf" || originalLower.endsWith(".pdf")) {
      console.log("[extractTextFromFile] Branch: PDF (OCR via images)");

      const textLayer = await extractPdfTextLayer(fileBuffer);
      if (textLayer.text && textLayer.text.length > 20) {
        return textLayer.text;
      }

      console.log("[extractTextFromFile] PDF had little/no text layer, running OCR fallback...");
      const text = await extractFromPdfViaOcr(fileBuffer, textLayer.pages);

      console.log("[extractTextFromFile] PDF OCR text length:", text?.length);
      console.log("[extractTextFromFile] PDF OCR text:", text);
      console.log("=== [extractTextFromFile] END (PDF OCR) ===");
      return text;
    }

    // OFFICE
    if (
      ext ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "application/msword" ||
      originalLower.endsWith(".doc") ||
      originalLower.endsWith(".docx")
    ) {
      console.log("[extractTextFromFile] Branch: OFFICE DOC");
      const text = await extractFromOfficeBuffer(fileBuffer, mimetype || "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      return text;
    }

    // IMAGES
    if (
      ext.startsWith("image/") ||
      [".png", ".jpg", ".jpeg"].some((e) => originalLower.endsWith(e))
    ) {
      console.log("[extractTextFromFile] Branch: IMAGE (OCR)");
      const text = await ocrImageBuffer(fileBuffer);
      return text;
    }

    // FALLBACK
    console.log("[extractTextFromFile] Branch: FALLBACK (textract)");
    const text = await extractFromOfficeBuffer(fileBuffer, mimetype || "application/octet-stream");
    return text;
  } catch (err) {
    console.error("[extractTextFromFile] ERROR:", err?.message);
    console.error(err);
    throw err;
  }
}

module.exports = { extractTextFromFile };
