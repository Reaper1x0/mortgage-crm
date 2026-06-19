import type { SubmissionDocument } from "../../types/extraction.types";
import Card from "../Reusable/Card";
import StatusBadge from "../Reusable/StatusBadge";
import Button from "../Reusable/Button";
import IconButton from "../Reusable/IconButton";
import { DocumentUploaderMeta } from "../Reusable/UserActionAvatar";
import { prettyDate } from "../../utils/date";
import { FiExternalLink, FiFileText, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import {
  extractedFieldCount,
  fileKindIcon,
  formatBytes,
  getFileName,
  getFileRef,
  getFileUrl,
} from "./clientDocumentUtils";

export type ClientDocumentCardProps = {
  doc: SubmissionDocument;
  isBusy?: boolean;
  onViewFields?: (docEntryId: string) => void;
  onReplace?: (docEntryId: string) => void;
  onDelete?: (docEntryId: string) => void;
};

export default function ClientDocumentCard({
  doc,
  isBusy = false,
  onViewFields,
  onReplace,
  onDelete,
}: ClientDocumentCardProps) {
  const id = doc._id as string;
  const file = getFileRef(doc);
  const name = getFileName(doc, file);
  const url = getFileUrl(file);
  const fieldCount = extractedFieldCount(doc);
  const uploadedAt = doc.uploadDate || file?.uploaded_at || file?.createdAt;
  const ext = file?.extension ? String(file.extension).replace(/^\./, "").toUpperCase() : "FILE";
  const rawDocType = doc.document_type?.trim() || null;
  const docType = rawDocType && !rawDocType.includes("/") ? rawDocType : null;
  const Icon = fileKindIcon(file?.content_type, file?.extension);

  return (
    <Card containerClassName="h-full">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text" title={name}>
              {name}
            </h3>
            <DocumentUploaderMeta
              uploadedBy={file?.uploaded_by}
              tooltipUploadedAt={file?.uploaded_at}
              uploadDate={doc.uploadDate}
              createdAt={file?.createdAt}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge tone="neutral">{ext}</StatusBadge>
              {docType ? <StatusBadge tone="primary">{docType}</StatusBadge> : null}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-xl border border-card-border bg-background/60 px-3 py-2.5 text-xs">
          <div>
            <dt className="text-card-text">Uploaded</dt>
            <dd className="font-medium text-text">{uploadedAt ? prettyDate(uploadedAt) : "—"}</dd>
          </div>
          <div>
            <dt className="text-card-text">Size</dt>
            <dd className="font-medium text-text">{formatBytes(file?.size_in_bytes)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-card-text">Extracted fields</dt>
            <dd>
              <button
                type="button"
                className="font-semibold text-primary underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow"
                onClick={() => onViewFields?.(id)}
                disabled={isBusy || fieldCount === 0}
              >
                {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                {fieldCount > 0 ? " — View" : ""}
              </button>
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
          {url ? (
            <Button
              variant="primary"
              type="button"
              className="min-w-0 flex-1 sm:flex-none"
              disabled={isBusy}
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
              <span className="inline-flex items-center gap-2">
                <FiExternalLink className="h-4 w-4 shrink-0" />
                Open file
              </span>
            </Button>
          ) : (
            <span className="text-xs text-card-text">Download link unavailable</span>
          )}

          <div className="ml-auto flex items-center gap-1">
            <IconButton
              icon={FiFileText}
              size="sm"
              outline
              fillBg
              hoverable
              title="View extracted fields"
              disabled={isBusy || fieldCount === 0}
              onClick={() => onViewFields?.(id)}
            />
            <IconButton
              icon={FiRefreshCw}
              size="sm"
              outline
              fillBg
              hoverable
              title="Replace document"
              disabled={isBusy}
              onClick={() => onReplace?.(id)}
            />
            <IconButton
              icon={FiTrash2}
              size="sm"
              outline
              fillBg
              hoverable
              title="Delete document"
              disabled={isBusy}
              onClick={() => onDelete?.(id)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
