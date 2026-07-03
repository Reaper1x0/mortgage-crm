import type { IconType } from "react-icons";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiDatabase, FiLayers } from "react-icons/fi";
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
  indexingFileId?: string | null;
  onIndexDocument?: (fileId: string) => void;
};

function indexTone(status?: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "indexed") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function indexLabel(status?: string, chunkCount?: number): string | null {
  if (status === "indexed") {
    return chunkCount ? String(chunkCount) : "✓";
  }
  if (status === "failed") return "!";
  return null;
}

function ListRow({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
  status,
  action,
}: {
  selected: boolean;
  onClick: () => void;
  icon: IconType;
  title: string;
  subtitle: string;
  status?: { label: string; tone: "success" | "warning" | "danger" | "neutral" | "primary"; icon?: IconType };
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 transition rounded-xl",
        selected ? "bg-card-hover" : "hover:bg-card-hover"
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-card-border bg-background text-card-text">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{title}</p>
          <p className="truncate text-xs text-card-text">{subtitle}</p>
        </div>
        {status ? (
          <StatusBadge tone={status.tone} className="shrink-0 px-1.5 py-0.5 text-[10px]">
            {status.icon ? <status.icon className="h-3 w-3" /> : null}
            {status.label}
          </StatusBadge>
        ) : null}
      </button>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function AssistantDocumentList({
  documents,
  scopeFileId,
  onSelect,
  indexStatusByFileId,
  indexingFileId = null,
  onIndexDocument,
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
        const indexStatus = st?.rag_index_status || "pending";
        const Icon = fileKindIcon(file?.content_type, file?.extension);
        const isIndexing = indexingFileId === fileId;

        const label = indexLabel(indexStatus, st?.rag_chunk_count);
        const showStatus = label !== null;

        return (
          <ListRow
            key={fileId}
            selected={scopeFileId === fileId}
            onClick={() => onSelect(fileId)}
            icon={Icon}
            title={name}
            subtitle={[ext, size, uploadedAt ? prettyDate(uploadedAt) : null].filter(Boolean).join(" · ")}
            status={
              showStatus
                ? {
                    label,
                    tone: indexTone(indexStatus),
                    icon:
                      indexStatus === "indexed"
                        ? FiCheckCircle
                        : indexStatus === "failed"
                          ? FiAlertTriangle
                          : FiClock,
                  }
                : undefined
            }
            action={
              onIndexDocument ? (
                <button
                  type="button"
                  title={indexStatus === "indexed" ? "Reindex document" : "Index document"}
                  disabled={isIndexing}
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexDocument(fileId);
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-lg border border-card-border bg-background px-2 py-1 text-[10px] font-medium text-text transition",
                    "hover:border-primary-border hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <span>{indexStatus === "indexed" ? "Reindex" : "Index Now"}</span>
                  {isIndexing ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-card-text border-t-transparent" />
                  ) : (
                    <FiDatabase className="h-3 w-3 text-card-text" />
                  )}
                </button>
              ) : null
            }
          />
        );
      })}
    </div>
  );
}
