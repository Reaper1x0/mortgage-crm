export type FileUploadPhase = "queued" | "uploading" | "processing" | "done" | "error";

export type FileUploadProgress = {
  fileName: string;
  phase: FileUploadPhase;
  /** 0–100 from bytes sent / total request body size */
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  error?: string;
};

export type FileUploadProgressCallback = (progress: FileUploadProgress) => void;

export function formatByteCount(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function computeBytePercent(loaded: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((loaded * 100) / total));
}

export function createUploadProgress(
  fileName: string,
  phase: FileUploadPhase,
  loadedBytes: number,
  totalBytes: number,
  error?: string
): FileUploadProgress {
  const percent = phase === "done" ? 100 : phase === "processing" ? 100 : computeBytePercent(loadedBytes, totalBytes);
  return {
    fileName,
    phase,
    percent,
    loadedBytes,
    totalBytes,
    ...(error ? { error } : {}),
  };
}

/** Map XHR / axios upload events to byte-accurate progress. */
export function applyUploadProgressEvent(
  file: File,
  onProgress: FileUploadProgressCallback | undefined,
  event: { loaded: number; total?: number; lengthComputable?: boolean }
) {
  if (!onProgress) return;

  const loaded = Math.max(0, event.loaded || 0);
  const total =
    event.lengthComputable && event.total && event.total > 0
      ? event.total
      : file.size > 0
        ? file.size
        : 0;

  onProgress(createUploadProgress(file.name, "uploading", loaded, total));
}

export function uploadProgressBarPercent(progress: FileUploadProgress): number {
  if (progress.phase === "error") return 0;
  if (progress.phase === "done" || progress.phase === "processing") return 100;
  return Math.min(100, Math.max(0, progress.percent));
}

export function uploadProgressLabel(progress: FileUploadProgress): string {
  const sent = `${formatByteCount(progress.loadedBytes)} / ${formatByteCount(progress.totalBytes)}`;

  if (progress.phase === "error") return progress.error || "Upload failed";
  if (progress.phase === "queued") return `Queued · ${formatByteCount(progress.totalBytes)}`;
  if (progress.phase === "done") return `Complete · ${sent}`;
  if (progress.phase === "processing") return `Processing on server… · ${sent}`;
  return `Uploading… ${progress.percent}% · ${sent}`;
}
