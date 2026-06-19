import type { FileRef } from "../../types/extraction.types";
import { resolveFileUrl } from "./fileUrl";

export type DocumentFormatKind =
  | "pdf"
  | "docx"
  | "doc"
  | "xlsx"
  | "csv"
  | "txt"
  | "image"
  | "unknown";

export function detectDocumentFormat(
  contentType?: string | null,
  extension?: string | null
): DocumentFormatKind {
  const mime = (contentType || "").toLowerCase();
  const ext = (extension || "").toLowerCase().replace(/^\./, "");

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return "docx";
  }
  if (mime === "application/msword" || ext === "doc") return "doc";
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ext === "xlsx"
  ) {
    return "xlsx";
  }
  if (mime === "text/csv" || ext === "csv") return "csv";
  if (mime === "text/plain" || ext === "txt") return "txt";
  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "tif", "tiff", "heic"].includes(ext)
  ) {
    return "image";
  }
  return "unknown";
}

export function getDocumentThumbnailUrl(
  file: FileRef | null,
  _fileName: string
): string | null {
  if (!file) return null;

  const meta = file.meta as { thumbnail_url?: string; thumbnail_kind?: string } | undefined;
  const signedThumb = resolveFileUrl(meta?.thumbnail_url || null);
  if (signedThumb) return signedThumb;

  const format = detectDocumentFormat(file.content_type, file.extension);
  if (format === "image") {
    return resolveFileUrl(file.url || null);
  }

  return null;
}

export function getDocumentOpenUrl(file: FileRef | null): string | null {
  if (!file) return null;
  return resolveFileUrl(file.url || null);
}
