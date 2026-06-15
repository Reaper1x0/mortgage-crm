const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp", ".heic"];

function normalizeName(name = "") {
  return String(name || "").trim().toLowerCase();
}

function detectDocumentType({ mimetype, originalname }) {
  const mime = String(mimetype || "").toLowerCase();
  const name = normalizeName(originalname);

  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (mime === "application/msword" || name.endsWith(".doc")) return "doc";
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    name.endsWith(".xlsx")
  ) {
    return "xlsx";
  }
  if (mime === "text/csv" || name.endsWith(".csv")) return "csv";
  if (mime === "text/plain" || name.endsWith(".txt")) return "txt";
  if (
    mime.startsWith("image/") ||
    IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
  ) {
    return "image";
  }

  return "unknown";
}

function isSubmissionArtifactType(type) {
  return type !== "unknown";
}

module.exports = {
  detectDocumentType,
  isSubmissionArtifactType,
};
