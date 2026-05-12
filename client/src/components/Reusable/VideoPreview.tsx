type VideoPreviewProps = {
  videoURL: string;
  onClear: () => void;
  size?: "lg" | "md" | "sm";
};

const sizeClass: Record<NonNullable<VideoPreviewProps["size"]>, string> = {
  lg: "max-h-[500px]",
  md: "max-h-[400px]",
  sm: "max-h-[300px]",
};

/**
 * Inline preview for a locally selected video file (object URL).
 */
const VideoPreview = ({ videoURL, onClear, size = "md" }: VideoPreviewProps) => {
  return (
    <div className="w-full rounded-lg border border-border bg-card p-4">
      <video
        src={videoURL}
        controls
        className={`mx-auto w-full max-w-full rounded ${sizeClass[size]}`}
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-destructive hover:underline"
        >
          Remove video
        </button>
      </div>
    </div>
  );
};

export default VideoPreview;
