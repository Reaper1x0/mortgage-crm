import { useEffect, useRef, useState } from "react";
import { RiBuildingLine } from "react-icons/ri";
import { cn } from "../../utils/cn";

const BOX = {
  nav: "h-8 w-16",
  menu: "h-7 w-7",
  settings: "h-20 w-[180px]",
} as const;

type OrgLogoProps = {
  src?: string | null;
  alt?: string;
  size?: keyof typeof BOX;
  className?: string;
  /** "none" hides the mark when there is no logo. "icon" shows a building mark. */
  fallback?: "none" | "icon";
  /** Called once when the current src fails, so the caller can fetch a fresh signed URL. */
  onLoadError?: () => void;
};

export default function OrgLogo({
  src,
  alt = "",
  size = "nav",
  className,
  fallback = "icon",
  onLoadError,
}: OrgLogoProps) {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reportedSrc = useRef<string | null>(null);

  useEffect(() => {
    setBroken(false);
    setAttempt(0);
    reportedSrc.current = null;
  }, [src]);

  const box = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-card-border bg-background",
    BOX[size],
    className,
  );

  const logoSrc = src ?? null;
  const showImage = Boolean(logoSrc) && !broken && attempt === 0;

  if (!showImage || !logoSrc) {
    if (!logoSrc && fallback === "none") return null;
    return (
      <span className={box}>
        <RiBuildingLine className="h-4 w-4 text-card-text" aria-hidden />
      </span>
    );
  }

  return (
    <span className={box}>
      <img
        src={logoSrc}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
        onError={() => {
          if (reportedSrc.current !== logoSrc) {
            reportedSrc.current = logoSrc;
            setAttempt(1);
            onLoadError?.();
            return;
          }
          setBroken(true);
        }}
      />
    </span>
  );
}
