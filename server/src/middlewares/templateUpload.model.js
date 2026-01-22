const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "templates");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ok = file.mimetype === "application/pdf";
  if (!ok) return cb(new Error("Only PDF files are allowed"), false);
  cb(null, true);
}

const uploadTemplatePdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

module.exports = { uploadTemplatePdf, UPLOAD_DIR };
