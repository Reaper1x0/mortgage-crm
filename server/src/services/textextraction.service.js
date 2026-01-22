// src/services/textextraction.service.js

const textract = require("textract");
const { createWorker } = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/**
 * CONFIG
 */
const OCR_LANGS = ["eng"];
const OCR_LANG_STR = OCR_LANGS.join("+");
const PDF_RENDER_DENSITY = 300;
const TMP_DIR = path.join(__dirname, "..", "tmp");

/**
 * PATH SAFETY (Windows) - optional
 */
function ensureBinariesOnPath() {
  if (process.platform !== "win32") return;

  const gmDir = "C:\\Program Files\\GraphicsMagick-1.3.46-Q16";
  const gsDir = "C:\\Program Files\\gs\\gs10.06.0\\bin";

  const p = process.env.PATH || "";
  if (!p.toLowerCase().includes(gmDir.toLowerCase())) {
    process.env.PATH = `${gmDir};${process.env.PATH}`;
  }
  if (!p.toLowerCase().includes(gsDir.toLowerCase())) {
    process.env.PATH = `${gsDir};${process.env.PATH}`;
  }
}
ensureBinariesOnPath();

/**
 * Helpers
 */
function ensureTempDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  return TMP_DIR;
}

function writeTempFile(buffer, ext = "") {
  const dir = ensureTempDir();
  const filepath = path.join(
    dir,
    `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`,
  );
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

function execCmd(bin, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      shell: false,
      windowsHide: true,
      ...opts,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(
        new Error(
          `Command failed (code ${code}): ${bin} ${args.join(" ")}\n${stderr || stdout}`,
        ),
      );
    });
  });
}

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

async function ocrImage(imagePath) {
  const worker = await getOcrWorker();
  const res = await worker.recognize(imagePath);
  return res?.data?.text || "";
}

/**
 * PDF -> Images using GraphicsMagick (exact page render)
 */
async function getPdfPageCount(pdfPath) {
  const gmBin = process.platform === "win32" ? "gm.exe" : "gm";
  const { stdout } = await execCmd(gmBin, [
    "identify",
    "-format",
    "%n\n",
    pdfPath,
  ]);

  const nums = stdout
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (nums.length) return nums[0];

  const out2 = await execCmd(gmBin, ["identify", pdfPath]);
  const lines = out2.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) throw new Error("Could not determine PDF page count.");
  return lines.length;
}

async function renderPdfPagesToImages(buffer) {
  const gmBin = process.platform === "win32" ? "gm.exe" : "gm";
  const dir = ensureTempDir();

  const pdfPath = writeTempFile(buffer, ".pdf");
  const base = `pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let pageCount = await getPdfPageCount(pdfPath);
  console.log("[PDF] getPdfPageCount result:", pageCount, "pdfPath:", pdfPath);

  const imagePaths = [];
  try {
    for (let i = 0; i < pageCount; i++) {
      const outPath = path.join(dir, `${base}.${i + 1}.png`);

      // ✅ FIX: remove -alpha (IM-only), use GM-safe flattening
      await execCmd(gmBin, [
        "convert",
        "-density",
        String(PDF_RENDER_DENSITY),
        "-background",
        "white",
        "-flatten",
        `${pdfPath}[${i}]`,
        outPath,
      ]);
      console.log(
        `[PDF] rendered page ${i + 1}/${pageCount} -> ${outPath} exists=${fs.existsSync(outPath)}`,
      );

      imagePaths.push(outPath);
    }
    console.log("[PDF] total imagePaths:", imagePaths.length);

    return { imagePaths, pdfPath };
  } catch (err) {
    fs.unlink(pdfPath, () => {});
    for (const p of imagePaths) fs.unlink(p, () => {});
    throw err;
  }
}

async function extractFromPdfViaOcr(buffer) {
  const { imagePaths, pdfPath } = await renderPdfPagesToImages(buffer);
  console.log("[extractFromPdfViaOcr] imagePaths:", imagePaths);

  let finalText = "";
  try {
    for (let i = 0; i < imagePaths.length; i++) {
      const text = await ocrImage(imagePaths[i]);
      console.log(
        `[OCR] page=${i + 1} textLen=${(text || "").length} snippet="${(text || "").slice(0, 180).replace(/\s+/g, " ")}"`,
      );

      finalText += `\n\n----- PAGE ${i + 1} -----\n\n${text || ""}`;
    }
    console.log("[OCR] finalTextLen:", finalText.length);
  } finally {
    for (const p of imagePaths) fs.unlink(p, () => {});
    fs.unlink(pdfPath, () => {});
  }

  return finalText.trim();
}

/**
 * Office docs via textract
 */
function extractFromOfficeFile(filePath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, (error, text) => {
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
    path: file.path,
    hasBuffer: !!file.buffer,
  });

  const { mimetype, buffer, path: diskPath } = file;
  const ext = (mimetype || "").toLowerCase();
  const originalLower = (file.originalname || "").toLowerCase();

  try {
    // PDF OCR ONLY
    if (ext === "application/pdf" || originalLower.endsWith(".pdf")) {
      console.log("[extractTextFromFile] Branch: PDF (OCR via images)");

      const pdfBuffer =
        buffer && buffer.length
          ? buffer
          : diskPath
            ? fs.readFileSync(diskPath)
            : null;

      if (!pdfBuffer) throw new Error("PDF buffer not found.");

      console.log("[extractTextFromFile] Rendering PDF pages to images...");
      const text = await extractFromPdfViaOcr(pdfBuffer);

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
      const filepath = diskPath || writeTempFile(buffer, ".docx");
      const text = await extractFromOfficeFile(filepath);
      if (!diskPath) fs.unlink(filepath, () => {});
      return text;
    }

    // IMAGES
    if (
      ext.startsWith("image/") ||
      [".png", ".jpg", ".jpeg"].some((e) => originalLower.endsWith(e))
    ) {
      console.log("[extractTextFromFile] Branch: IMAGE (OCR)");
      const filepath = diskPath || writeTempFile(buffer, ".png");
      const text = await ocrImage(filepath);
      if (!diskPath) fs.unlink(filepath, () => {});
      return text;
    }

    // FALLBACK
    console.log("[extractTextFromFile] Branch: FALLBACK (textract)");
    const filepath = diskPath || writeTempFile(buffer, "");
    const text = await extractFromOfficeFile(filepath);
    if (!diskPath) fs.unlink(filepath, () => {});
    return text;
  } catch (err) {
    console.error("[extractTextFromFile] ERROR:", err?.message);
    console.error(err);
    throw err;
  }
}

module.exports = { extractTextFromFile };
