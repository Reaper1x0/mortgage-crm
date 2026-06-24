import { useCallback, useEffect, type ChangeEvent, type ReactNode } from "react";
import Button from "../Button";
import FileUploadZone from "./FileUploadZone";
import { useFileUploadQueue, type FileUploadTask } from "../../../hooks/useFileUploadQueue";
import { cn } from "../../../utils/cn";

export type FileUploaderProps = {
  name: string;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  zoneClassName?: string;
  showUploadButton?: boolean;
  uploadButtonLabel?: string;
  uploadButtonLoadingLabel?: string;
  /** Upload a single file (called once per queued file, in order). */
  uploadFile: FileUploadTask;
  onAllComplete?: () => void;
  onUploadError?: (errors: { fileName: string; error: string }[]) => void;
  onFilesChange?: (files: File[]) => void;
  /** Reset queue when this value changes (e.g. modal open state). */
  resetWhen?: unknown;
  footer?: ReactNode;
  children?: ReactNode;
};

export default function FileUploader({
  name,
  accept,
  multiple = true,
  hint,
  label,
  disabled = false,
  className,
  zoneClassName,
  showUploadButton = true,
  uploadButtonLabel = "Upload",
  uploadButtonLoadingLabel,
  uploadFile,
  onAllComplete,
  onUploadError,
  onFilesChange,
  resetWhen,
  footer,
  children,
}: FileUploaderProps) {
  const queue = useFileUploadQueue();
  const { clear } = queue;

  useEffect(() => {
    clear();
  }, [resetWhen, clear]);

  const runUpload = useCallback(async () => {
    const result = await queue.uploadAll(uploadFile);
    if (result.failed.length) {
      onUploadError?.(
        result.failed.map((entry) => ({
          fileName: entry.file.name,
          error: entry.error,
        }))
      );
      return;
    }
    if (result.ok) {
      onAllComplete?.();
      clear();
    }
  }, [clear, onAllComplete, onUploadError, queue, uploadFile]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      if (!picked.length) return;

      if (multiple) {
        queue.addFiles(picked);
      } else {
        queue.replaceFiles([picked[0]]);
      }
      onFilesChange?.(picked);
    },
    [multiple, onFilesChange, queue]
  );

  const isBusy = disabled || queue.isUploading;
  const canUpload = queue.items.length > 0 && !queue.isUploading;
  const loadingLabel =
    uploadButtonLoadingLabel || queue.statusLabel || "Uploading…";

  return (
    <div className={cn("space-y-4", className)}>
      <FileUploadZone
        name={name}
        label={label}
        hint={hint}
        accept={accept}
        multiple={multiple}
        disabled={isBusy}
        zoneClassName={zoneClassName}
        onChange={handleFileChange}
        fileItems={queue.items}
        uploadProgress={queue.progressById}
        isUploading={queue.isUploading}
        onRemoveFile={queue.removeFile}
      />

      {children}

      {(showUploadButton && queue.items.length > 0) || footer ? (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {footer}
          {showUploadButton && queue.items.length > 0 ? (
            <Button
              variant="primary"
              type="button"
              onClick={() => void runUpload()}
              isLoading={queue.isUploading}
              disabled={!canUpload || isBusy}
            >
              {queue.isUploading ? loadingLabel : uploadButtonLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type { FileUploadTask } from "../../../hooks/useFileUploadQueue";
export type { FileUploadProgressCallback } from "../../../utils/uploadProgress";
