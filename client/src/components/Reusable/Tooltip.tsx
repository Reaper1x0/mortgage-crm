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
const DEFAULT_OFFSET = 8;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

  const arrowClass =
    coords?.placement === "top"
      ? "top-full left-1/2 -translate-x-1/2 -mt-px border-t-card-border"
      : coords?.placement === "bottom"
        ? "bottom-full left-1/2 -translate-x-1/2 -mb-px border-b-card-border"
        : coords?.placement === "left"
          ? "left-full top-1/2 -translate-y-1/2 -ml-px border-l-card-border"
          : "right-full top-1/2 -translate-y-1/2 -mr-px border-r-card-border";

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("inline-flex", triggerClassName)}
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
                "pointer-events-none fixed z-[10000] whitespace-nowrap rounded-md border border-card-border bg-card px-2 py-1 text-xs text-text shadow-lg",
                className
              )}
              style={{
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                visibility: coords ? "visible" : "hidden",
              }}
            >
              {content}
              <div
                className={cn("absolute h-0 w-0 border-4 border-transparent", arrowClass)}
                aria-hidden
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
