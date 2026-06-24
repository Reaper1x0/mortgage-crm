import { FiFileText, FiX } from "react-icons/fi";
import IconButton from "../IconButton";
import UploadProgressRow from "./UploadProgressRow";
import type { FileUploadProgress } from "../../../utils/uploadProgress";
import { cn } from "../../../utils/cn";

export type FileUploadListItem = {
  id: string;
  file: File;
};

export type FileUploadListProps = {
  items: FileUploadListItem[];
  uploadProgress?: Record<string, FileUploadProgress>;
  isUploading?: boolean;
  onRemove?: (id: string) => void;
  className?: string;
};

export default function FileUploadList({
  items,
  uploadProgress = {},
  isUploading = false,
  onRemove,
  className,
}: FileUploadListProps) {
  if (!items.length) return null;

  return (
    <div className={cn("space-y-3 rounded-xl border border-card-border px-3 py-3", className)}>
      {items.map((item) => {
        const progress = uploadProgress[item.id];
        return (
          <div key={item.id} className="space-y-2">
            {progress ? (
              <UploadProgressRow progress={progress} />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FiFileText className="h-4 w-4 shrink-0 text-card-text" />
                  <span className="truncate text-sm text-text">{item.file.name}</span>
                </div>
                {!isUploading && onRemove ? (
                  <IconButton
                    icon={FiX}
                    size="sm"
                    outline={false}
                    fillBg={false}
                    hoverable
                    title="Remove"
                    onClick={() => onRemove(item.id)}
                  />
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
