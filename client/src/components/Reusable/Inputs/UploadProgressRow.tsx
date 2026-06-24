import { cn } from "../../../utils/cn";
import type { FileUploadProgress } from "../../../utils/uploadProgress";
import {
  uploadProgressBarPercent,
  uploadProgressLabel,
} from "../../../utils/uploadProgress";

export type UploadProgressRowProps = {
  progress: FileUploadProgress;
  className?: string;
};

export default function UploadProgressRow({ progress, className }: UploadProgressRowProps) {
  const percent = uploadProgressBarPercent(progress);
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
            "shrink-0 tabular-nums",
            isError ? "text-danger" : isDone ? "text-success" : "text-card-text"
          )}
        >
          {uploadProgressLabel(progress)}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-card-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Upload progress for ${progress.fileName}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-150 ease-linear",
            isError ? "bg-danger" : isDone ? "bg-success" : "bg-primary"
          )}
          style={{
            width: `${percent}%`,
            minWidth: percent > 0 ? "0.25rem" : undefined,
          }}
        />
      </div>
    </div>
  );
}
