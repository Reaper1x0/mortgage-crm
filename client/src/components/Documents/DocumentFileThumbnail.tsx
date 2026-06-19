import { FiExternalLink, FiFileText } from "react-icons/fi";
import type { FileRef } from "../../types/extraction.types";
import StatusBadge from "../Reusable/StatusBadge";
import { cn } from "../../utils/cn";
import {
  detectDocumentFormat,
  getDocumentOpenUrl,
  getDocumentThumbnailUrl,
} from "../../utils/documentThumbnail";

export type DocumentFileThumbnailProps = {
  file: FileRef | null;
  fileName: string;
  disabled?: boolean;
  className?: string;
  variant?: "compact" | "hero";
  formatLabel?: string;
};

export default function DocumentFileThumbnail({
  file,
  fileName,
  disabled = false,
  className,
  variant = "hero",
  formatLabel,
}: DocumentFileThumbnailProps) {
  const thumbnailUrl = getDocumentThumbnailUrl(file, fileName);
  const openUrl = getDocumentOpenUrl(file);
  const canOpen = Boolean(openUrl) && !disabled;
  const format = detectDocumentFormat(file?.content_type, file?.extension);
  const badge = formatLabel || format.toUpperCase();

  const handleOpen = () => {
    if (!openUrl || disabled) return;
    window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "group/thumb relative overflow-hidden bg-card-muted",
        isHero
          ? "aspect-[3/1] w-full shrink-0"
          : "aspect-[4/5] w-[4.5rem] shrink-0 rounded-xl border border-card-border shadow-sm",
        canOpen && "cursor-pointer",
        className
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="h-full w-full object-cover object-top transition-transform duration-300 group-hover/thumb:scale-[1.02]"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-card-muted text-card-text">
          <FiFileText className="h-8 w-8" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wide">{badge}</span>
        </div>
      )}

      {badge ? (
        <span className="pointer-events-none absolute bottom-2 right-2">
          <StatusBadge tone="neutral">{badge}</StatusBadge>
        </span>
      ) : null}

      {canOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-200",
            "opacity-0 group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          )}
          aria-label={`Open ${fileName} in new tab`}
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary shadow-lg",
              "translate-y-1 scale-90 transition-transform duration-200 ease-out",
              "group-hover/thumb:translate-y-0 group-hover/thumb:scale-100",
              "group-focus-within/thumb:translate-y-0 group-focus-within/thumb:scale-100"
            )}
          >
            <FiExternalLink className="h-5 w-5" aria-hidden />
          </span>
        </button>
      ) : null}
    </div>
  );
}
