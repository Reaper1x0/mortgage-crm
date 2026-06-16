import type { IconType } from "react-icons";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiLayers } from "react-icons/fi";
import type { SubmissionDocument } from "../../types/extraction.types";
import StatusBadge from "../Reusable/StatusBadge";
import {
  fileKindIcon,
  formatBytes,
  getFileId,
  getFileName,
  getFileRef,
} from "../Documents/clientDocumentUtils";
import { prettyDate } from "../../utils/date";
import { cn } from "../../utils/cn";

export type AssistantDocumentListProps = {
  documents: SubmissionDocument[];
  scopeFileId: string | null;
  onSelect: (fileId: string | null) => void;
  indexStatusByFileId: Map<string, { rag_index_status?: string; rag_chunk_count?: number }>;
};

function indexTone(status?: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "indexed") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function ListRow({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
  status,
}: {
  selected: boolean;
  onClick: () => void;
  icon: IconType;
  title: string;
  subtitle: string;
  status?: { label: string; tone: "success" | "warning" | "danger" | "neutral" | "primary"; icon?: IconType };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition rounded-xl",
        selected ? "bg-card-hover" : "hover:bg-card-hover"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-card-border bg-background text-card-text",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{title}</p>
        <p className="truncate text-xs text-card-text">{subtitle}</p>
      </div>
      {status ? (
        <StatusBadge tone={status.tone}>
          {status.icon ? <status.icon className="h-3.5 w-3.5" /> : null}
          {status.label}
        </StatusBadge>
      ) : null}
    </button>
  );
}

export default function AssistantDocumentList({
  documents,
  scopeFileId,
  onSelect,
  indexStatusByFileId,
}: AssistantDocumentListProps) {
  const totalChunks = [...indexStatusByFileId.values()].reduce(
    (sum, d) => sum + (d.rag_chunk_count ?? 0),
    0
  );

  return (
    <div className="bg-card p-2">
      <ListRow
        selected={scopeFileId === null}
        onClick={() => onSelect(null)}
        icon={FiLayers}
        title="All documents"
        subtitle={`${documents.length} file${documents.length !== 1 ? "s" : ""}${totalChunks ? ` · ${totalChunks} chunks` : ""}`}
        status={
          documents.length
            ? { label: scopeFileId === null ? "Active" : "All", tone: "primary" }
            : undefined
        }
      />
      {documents.map((doc) => {
        const fileId = getFileId(doc);
        if (!fileId) return null;
        const file = getFileRef(doc);
        const name = getFileName(doc, file);
        const ext = file?.extension ? String(file.extension).replace(/^\./, "").toUpperCase() : "FILE";
        const uploadedAt = doc.uploadDate || file?.uploaded_at || file?.createdAt;
        const size = formatBytes(file?.size_in_bytes);
        const st = indexStatusByFileId.get(fileId);
        const Icon = fileKindIcon(file?.content_type, file?.extension);

        return (
          <ListRow
            key={fileId}
            selected={scopeFileId === fileId}
            onClick={() => onSelect(fileId)}
            icon={Icon}
            title={name}
            subtitle={[ext, size, uploadedAt ? prettyDate(uploadedAt) : null].filter(Boolean).join(" · ")}
            status={
              st?.rag_index_status
                ? {
                    label: st.rag_index_status,
                    tone: indexTone(st.rag_index_status),
                    icon:
                      st.rag_index_status === "indexed"
                        ? FiCheckCircle
                        : st.rag_index_status === "failed"
                          ? FiAlertTriangle
                          : FiClock,
                  }
                : { label: "pending", tone: "warning", icon: FiClock }
            }
          />
        );
      })}
    </div>
  );
}
