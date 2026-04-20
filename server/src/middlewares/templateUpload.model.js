const multer = require("multer");

function fileFilter(_req, file, cb) {
  const ok = file.mimetype === "application/pdf";
  if (!ok) return cb(new Error("Only PDF files are allowed"), false);
  cb(null, true);
}

const uploadTemplatePdf = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

module.exports = { uploadTemplatePdf };
