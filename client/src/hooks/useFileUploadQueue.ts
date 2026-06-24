import { useCallback, useMemo, useState } from "react";
import type { FileUploadListItem } from "../components/Reusable/Inputs/FileUploadList";
import {
  createUploadProgress,
  type FileUploadProgress,
  type FileUploadProgressCallback,
} from "../utils/uploadProgress";

function makeFileItemId(file: File, index: number) {
  return `file-${index}-${file.name}-${file.size}-${file.lastModified}`;
}

export type FileUploadTask = (
  file: File,
  onProgress: FileUploadProgressCallback
) => Promise<void>;

export function useFileUploadQueue() {
  const [items, setItems] = useState<FileUploadListItem[]>([]);
  const [progressById, setProgressById] = useState<Record<string, FileUploadProgress>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const setItemProgress = useCallback((id: string, progress: FileUploadProgress) => {
    setProgressById((prev) => ({ ...prev, [id]: progress }));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setItems((prev) => {
      const start = prev.length;
      const next = files.map((file, offset) => ({
        id: makeFileItemId(file, start + offset),
        file,
      }));
      return [...prev, ...next];
    });
    setProgressById({});
  }, []);

  const replaceFiles = useCallback((files: File[]) => {
    setItems(
      files.map((file, index) => ({
        id: makeFileItemId(file, index),
        file,
      }))
    );
    setProgressById({});
  }, []);

  const removeFile = useCallback((id: string) => {
    if (isUploading) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setProgressById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [isUploading]);

  const clear = useCallback(() => {
    if (isUploading) return;
    setItems([]);
    setProgressById({});
    setActiveIndex(-1);
  }, [isUploading]);

  const uploadAll = useCallback(
    async (uploadTask: FileUploadTask) => {
      if (!items.length || isUploading) {
        return { ok: false, completed: 0, failed: [] as { id: string; file: File; error: string }[] };
      }

      setIsUploading(true);
      const failed: { id: string; file: File; error: string }[] = [];
      let completed = 0;

      const queuedProgress = Object.fromEntries(
        items.map((item) => [
          item.id,
          createUploadProgress(item.file.name, "queued", 0, item.file.size),
        ])
      );
      setProgressById(queuedProgress);

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        setActiveIndex(index);
        setItemProgress(
          item.id,
          createUploadProgress(item.file.name, "uploading", 0, item.file.size)
        );

        try {
          await uploadTask(item.file, (progress) => setItemProgress(item.id, progress));
          completed += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed.";
          setItemProgress(
            item.id,
            createUploadProgress(item.file.name, "error", 0, item.file.size, message)
          );
          failed.push({ id: item.id, file: item.file, error: message });
        }
      }

      setActiveIndex(-1);
      setIsUploading(false);

      return {
        ok: failed.length === 0,
        completed,
        failed,
      };
    },
    [isUploading, items, setItemProgress]
  );

  const statusLabel = useMemo(() => {
    if (!isUploading) return null;
    if (activeIndex < 0) return "Uploading…";
    return `Uploading file ${activeIndex + 1} of ${items.length}…`;
  }, [activeIndex, isUploading, items.length]);

  const allDone = useMemo(
    () =>
      items.length > 0 &&
      items.every((item) => progressById[item.id]?.phase === "done"),
    [items, progressById]
  );

  return {
    items,
    progressById,
    isUploading,
    activeIndex,
    statusLabel,
    allDone,
    addFiles,
    replaceFiles,
    removeFile,
    clear,
    uploadAll,
    setItemProgress,
  };
}
