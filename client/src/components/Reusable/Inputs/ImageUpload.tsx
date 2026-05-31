import React, { useEffect, useRef, useState } from "react";
import { ImCross } from "react-icons/im";
import IconButton from "../IconButton";
import FileUploadZone, { type FileUploadZoneHandle } from "./FileUploadZone";
import { cn } from "../../../utils/cn";

interface ImageUploadProps {
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

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  name,
  value,
  width = "w-full",
  height = "h-full",
  onChange,
  className = "",
  accept = "image/*",
  hint = "PNG, JPG, or WebP",
}) => {
  const uploadRef = useRef<FileUploadZoneHandle>(null);
  const [preview, setPreview] = useState<string | null>(typeof value === "string" ? value : null);

  useEffect(() => {
    if (typeof value === "string") {
      setPreview(value);
    } else if (!value) {
      setPreview(null);
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onChange(undefined);
    uploadRef.current?.clear();
  };

  if (preview) {
    return (
      <div className={cn("flex flex-col gap-2 text-text", className)}>
        {label ? <label className="font-medium">{label}</label> : null}
        <div className="relative cursor-default rounded-2xl border border-card-border bg-card p-4">
          <img src={preview} alt="Preview" className={cn(width, height, "mx-auto max-h-48 object-contain rounded-lg")} />
          <div className="absolute top-2 right-2">
            <IconButton
              icon={ImCross}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
            />
          </div>
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
      zoneClassName={cn("min-h-[10rem]", height)}
      onChange={handleFileChange}
    />
  );
};

export default React.memo(ImageUpload);
