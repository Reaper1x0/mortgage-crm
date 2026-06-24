import { FiFile, FiFileText, FiImage } from "react-icons/fi";
import type { IconType } from "react-icons";
import type { FileRef, GeneratedDocument, SubmissionDocument } from "../../types/extraction.types";
import type { StatusBadgeTone } from "../Reusable/StatusBadge";
import { resolveFileUrl } from "../../utils/fileUrl";

export const formatBytes = (bytes?: number | null): string => {
  if (bytes == null || bytes < 0 || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${u === 0 ? Math.round(v) : v.toFixed(v >= 10 || u === 0 ? 0 : 1)} ${units[u]}`;
};

export const getFileId = (doc: SubmissionDocument): string | null => {
  const d = doc.document;
  if (!d) return null;
  if (typeof d === "string") return d;
  return d._id ? String(d._id) : null;
};

export const getFileRef = (doc: SubmissionDocument): FileRef | null => {
  const d = doc.document;
  if (!d || typeof d === "string") return null;
  return d;
};

export const getFileName = (doc: SubmissionDocument, file?: FileRef | null): string => {
  const ref = file ?? getFileRef(doc);
  return (
    doc.document_name?.trim() ||
    ref?.display_name ||
    ref?.original_name ||
    "Untitled document"
  );
};

export const getFileUrl = (fileRef: FileRef | null): string | null => {
  if (!fileRef) return null;
  return resolveFileUrl(fileRef.url || null);
};

export const fileKindIcon = (contentType?: string | null, ext?: string | null): IconType => {
  const ct = (contentType || "").toLowerCase();
  const e = (ext || "").toLowerCase().replace(/^\./, "");
  if (ct.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "tif", "tiff", "heic"].includes(e)) {
    return FiImage;
  }
  if (ct.includes("pdf") || e === "pdf") return FiFileText;
  return FiFile;
};

export const extractedFieldCount = (doc: SubmissionDocument): number => {
  const list = doc.extracted_fields;
  if (!Array.isArray(list) || list.length === 0) return 0;
  const withPresent = list.filter((f) => f.present);
  return withPresent.length > 0 ? withPresent.length : list.length;
};

export const sortDocumentsNewestFirst = (documents: SubmissionDocument[]): SubmissionDocument[] => {
  const arr = Array.isArray(documents) ? [...documents] : [];
  return arr.sort((a, b) => {
    const da = a?.uploadDate ? new Date(a.uploadDate).getTime() : 0;
    const db = b?.uploadDate ? new Date(b.uploadDate).getTime() : 0;
    return db - da;
  });
};

export type DocumentExtractionStatus = "pending" | "extracting" | "extracted" | "extract_failed";
export type DocumentUploadStatus = "uploaded" | "upload_failed";

export const resolveUploadStatus = (doc: SubmissionDocument): DocumentUploadStatus => {
  if (doc.upload_status === "upload_failed") return "upload_failed";
  return "uploaded";
};

export const resolveExtractionStatus = (doc: SubmissionDocument): DocumentExtractionStatus => {
  if (doc.extraction_status) return doc.extraction_status;
  return extractedFieldCount(doc) > 0 ? "extracted" : "pending";
};

export const extractionStatusMeta = (
  status: DocumentExtractionStatus
): { label: string; tone: StatusBadgeTone } => {
  switch (status) {
    case "extracted":
      return { label: "Extracted", tone: "success" };
    case "extracting":
      return { label: "Extracting…", tone: "warning" };
    case "extract_failed":
      return { label: "Extract failed", tone: "danger" };
    default:
      return { label: "Ready to extract", tone: "info" };
  }
};

export const canExtractDocument = (doc: SubmissionDocument): boolean => {
  if (resolveUploadStatus(doc) !== "uploaded") return false;
  const status = resolveExtractionStatus(doc);
  return status === "pending" || status === "extract_failed";
};

export const canReExtractDocument = (doc: SubmissionDocument): boolean => {
  if (resolveUploadStatus(doc) !== "uploaded") return false;
  return resolveExtractionStatus(doc) === "extracted";
};

export const getGeneratedFileRef = (doc: GeneratedDocument): FileRef | null => {
  const file = doc.file_id;
  if (!file || typeof file === "string") return null;
  return file;
};

export const getGeneratedFileName = (doc: GeneratedDocument, file?: FileRef | null): string => {
  const ref = file ?? getGeneratedFileRef(doc);
  return (
    ref?.display_name?.trim() ||
    ref?.original_name?.trim() ||
    (doc.template_name ? `Generated_${doc.template_name}.pdf` : "Generated document")
  );
};

export const sortGeneratedDocumentsNewestFirst = (
  documents: GeneratedDocument[]
): GeneratedDocument[] => {
  const arr = Array.isArray(documents) ? [...documents] : [];
  return arr.sort((a, b) => {
    const da = a?.generated_at ? new Date(a.generated_at).getTime() : 0;
    const db = b?.generated_at ? new Date(b.generated_at).getTime() : 0;
    return db - da;
  });
};
