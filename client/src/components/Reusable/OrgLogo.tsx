import { useEffect, useRef, useState } from "react";
import { RiBuildingLine } from "react-icons/ri";
import { cn } from "../../utils/cn";

/** Square frames so object-contain logos are not letterboxed left/right. */
const BOX = {
  nav: "h-9 w-9",
  menu: "h-7 w-7",
  settings: "h-20 w-20",
} as const;

const LOAD_TIMEOUT_MS = 8000;

type OrgLogoProps = {
  src?: string | null;
  alt?: string;
  size?: keyof typeof BOX;
  className?: string;
  /** Optional 1–2 letter mark while loading or when the image fails. */
  initials?: string;
  /** "none" hides the mark when there is no logo. "icon" shows a building mark. */
  fallback?: "none" | "icon";
  /** Called once when the current src fails, so the caller can fetch a fresh signed URL. */
  onLoadError?: () => void;
};

function FallbackMark({
  initials,
  fallback,
  size,
}: {
  initials?: string;
  fallback: "none" | "icon";
  size: keyof typeof BOX;
}) {
  const label = (initials || "").trim().slice(0, 2).toUpperCase();
  if (label) {
    return (
      <span
        className={cn(
          "font-semibold text-primary-text",
          size === "settings" ? "text-xl" : "text-[10px]",
        )}
      >
        {label}
      </span>
    );
  }
  if (fallback === "none") return null;
  return <RiBuildingLine className="h-4 w-4 text-card-text" aria-hidden />;
}

export default function OrgLogo({
  src,
  alt = "",
  size = "nav",
  className,
  initials,
  fallback = "icon",
  onLoadError,
}: OrgLogoProps) {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const reportedSrc = useRef<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const logoSrc = src ?? null;

  const failOnce = () => {
    if (reportedSrc.current === logoSrc) {
      setBroken(true);
      return;
    }
    reportedSrc.current = logoSrc;
    setAttempt(1);
    onLoadError?.();
  };

  useEffect(() => {
    setBroken(false);
    setAttempt(0);
    setImageReady(false);
    reportedSrc.current = null;
  }, [logoSrc]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !logoSrc) return;

    const markReady = () => {
      if (img.naturalWidth > 0) setImageReady(true);
    };

    if (img.complete) markReady();
    img.addEventListener("load", markReady);

    const timer = window.setTimeout(() => {
      if (!img.complete || img.naturalWidth === 0) failOnce();
    }, LOAD_TIMEOUT_MS);

    return () => {
      img.removeEventListener("load", markReady);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- failOnce closes over latest logoSrc/onLoadError
  }, [logoSrc]);

  const box = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md",
    BOX[size],
    className,
  );

  const showImage = Boolean(logoSrc) && !broken && attempt === 0;

  if (!showImage || !logoSrc) {
    if (!logoSrc && fallback === "none" && !(initials || "").trim()) return null;
    return (
      <span
        className={cn(
          box,
          initials
            ? "border-0 bg-primary text-primary-text"
            : "border border-card-border bg-background",
        )}
      >
        <FallbackMark initials={initials} fallback={fallback} size={size} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        box,
        imageReady
          ? "bg-transparent"
          : initials
            ? "border-0 bg-primary"
            : "border border-card-border bg-background",
      )}
    >
      {!imageReady ? (
        <span className="absolute inset-0 z-0 flex items-center justify-center">
          {initials ? (
            <FallbackMark initials={initials} fallback={fallback} size={size} />
          ) : (
            <span className="absolute inset-0 animate-pulse rounded-[inherit] bg-card-border/50" />
          )}
        </span>
      ) : null}
      <img
        ref={imgRef}
        src={logoSrc}
        alt={alt}
        decoding="async"
        fetchPriority={size === "nav" ? "high" : "auto"}
        className={cn(
          "relative z-[1] h-full w-full object-contain",
          imageReady ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setImageReady(true)}
        onError={failOnce}
      />
    </span>
  );
}
