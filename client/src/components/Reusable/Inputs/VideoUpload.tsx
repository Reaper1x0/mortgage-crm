import React, { useRef, useState } from "react";
import VideoPreview from "../VideoPreview";

const sizeStyles = {
  lg: {
    container: "max-w-4xl max-h-[500px] p-6",
    previewText: "text-base mb-3",
    buttonSpacing: "mt-6",
    progressBar: "h-4 mt-5",
    lottie: "h-60",
    font: "text-base",
  },
  md: {
    container: "max-w-3xl max-h-[400px] p-5",
    previewText: "text-sm mb-2",
    buttonSpacing: "mt-5",
    progressBar: "h-3.5 mt-4",
    lottie: "h-52",
    font: "text-sm",
  },
  sm: {
    container: "max-w-2xl max-h-[300px] p-4",
    previewText: "text-xs mb-1",
    buttonSpacing: "mt-4",
    progressBar: "h-3 mt-3",
    lottie: "h-44",
    font: "text-xs",
  },
};
type VideoUploadProps = {
  className?: string;
  size?: "lg" | "md" | "sm";
  onFileSelect?: (file: File, url: string) => void;
};

const VideoUpload = ({
  className = "",
  size = "md",
  onFileSelect,
}: VideoUploadProps) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styles = sizeStyles[size];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoURL(url);
      onFileSelect?.(file, url);
    }
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoURL(null);
    onFileSelect?.(null as any, "");
  };

  return (
    <>
      {videoFile && videoURL ? (
        <VideoPreview videoURL={videoURL} onClear={clearVideo} size={size} />
      ) : (
        <div
          className={`w-full bg-card rounded-lg border border-border relative ${styles.container} ${className}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`text-text text-center flex flex-col items-center justify-center cursor-pointer ${styles.font}`}
          >
            <div className="mt-2 font-medium">Click to upload video</div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoUpload;
