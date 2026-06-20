import { useEffect, useState, useCallback, useRef } from "react";

interface UsePdfViewerProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  pageWrapRef: React.RefObject<HTMLDivElement>;
  onPageSizeChange?: (size: { w: number; h: number }) => void;
  onPageDimensionsReady?: (width: number, height: number) => void;
}

/** Wait for CSS width transitions (e.g. collapsible sidebar) before resizing the PDF. */
const PAGE_WIDTH_DEBOUNCE_MS = 250;
const PAGE_WIDTH_EPSILON = 2;
const PAGE_PX_SYNC_DEBOUNCE_MS = 50;

/**
 * Hook for managing PDF viewer size and calculations
 * Responsive: calculates page width based on container size
 */
export function usePdfViewer({
  containerRef,
  pageWrapRef,
  onPageSizeChange,
  onPageDimensionsReady,
}: UsePdfViewerProps) {
  // Responsive width - will be calculated based on container
  const [pageWidth, setPageWidth] = useState<number>(750);
  const [pagePx, setPagePx] = useState<{ w: number; h: number }>({ w: 750, h: 1000 });
  const pageWidthDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagePxDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate responsive page width based on container
  const calculatePageWidth = useCallback(() => {
    if (!containerRef?.current) {
      // Fallback: use viewport width with padding
      const vw = window.innerWidth;
      // Account for sidebars and padding on different screen sizes
      if (vw < 640) {
        // Mobile: full width minus padding
        return Math.max(280, vw - 48);
      } else if (vw < 1024) {
        // Tablet: account for one sidebar
        return Math.max(400, vw - 400);
      } else {
        // Desktop: account for both sidebars
        return Math.max(500, vw - 600);
      }
    }

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    // Use container width minus padding (p-2 sm:p-3 md:p-4 = 8px-12px-16px on each side)
    const padding = window.innerWidth < 640 ? 16 : window.innerWidth < 768 ? 24 : 32;
    const maxWidth = rect.width - padding;
    // Ensure minimum width and reasonable maximum (prevent too large on ultrawide screens)
    return Math.round(Math.max(280, Math.min(maxWidth, 1200)));
  }, [containerRef]);

  const applyPageWidth = useCallback(
    (nextWidth: number) => {
      setPageWidth((prev) => {
        if (Math.abs(prev - nextWidth) < PAGE_WIDTH_EPSILON) return prev;
        return nextWidth;
      });
    },
    [],
  );

  const schedulePageWidthUpdate = useCallback(() => {
    if (pageWidthDebounceRef.current) {
      clearTimeout(pageWidthDebounceRef.current);
    }
    pageWidthDebounceRef.current = setTimeout(() => {
      pageWidthDebounceRef.current = null;
      applyPageWidth(calculatePageWidth());
    }, PAGE_WIDTH_DEBOUNCE_MS);
  }, [applyPageWidth, calculatePageWidth]);

  const syncPagePx = useCallback(() => {
    const pageEl = pageWrapRef.current?.querySelector(".react-pdf__Page") as HTMLElement | null;
    if (!pageEl) return;

    const r = pageEl.getBoundingClientRect();
    if (r.width > 50 && r.height > 50) {
      const newSize = { w: r.width, h: r.height };
      setPagePx((prev) => {
        const sameWidth = Math.abs(prev.w - newSize.w) < 0.5;
        const sameHeight = Math.abs(prev.h - newSize.h) < 0.5;
        if (sameWidth && sameHeight) return prev;
        onPageSizeChange?.(newSize);
        return newSize;
      });
    }
  }, [pageWrapRef, onPageSizeChange]);

  const scheduleSyncPagePx = useCallback(() => {
    if (pagePxDebounceRef.current) {
      clearTimeout(pagePxDebounceRef.current);
    }
    pagePxDebounceRef.current = setTimeout(() => {
      pagePxDebounceRef.current = null;
      syncPagePx();
    }, PAGE_PX_SYNC_DEBOUNCE_MS);
  }, [syncPagePx]);

  // Update page width on resize (debounced so sidebar width transitions don't re-render PDF every frame)
  useEffect(() => {
    applyPageWidth(calculatePageWidth());
    window.addEventListener("resize", schedulePageWidthUpdate);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef?.current) {
      resizeObserver = new ResizeObserver(schedulePageWidthUpdate);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", schedulePageWidthUpdate);
      resizeObserver?.disconnect();
      if (pageWidthDebounceRef.current) {
        clearTimeout(pageWidthDebounceRef.current);
      }
    };
  }, [applyPageWidth, calculatePageWidth, schedulePageWidthUpdate, containerRef]);

  // Handle PDF native dimensions (for reference, not used for sizing)
  const handlePageDimensions = useCallback((width: number, height: number) => {
    onPageDimensionsReady?.(width, height);
  }, [onPageDimensionsReady]);

  // Sync overlay placement size when the rendered page element resizes
  useEffect(() => {
    if (!pageWrapRef.current) return;

    const pageEl = pageWrapRef.current.querySelector(".react-pdf__Page") as HTMLElement | null;
    if (!pageEl) return;

    const ro = new ResizeObserver(() => scheduleSyncPagePx());
    ro.observe(pageEl);

    return () => {
      ro.disconnect();
      if (pagePxDebounceRef.current) {
        clearTimeout(pagePxDebounceRef.current);
      }
    };
  }, [pageWrapRef, scheduleSyncPagePx]);

  return {
    pageWidth,
    pagePx,
    syncPagePx,
    onPageDimensions: handlePageDimensions,
  };
}
