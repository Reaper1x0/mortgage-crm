import { Placement } from "../../../types/template.types";

/**
 * Utility functions for placement calculations
 */

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2);
}

/**
 * Convert normalized rect (0-1) to pixel coordinates
 */
export function rectToPx(
  rect: Placement["rect"],
  pageSize: { w: number; h: number },
): { left: number; top: number; width: number; height: number } {
  return {
    left: rect.x * pageSize.w,
    top: rect.y * pageSize.h,
    width: rect.w * pageSize.w,
    height: rect.h * pageSize.h,
  };
}

/**
 * Convert pixel coordinates to normalized rect (0-1)
 */
export function pxToRect(
  left: number,
  top: number,
  width: number,
  height: number,
  pageSize: { w: number; h: number },
): Placement["rect"] {
  return {
    x: clamp01(left / pageSize.w),
    y: clamp01(top / pageSize.h),
    w: clamp01(width / pageSize.w),
    h: clamp01(height / pageSize.h),
  };
}

/**
 * Get visible spawn position in viewport
 */
export function getVisibleSpawnPx(
  pdfHostRef: React.RefObject<HTMLDivElement>,
  pageWrapRef: React.RefObject<HTMLDivElement>,
  pagePx: { w: number; h: number },
): { x: number; y: number } {
  const host = pdfHostRef.current;
  const pageWrap = pageWrapRef.current;
  if (!host || !pageWrap) {
    return { x: 0.1 * pagePx.w, y: 0.1 * pagePx.h };
  }

  const hostRect = host.getBoundingClientRect();
  const pageRect = pageWrap.getBoundingClientRect();

  const pageLeftInContent = pageRect.left - hostRect.left + host.scrollLeft;
  const pageTopInContent = pageRect.top - hostRect.top + host.scrollTop;

  const visLeftContent = host.scrollLeft;
  const visTopContent = host.scrollTop;

  const visLeftOnPage = visLeftContent - pageLeftInContent;
  const visTopOnPage = visTopContent - pageTopInContent;

  const pad = 24;
  const x = clamp(visLeftOnPage + pad, 0, Math.max(0, pagePx.w - pad));
  const y = clamp(visTopOnPage + pad, 0, Math.max(0, pagePx.h - pad));
  return { x, y };
}

/**
 * Calculate next placement rect with smart positioning
 */
export function getNextPlacementRect(
  placements: Placement[],
  pageIndex: number,
  pagePx: { w: number; h: number },
  pdfHostRef: React.RefObject<HTMLDivElement>,
  pageWrapRef: React.RefObject<HTMLDivElement>,
): Placement["rect"] {
  const pagePlacements = placements.filter((p) => p.pageIndex === pageIndex);
  const baseSizePx = {
    w: Math.max(140, pagePx.w * 0.25),
    h: Math.max(42, pagePx.h * 0.04),
  };

  const last = pagePlacements[pagePlacements.length - 1];
  if (last) {
    const lastPx = rectToPx(last.rect, pagePx);
    const offset = 14;

    let nextLeft = lastPx.left + offset;
    let nextTop = lastPx.top + offset;

    const spawn = getVisibleSpawnPx(pdfHostRef, pageWrapRef, pagePx);

    const host = pdfHostRef.current;
    if (host) {
      const vis = {
        left: spawn.x,
        top: spawn.y,
        right: spawn.x + host.clientWidth,
        bottom: spawn.y + host.clientHeight,
      };
      const lastCenterX = lastPx.left + lastPx.width / 2;
      const lastCenterY = lastPx.top + lastPx.height / 2;
      const lastOnScreen =
        lastCenterX >= vis.left &&
        lastCenterX <= vis.right &&
        lastCenterY >= vis.top &&
        lastCenterY <= vis.bottom;

      if (!lastOnScreen) {
        nextLeft = spawn.x;
        nextTop = spawn.y;
      }
    }

    nextLeft = clamp(nextLeft, 8, Math.max(8, pagePx.w - baseSizePx.w - 8));
    nextTop = clamp(nextTop, 8, Math.max(8, pagePx.h - baseSizePx.h - 8));

    const r = pxToRect(nextLeft, nextTop, baseSizePx.w, baseSizePx.h, pagePx);
    return { x: clamp01(r.x), y: clamp01(r.y), w: clamp01(r.w), h: clamp01(r.h) };
  }

  const spawn = getVisibleSpawnPx(pdfHostRef, pageWrapRef, pagePx);
  const left = clamp(spawn.x, 8, Math.max(8, pagePx.w - baseSizePx.w - 8));
  const top = clamp(spawn.y, 8, Math.max(8, pagePx.h - baseSizePx.h - 8));
  const r = pxToRect(left, top, baseSizePx.w, baseSizePx.h, pagePx);
  return { x: clamp01(r.x), y: clamp01(r.y), w: clamp01(r.w), h: clamp01(r.h) };
}

