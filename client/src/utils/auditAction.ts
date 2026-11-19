import type { IconType } from "react-icons";
import {
  FiCheck,
  FiDownload,
  FiEdit,
  FiFile,
  FiMessageSquare,
  FiRefreshCw,
  FiUpload,
} from "react-icons/fi";

type AuditActionStyle = {
  label: string;
  color: string;
  Icon: IconType;
};

const AUDIT_ACTIONS: Record<string, AuditActionStyle> = {
  document_uploaded: { label: "Uploaded Document", color: "text-primary", Icon: FiUpload },
  document_replaced: { label: "Replaced Document", color: "text-warning", Icon: FiFile },
  document_deleted: { label: "Deleted Document", color: "text-danger", Icon: FiFile },
  field_extracted: { label: "Extracted Field", color: "text-primary", Icon: FiFile },
  field_edited: { label: "Edited Field", color: "text-warning", Icon: FiEdit },
  field_reviewed: { label: "Reviewed Field", color: "text-success", Icon: FiCheck },
  field_approved: { label: "Approved Field", color: "text-success", Icon: FiCheck },
  master_field_created: { label: "Created Master Field", color: "text-primary", Icon: FiFile },
  master_field_updated: { label: "Updated Master Field", color: "text-warning", Icon: FiEdit },
  master_field_deleted: { label: "Deleted Master Field", color: "text-danger", Icon: FiFile },
  master_fields_seeded: { label: "Seeded Master Fields", color: "text-primary", Icon: FiRefreshCw },
  submission_created: { label: "Created Submission", color: "text-primary", Icon: FiFile },
  submission_updated: { label: "Updated Submission", color: "text-warning", Icon: FiEdit },
  submission_completed: { label: "Completed Submission", color: "text-success", Icon: FiCheck },
  template_created: { label: "Created Template", color: "text-primary", Icon: FiFile },
  template_updated: { label: "Updated Template", color: "text-warning", Icon: FiEdit },
  template_deleted: { label: "Deleted Template", color: "text-danger", Icon: FiFile },
  document_generated: { label: "Generated Document", color: "text-primary", Icon: FiDownload },
  document_downloaded: { label: "Downloaded Document", color: "text-primary", Icon: FiDownload },
  assistant_query: { label: "Asked Assistant", color: "text-primary", Icon: FiMessageSquare },
};

export function getAuditActionInfo(action: string): {
  Icon: IconType;
  label: string;
  color: string;
} {
  const entry = AUDIT_ACTIONS[action];
  if (!entry) {
    return {
      Icon: FiFile,
      label: action.replace(/_/g, " "),
      color: "text-text",
    };
  }

  return {
    Icon: entry.Icon,
    label: entry.label,
    color: entry.color,
  };
}
