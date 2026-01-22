import React, { useRef, useState, useEffect } from "react";
import { ImCross } from "react-icons/im";
import IconButton from "../IconButton";

interface FileUploadProps {
  label?: string;
  name: string;
  value?: File | string;
  width?: string;
  height?: string;
  onChange: (file: File | undefined) => void;
  className?: string;
  accept?: string; // e.g., 'application/pdf,application/zip'
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(
    typeof value === "string" ? value : null
  );
  const [fileName, setFileName] = useState<string | null>(
    typeof value === "string" ? value.split("/").pop() || null : null
  );

  useEffect(() => {
    if (typeof value === "string") {
      setPreview(value);
      setFileName(value.split("/").pop() || null);
    } else if (!value) {
      setPreview(null);
      setFileName(null);
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRemoveFile();
      onChange(file);
      setFileName(file.name);

      if (file.type.startsWith("application/pdf")) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null); // No preview for unsupported types
      }
    }
  };

  const handleRemoveFile = () => {
    setPreview(null);
    setFileName(null);
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`flex flex-col gap-2 text-text ${className}`}>
      {label && <label className="font-medium">{label}</label>}
      <div
        className={`relative bg-card border border-dashed border-border rounded-lg p-4 cursor-pointer ${width} ${height} flex items-center justify-center`}
        onClick={() => fileInputRef.current?.click()}
      >
        {fileName ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <IconButton
              icon={ImCross}
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
            />
            {preview ? (
              <iframe
                src={preview}
                title="File Preview"
                className="w-full h-full rounded"
              />
            ) : (
              <div className="text-sm truncate text-center px-2">{fileName}</div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="mt-2 text-base font-medium">
              Click to upload file
            </div>
          </div>
        )}
      </div>
      <input
        type="file"
        name={name}
        accept={accept}
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default React.memo(FileUpload);