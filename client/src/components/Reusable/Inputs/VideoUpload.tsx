import { useRef, useState, type ChangeEvent } from "react";
import VideoPreview from "../VideoPreview";
import FileUploadZone, { type FileUploadZoneHandle } from "./FileUploadZone";
import { cn } from "../../../utils/cn";

const sizeStyles = {
  lg: {
    container: "max-w-4xl max-h-[500px] p-6 min-h-[16rem]",
    font: "text-base",
  },
  md: {
    container: "max-w-3xl max-h-[400px] p-5 min-h-[14rem]",
    font: "text-sm",
  },
  sm: {
    container: "max-w-2xl max-h-[300px] p-4 min-h-[12rem]",
    font: "text-xs",
  },
};

type VideoUploadProps = {
  className?: string;
  size?: "lg" | "md" | "sm";
  onFileSelect?: (file: File, url: string) => void;
};

const VideoUpload = ({ className = "", size = "md", onFileSelect }: VideoUploadProps) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const uploadRef = useRef<FileUploadZoneHandle>(null);
  const styles = sizeStyles[size];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoURL(url);
    onFileSelect?.(file, url);
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoURL(null);
    uploadRef.current?.clear();
    onFileSelect?.(null as never, "");
  };

  if (videoFile && videoURL) {
    return <VideoPreview videoURL={videoURL} onClear={clearVideo} size={size} />;
  }

  return (
    <FileUploadZone
      ref={uploadRef}
      name="video-upload"
      accept="video/*"
      hint="MP4, WebM, or other video formats"
      className={cn("w-full", className)}
      zoneClassName={cn("w-full bg-card rounded-lg border border-border relative", styles.container)}
      onChange={handleFileChange}
    />
  );
};

export default VideoUpload;
