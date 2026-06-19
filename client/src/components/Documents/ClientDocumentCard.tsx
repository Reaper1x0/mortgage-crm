import type { SubmissionDocument } from "../../types/extraction.types";
import Card from "../Reusable/Card";
import StatusBadge from "../Reusable/StatusBadge";
import IconButton from "../Reusable/IconButton";
import { DocumentUploaderMeta } from "../Reusable/UserActionAvatar";
import { FiFileText, FiRefreshCw, FiTrash2, FiZap } from "react-icons/fi";
import DocumentFileThumbnail from "./DocumentFileThumbnail";
import {
  canExtractDocument,
  canReExtractDocument,
  extractedFieldCount,
  extractionStatusMeta,
  formatBytes,
  getFileName,
  getFileRef,
  resolveExtractionStatus,
  resolveUploadStatus,
} from "./clientDocumentUtils";

export type ClientDocumentCardProps = {
  doc: SubmissionDocument;
  isBusy?: boolean;
  isExtracting?: boolean;
  onExtract?: (docEntryId: string) => void;
  onViewFields?: (docEntryId: string) => void;
  onReplace?: (docEntryId: string) => void;
  onDelete?: (docEntryId: string) => void;
};

export default function ClientDocumentCard({
  doc,
  isBusy = false,
  isExtracting = false,
  onExtract,
  onViewFields,
  onReplace,
  onDelete,
}: ClientDocumentCardProps) {
  const id = doc._id as string;
  const file = getFileRef(doc);
  const name = getFileName(doc, file);
  const fieldCount = extractedFieldCount(doc);
  const ext = file?.extension ? String(file.extension).replace(/^\./, "").toUpperCase() : "FILE";

  const uploadStatus = resolveUploadStatus(doc);
  const extractionStatus = isExtracting ? "extracting" : resolveExtractionStatus(doc);
  const extractionMeta = extractionStatusMeta(extractionStatus);
  const showExtract = canExtractDocument(doc) && !isExtracting;
  const showReExtract = canReExtractDocument(doc) && !isExtracting;
  const cardBusy = isBusy || isExtracting;

  return (
    <Card containerClassName="h-full" className="!p-0 overflow-hidden">
      <div className="flex h-full flex-col">
        <DocumentFileThumbnail
          file={file}
          fileName={name}
          disabled={cardBusy}
          variant="hero"
          formatLabel={ext}
        />

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="min-w-0 space-y-2">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text" title={name}>
              {name}
            </h3>

            <DocumentUploaderMeta
              uploadedBy={file?.uploaded_by}
              tooltipUploadedAt={file?.uploaded_at}
              uploadDate={doc.uploadDate}
              createdAt={file?.createdAt}
            />

            <p className="text-xs text-card-text">{formatBytes(file?.size_in_bytes)}</p>

            <div className="flex flex-wrap items-center gap-1.5">
              {uploadStatus === "uploaded" ? (
                <StatusBadge tone="success">Uploaded</StatusBadge>
              ) : (
                <StatusBadge tone="danger">Upload failed</StatusBadge>
              )}
              <StatusBadge tone={extractionMeta.tone}>{extractionMeta.label}</StatusBadge>
              {fieldCount > 0 ? (
                <StatusBadge tone="neutral">{fieldCount} fields</StatusBadge>
              ) : null}
            </div>

            {doc.extraction_error ? (
              <p className="text-xs text-danger">{doc.extraction_error}</p>
            ) : null}
          </div>

          <div className="mt-auto flex items-center gap-1 border-t border-card-border pt-3">
            {(showExtract || showReExtract) && (
              <IconButton
                icon={FiZap}
                size="sm"
                outline
                fillBg
                hoverable
                title={showReExtract ? "Re-extract fields" : "Extract fields"}
                disabled={cardBusy || uploadStatus !== "uploaded"}
                isLoading={isExtracting}
                onClick={() => onExtract?.(id)}
              />
            )}

            <IconButton
              icon={FiFileText}
              size="sm"
              outline
              fillBg
              hoverable
              title={fieldCount > 0 ? `View ${fieldCount} extracted fields` : "No extracted fields"}
              disabled={cardBusy || fieldCount === 0}
              onClick={() => onViewFields?.(id)}
            />

            <div className="ml-auto flex items-center gap-1">
              <IconButton
                icon={FiRefreshCw}
                size="sm"
                outline
                fillBg
                hoverable
                title="Replace document"
                disabled={cardBusy}
                onClick={() => onReplace?.(id)}
              />
              <IconButton
                icon={FiTrash2}
                size="sm"
                outline
                fillBg
                hoverable
                title="Delete document"
                disabled={cardBusy}
                onClick={() => onDelete?.(id)}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
