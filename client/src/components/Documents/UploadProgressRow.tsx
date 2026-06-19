import { cn } from "../../utils/cn";
import type { FileUploadProgress } from "../../service/submissionDocumentService";

export type UploadProgressRowProps = {
  progress: FileUploadProgress;
  className?: string;
};

function uploadProgressLabel(progress: FileUploadProgress): string {
  if (progress.phase === "error") return progress.error || "Upload failed";
  if (progress.phase === "processing") return "Preparing document…";
  if (progress.phase === "done") return "Complete";
  return `Uploading… ${progress.percent}%`;
}

function uploadProgressPercent(progress: FileUploadProgress): number | null {
  if (progress.phase === "processing") return null;
  if (progress.phase === "done") return 100;
  if (progress.phase === "error") return 0;
  return progress.percent;
}

export default function UploadProgressRow({ progress, className }: UploadProgressRowProps) {
  const percent = uploadProgressPercent(progress);
  const indeterminate = progress.phase === "processing";
  const isError = progress.phase === "error";
  const isDone = progress.phase === "done";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-text" title={progress.fileName}>
          {progress.fileName}
        </span>
        <span
          className={cn(
            "shrink-0",
            isError ? "text-danger" : isDone ? "text-success" : "text-card-text"
          )}
        >
          {uploadProgressLabel(progress)}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-card-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-label={`Upload progress for ${progress.fileName}`}
      >
        {indeterminate ? (
          <div className="h-full w-full animate-pulse bg-primary/60" />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isError ? "bg-danger" : isDone ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${percent ?? 0}%` }}
          />
        )}
      </div>
    </div>
  );
}
