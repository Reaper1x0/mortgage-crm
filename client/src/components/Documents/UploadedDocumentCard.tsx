import type { SubmissionDocument } from "../../types/extraction.types";
import { FiFileText, FiRefreshCw, FiTrash2, FiZap } from "react-icons/fi";
import ClientDocumentCard, { type DocumentCardFooterAction } from "./ClientDocumentCard";
import {
  canExtractDocument,
  canReExtractDocument,
  extractedFieldCount,
  extractionStatusMeta,
  getFileName,
  getFileRef,
  resolveExtractionStatus,
  resolveUploadStatus,
} from "./clientDocumentUtils";
import { useBillingAccessOptional } from "../../context/BillingAccessContext";
import { BILLING_TOOLTIPS } from "../../utils/billingUi";

export type UploadedDocumentCardProps = {
  doc: SubmissionDocument;
  isBusy?: boolean;
  isExtracting?: boolean;
  onExtract?: (docEntryId: string) => void;
  onViewFields?: (docEntryId: string) => void;
  onReplace?: (docEntryId: string) => void;
  onDelete?: (docEntryId: string) => void;
};

export default function UploadedDocumentCard({
  doc,
  isBusy = false,
  isExtracting = false,
  onExtract,
  onViewFields,
  onReplace,
  onDelete,
}: UploadedDocumentCardProps) {
  const billing = useBillingAccessOptional();
  const billingBlocked = Boolean(billing?.isPaidBlocked);
  const extractBillingTooltip = billing?.paidActionTooltip(BILLING_TOOLTIPS.extract);
  const uploadBillingTooltip = billing?.paidActionTooltip(BILLING_TOOLTIPS.upload);

  const id = doc._id as string;
  const file = getFileRef(doc);
  const name = getFileName(doc, file);
  const fieldCount = extractedFieldCount(doc);

  const uploadStatus = resolveUploadStatus(doc);
  const extractionStatus = isExtracting ? "extracting" : resolveExtractionStatus(doc);
  const extractionMeta = extractionStatusMeta(extractionStatus);
  const showExtract = canExtractDocument(doc) && !isExtracting;
  const showReExtract = canReExtractDocument(doc) && !isExtracting;
  const cardBusy = isBusy || isExtracting;

  const badges = [
    uploadStatus === "uploaded"
      ? { label: "Uploaded", tone: "success" as const }
      : { label: "Upload failed", tone: "danger" as const },
    { label: extractionMeta.label, tone: extractionMeta.tone },
    ...(fieldCount > 0 ? [{ label: `${fieldCount} fields`, tone: "neutral" as const }] : []),
  ];

  const footerStartActions: DocumentCardFooterAction[] = [];
  if (showExtract || showReExtract) {
    footerStartActions.push({
      key: "extract",
      icon: FiZap,
      title: showReExtract ? "Re-extract fields" : "Extract fields",
      disabled: cardBusy || uploadStatus !== "uploaded" || billingBlocked,
      disabledTooltip: billingBlocked ? extractBillingTooltip : undefined,
      isLoading: isExtracting,
      onClick: () => onExtract?.(id),
    });
  }
  footerStartActions.push({
    key: "view-fields",
    icon: FiFileText,
    title: fieldCount > 0 ? `View ${fieldCount} extracted fields` : "No extracted fields",
    disabled: cardBusy || fieldCount === 0,
    onClick: () => onViewFields?.(id),
  });

  return (
    <ClientDocumentCard
      file={file}
      fileName={name}
      badges={badges}
      actor={{
        user: file?.uploaded_by,
        verb: "uploaded by",
        timestamp: file?.uploaded_at || doc.uploadDate || file?.createdAt,
      }}
      errorMessage={doc.extraction_error}
      disabled={cardBusy}
      footerStartActions={footerStartActions}
      footerEndActions={[
        {
          key: "replace",
          icon: FiRefreshCw,
          title: "Replace document",
          disabled: cardBusy || billingBlocked,
          disabledTooltip: billingBlocked ? uploadBillingTooltip : undefined,
          onClick: () => onReplace?.(id),
        },
        {
          key: "delete",
          icon: FiTrash2,
          title: "Delete document",
          disabled: cardBusy,
          onClick: () => onDelete?.(id),
        },
      ]}
    />
  );
}
