import type { IconType } from "react-icons";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiDatabase, FiLayers } from "react-icons/fi";
import type { SubmissionDocument } from "../../types/extraction.types";
import StatusBadge from "../Reusable/StatusBadge";
import IconButton from "../Reusable/IconButton";
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

function indexLabel(status?: string, chunkCount?: number): string {
  if (status === "indexed") {
    return chunkCount ? `indexed · ${chunkCount}` : "indexed";
  }
  if (status === "failed") return "index failed";
  if (status === "pending") return "not indexed";
  return status || "not indexed";
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
          <StatusBadge tone={status.tone}>
            {status.icon ? <status.icon className="h-3.5 w-3.5" /> : null}
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

        return (
          <ListRow
            key={fileId}
            selected={scopeFileId === fileId}
            onClick={() => onSelect(fileId)}
            icon={Icon}
            title={name}
            subtitle={[ext, size, uploadedAt ? prettyDate(uploadedAt) : null].filter(Boolean).join(" · ")}
            status={{
              label: indexLabel(indexStatus, st?.rag_chunk_count),
              tone: indexTone(indexStatus),
              icon:
                indexStatus === "indexed"
                  ? FiCheckCircle
                  : indexStatus === "failed"
                    ? FiAlertTriangle
                    : FiClock,
            }}
            action={
              onIndexDocument ? (
                <IconButton
                  icon={FiDatabase}
                  size="sm"
                  outline
                  fillBg
                  hoverable
                  title={indexStatus === "indexed" ? "Reindex document" : "Index document"}
                  disabled={isIndexing}
                  isLoading={isIndexing}
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexDocument(fileId);
                  }}
                />
              ) : null
            }
          />
        );
      })}
    </div>
  );
}
