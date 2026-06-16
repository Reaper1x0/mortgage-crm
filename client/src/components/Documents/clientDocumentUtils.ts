import { FiFile, FiFileText, FiImage } from "react-icons/fi";
import type { IconType } from "react-icons";
import type { FileRef, SubmissionDocument } from "../../types/extraction.types";
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
