import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { useTheme } from "../../context/ThemeContext";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  offset?: number;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

type Coords = { top: number; left: number; placement: TooltipPlacement };

const VIEWPORT_PADDING = 8;
const DEFAULT_OFFSET = 10;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function Arrow({ placement, lightSurface }: { placement: TooltipPlacement; lightSurface: boolean }) {
  const edge =
    placement === "top"
      ? "left-1/2 top-full -mt-1.5 -translate-x-1/2 border-b border-r"
      : placement === "bottom"
        ? "left-1/2 bottom-full -mb-1.5 -translate-x-1/2 border-l border-t"
        : placement === "left"
          ? "left-full top-1/2 -ml-1.5 -translate-y-1/2 border-r border-t"
          : "right-full top-1/2 -mr-1.5 -translate-y-1/2 border-b border-l";

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-2.5 w-2.5 rotate-45",
        lightSurface ? "border-[#e2e8f0] bg-[#f8fafc]" : "border-[#334155] bg-[#0f172a]",
        edge
      )}
    />
  );
}

export default function Tooltip({
  content,
  children,
  placement = "top",
  offset = DEFAULT_OFFSET,
  className,
  triggerClassName,
  disabled = false,
}: TooltipProps) {
  const { theme } = useTheme();
  const lightSurface = theme === "dark";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();

    const candidates: TooltipPlacement[] = [
      placement,
      placement === "top" ? "bottom" : placement === "bottom" ? "top" : placement === "left" ? "right" : "left",
      "bottom",
      "top",
    ];

    const uniqueCandidates = [...new Set(candidates)];

    const positionFor = (pos: TooltipPlacement) => {
      if (pos === "top") {
        return {
          top: rect.top - tipRect.height - offset,
          left: rect.left + rect.width / 2 - tipRect.width / 2,
        };
      }
      if (pos === "bottom") {
        return {
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2 - tipRect.width / 2,
        };
      }
      if (pos === "left") {
        return {
          top: rect.top + rect.height / 2 - tipRect.height / 2,
          left: rect.left - tipRect.width - offset,
        };
      }
      return {
        top: rect.top + rect.height / 2 - tipRect.height / 2,
        left: rect.right + offset,
      };
    };

    const fitsViewport = (pos: TooltipPlacement) => {
      const { top, left } = positionFor(pos);
      return (
        top >= VIEWPORT_PADDING &&
        left >= VIEWPORT_PADDING &&
        top + tipRect.height <= window.innerHeight - VIEWPORT_PADDING &&
        left + tipRect.width <= window.innerWidth - VIEWPORT_PADDING
      );
    };

    const chosen = uniqueCandidates.find(fitsViewport) ?? placement;
    const { top, left } = positionFor(chosen);

    setCoords({
      top: clamp(top, VIEWPORT_PADDING, window.innerHeight - tipRect.height - VIEWPORT_PADDING),
      left: clamp(left, VIEWPORT_PADDING, window.innerWidth - tipRect.width - VIEWPORT_PADDING),
      placement: chosen,
    });
  }, [offset, placement]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const frame = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(frame);
  }, [open, content, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  const show = open && !disabled && content != null && content !== "";

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("inline-flex max-w-full", triggerClassName)}
        onMouseEnter={() => {
          if (!disabled) setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>

      {mounted && show
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              className={cn(
                "pointer-events-none fixed z-[10000] max-w-xs rounded-lg border px-2.5 py-1.5 text-xs font-medium leading-snug shadow-lg",
                lightSurface
                  ? "border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a]"
                  : "border-[#334155] bg-[#0f172a] text-[#f8fafc]",
                "whitespace-normal break-words",
                className
              )}
              style={{
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                visibility: coords ? "visible" : "hidden",
              }}
            >
              {content}
              {coords ? <Arrow placement={coords.placement} lightSurface={lightSurface} /> : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
