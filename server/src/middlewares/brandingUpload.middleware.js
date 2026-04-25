const multer = require("multer");

function fileFilter(_req, file, cb) {
  const ok = file.mimetype && file.mimetype.startsWith("image/");
  if (!ok) return cb(new Error("Only image files are allowed"), false);
  cb(null, true);
}

const uploadBrandingImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadBrandingImage };
