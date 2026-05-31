import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import uploadIcon from "../../../assets/upload.png";
import { cn } from "../../../utils/cn";

export type FileUploadZoneHandle = {
  open: () => void;
  clear: () => void;
};

export type FileUploadZoneProps = {
  name: string;
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  zoneClassName?: string;
  /** Shown below the drop zone when a file is already chosen */
  selectedFileName?: string | null;
  selectedFileNames?: string[];
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFilesSelected?: (files: File[]) => void;
  /** Renders only the hidden input (use ref.open() from a custom trigger) */
  hideDefaultZone?: boolean;
  children?: ReactNode;
};

const FileUploadZone = forwardRef<FileUploadZoneHandle, FileUploadZoneProps>(function FileUploadZone(
  {
    name,
    label,
    hint,
    accept,
    multiple = false,
    disabled = false,
    className,
    zoneClassName,
    selectedFileName,
    selectedFileNames,
    onChange,
    onFilesSelected,
    hideDefaultZone = false,
    children,
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const clearInput = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useImperativeHandle(ref, () => ({ open: openPicker, clear: clearInput }), [openPicker, clearInput]);

  const applyFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || !inputRef.current) return;
      const dt = new DataTransfer();
      Array.from(fileList).forEach((file) => dt.items.add(file));
      inputRef.current.files = dt.files;
      inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    },
    []
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    if (onFilesSelected && e.target.files?.length) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    applyFiles(e.dataTransfer.files);
  };

  const displayNames =
    selectedFileNames && selectedFileNames.length > 0
      ? selectedFileNames
      : selectedFileName
        ? [selectedFileName]
        : [];

  const defaultHint = multiple
    ? "PDF, DOCX, or images — select multiple files"
    : "Click to browse or drag and drop a file here";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wide text-text">
          {label}
        </label>
      ) : null}

      {!hideDefaultZone ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={label || "Upload file"}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onClick={openPicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
            "border-card-border bg-background hover:border-primary-border hover:bg-card/50",
            isDragging && "border-primary-border bg-primary/5 ring-2 ring-primary-shadow",
            disabled && "cursor-not-allowed opacity-60 hover:border-card-border hover:bg-background",
            zoneClassName
          )}
        >
          <img
            src={uploadIcon}
            alt=""
            aria-hidden
            className="h-14 w-14 object-contain transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16"
          />
          <p className="mt-4 text-sm font-semibold text-text">Upload your file</p>
          <p className="mt-1 max-w-sm text-xs text-card-text">{hint ?? defaultHint}</p>
        </div>
      ) : null}

      {children}

      {displayNames.length > 0 ? (
        <ul className="space-y-1 rounded-xl border border-card-border bg-card px-3 py-2">
          {displayNames.map((fileName) => (
            <li key={fileName} className="truncate text-sm text-card-text">
              <span className="font-medium text-text">{fileName}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        className="sr-only"
      />
    </div>
  );
});

export default FileUploadZone;
