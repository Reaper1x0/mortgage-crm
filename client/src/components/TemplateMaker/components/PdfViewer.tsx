import { Document, Page, pdfjs, type DocumentProps } from "react-pdf";
import { Placement } from "../../../types/template.types";
import PlacementBox from "../PlacementBox";
import { rectToPx, pxToRect } from "../utils/placementUtils";

// Must be configured in the same module as <Document>/<Page> (react-pdf requirement).
// Vite bundles the worker from pdfjs-dist so version always matches react-pdf.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfViewerProps {
  pdfFile: DocumentProps["file"];
  pageIndex: number;
  pageWidth: number;
  pagePx: { w: number; h: number };
  placements: Placement[];
  selectedPlacementId: string;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacementRect: (id: string, rect: Placement["rect"]) => void;
  onPageLoad: (numPages: number) => void;
  onRenderSuccess: () => void;
  onPageDimensions?: (width: number, height: number) => void;
  pdfHostRef: React.RefObject<HTMLDivElement>;
  pageWrapRef: React.RefObject<HTMLDivElement>;
}

export default function PdfViewer({
  pdfFile,
  pageIndex,
  pageWidth,
  pagePx,
  placements,
  selectedPlacementId,
  onSelectPlacement,
  onUpdatePlacementRect,
  onPageLoad,
  onRenderSuccess,
  onPageDimensions,
  pdfHostRef,
  pageWrapRef,
}: PdfViewerProps) {
  const pagePlacements = placements.filter((p) => p.pageIndex === pageIndex);

  const handlePageLoadSuccess = (page: any) => {
    if (page && onPageDimensions) {
      // Get the viewport which has the actual dimensions
      const viewport = page.viewport;
      if (viewport) {
        onPageDimensions(viewport.width, viewport.height);
      }
    }
    onRenderSuccess();
  };

  return (
    <div className="mt-3 w-full min-w-0 overflow-x-auto">
      {!pdfFile ? (
        <div className="text-card-text">Upload or load a template to start.</div>
      ) : (
        <div
          ref={pdfHostRef}
          className="w-full min-w-0 flex justify-center items-start rounded-md bg-background p-2 sm:p-3 md:p-4"
        >
          <div className="relative inline-block leading-none max-w-full" ref={pageWrapRef}>
            <Document
              file={pdfFile}
              onLoadSuccess={(d) => onPageLoad(d.numPages)}
              onLoadError={(error) => {
                console.error("react-pdf failed to load document:", error);
              }}
              loading={<div className="text-card-text p-3">Loading PDF...</div>}
              error={
                <div className="text-danger-text p-3">
                  Failed to load PDF file. Check the browser console for details.
                </div>
              }
            >
              <Page
                pageNumber={pageIndex + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={handlePageLoadSuccess}
                onRenderSuccess={onRenderSuccess}
              />
            </Document>

            <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
              {pagePlacements.map((p) => {
                const px = rectToPx(p.rect, pagePx);
                const isSelected = p.placementId === selectedPlacementId;

                return (
                  <PlacementBox
                    key={p.placementId}
                    placement={p}
                    px={px}
                    selected={isSelected}
                    onSelect={() => onSelectPlacement(p.placementId)}
                    onMoveResize={(nextPx) => {
                      const nextRect = pxToRect(
                        nextPx.left,
                        nextPx.top,
                        nextPx.width,
                        nextPx.height,
                        pagePx,
                      );
                      onUpdatePlacementRect(p.placementId, nextRect);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

