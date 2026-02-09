import { useEffect, useState, useCallback } from "react";

interface UsePdfViewerProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  pageWrapRef: React.RefObject<HTMLDivElement>;
  onPageSizeChange?: (size: { w: number; h: number }) => void;
  onPageDimensionsReady?: (width: number, height: number) => void;
}

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
    return Math.max(280, Math.min(maxWidth, 1200));
  }, [containerRef]);

  const syncPagePx = useCallback(() => {
    const pageEl = pageWrapRef.current?.querySelector(".react-pdf__Page") as HTMLElement | null;
    if (!pageEl) return;

    const r = pageEl.getBoundingClientRect();
    if (r.width > 50 && r.height > 50) {
      const newSize = { w: r.width, h: r.height };
      setPagePx(newSize);
      onPageSizeChange?.(newSize);
    }
  }, [pageWrapRef, onPageSizeChange]);

  // Update page width on resize
  useEffect(() => {
    const updateWidth = () => {
      const newWidth = calculatePageWidth();
      setPageWidth(newWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    
    // Also observe container resize if available
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef?.current) {
      resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateWidth);
      resizeObserver?.disconnect();
    };
  }, [calculatePageWidth, containerRef]);

  // Handle PDF native dimensions (for reference, not used for sizing)
  const handlePageDimensions = useCallback((width: number, height: number) => {
    onPageDimensionsReady?.(width, height);
  }, [onPageDimensionsReady]);

  // Sync page size when PDF renders
  useEffect(() => {
    if (!pageWrapRef.current) return;

    const pageEl = pageWrapRef.current.querySelector(".react-pdf__Page") as HTMLElement | null;
    if (!pageEl) return;

    const ro = new ResizeObserver(() => syncPagePx());
    ro.observe(pageEl);

    return () => ro.disconnect();
  }, [pageWrapRef, syncPagePx]);

  return {
    pageWidth,
    pagePx,
    syncPagePx,
    onPageDimensions: handlePageDimensions,
  };
}
