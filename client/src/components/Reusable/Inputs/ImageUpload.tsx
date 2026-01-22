import React, { useRef, useState, useEffect } from "react";
import { ImCross } from "react-icons/im";
import ImageContainer from "../ImageContainer";
import IconButton from "../IconButton";

interface ImageUploadProps {
  label?: string;
  name: string;
  value?: File | string;
  width?: string;
  height?: string;
  onChange: (file: File | undefined) => void;
  className?: string;
  accept?: string;
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(
    typeof value === "string" ? value : null
  );
  useEffect(() => {
    if (typeof value === "string") {
      setPreview(value);
    } else if (!value) {
      setPreview(null);
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRemoveImage();
      onChange(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onChange(undefined); // clears the image in parent
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`flex flex-col gap-2 text-text ${className}`}>
      {label && <label className="font-medium">{label}</label>}
      <div
        className={`relative bg-card border border-dashed border-border p-4 rounded-lg cursor-pointer`}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <>
            <ImageContainer
              src={preview}
              alt="Preview"
              height={height}
              width={width}
            />
            <div className="absolute top-2 right-2">
              <IconButton
                icon={ImCross}
                onClick={(e) => {
                  e.stopPropagation(); // prevent triggering file input
                  handleRemoveImage();
                }}
              />
            </div>
          </>
        ) : (
          <div
            className={`text-text text-center flex flex-col items-center justify-center`}
          >
            <div className="mt-2 text-base font-medium">
              Click to upload image
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

export default React.memo(ImageUpload);