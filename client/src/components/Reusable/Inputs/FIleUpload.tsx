import React, { useEffect, useRef, useState } from "react";
import { ImCross } from "react-icons/im";
import IconButton from "../IconButton";
import FileUploadZone, { type FileUploadZoneHandle } from "./FileUploadZone";
import { cn } from "../../../utils/cn";

interface FileUploadProps {
  label?: string;
  name: string;
  value?: File | string;
  width?: string;
  height?: string;
  onChange: (file: File | undefined) => void;
  className?: string;
  accept?: string;
  hint?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  name,
  value,
  width = "w-full",
  height = "h-48",
  onChange,
  className = "",
  accept = "*/*",
  hint,
}) => {
  const uploadRef = useRef<FileUploadZoneHandle>(null);
  const [preview, setPreview] = useState<string | null>(typeof value === "string" ? value : null);
  const [fileName, setFileName] = useState<string | null>(
    typeof value === "string" ? value.split("/").pop() || null : value instanceof File ? value.name : null
  );

  useEffect(() => {
    if (typeof value === "string") {
      setPreview(value);
      setFileName(value.split("/").pop() || null);
    } else if (value instanceof File) {
      setFileName(value.name);
    } else if (!value) {
      setPreview(null);
      setFileName(null);
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(file);
    setFileName(file.name);

    if (file.type.startsWith("application/pdf")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setPreview(null);
    setFileName(null);
    onChange(undefined);
    uploadRef.current?.clear();
  };

  if (fileName) {
    return (
      <div className={cn("flex flex-col gap-2 text-text", className)}>
        {label ? <label className="font-medium">{label}</label> : null}
        <div className={cn("relative rounded-2xl border border-card-border bg-card p-4", width, height)}>
          <IconButton
            icon={ImCross}
            className="absolute top-2 right-2 z-10"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFile();
            }}
          />
          {preview ? (
            <iframe src={preview} title="File Preview" className="h-full w-full rounded-lg" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-sm">{fileName}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <FileUploadZone
      ref={uploadRef}
      name={name}
      label={label}
      hint={hint}
      accept={accept}
      className={className}
      zoneClassName={cn(width, height, "min-h-[12rem]")}
      onChange={handleFileChange}
    />
  );
};

export default React.memo(FileUpload);
