import { Document, Page, pdfjs, type DocumentProps } from "react-pdf";
import { Placement } from "../../../types/template.types";
import PlacementBox from "../PlacementBox";
import { rectToPx, pxToRect } from "../utils/placementUtils";
import { cn } from "../../../utils/cn";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfViewerProps {
  pdfFile: DocumentProps["file"];
  emptyMessage?: string;
  isError?: boolean;
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
  pdfHostRef: React.Ref<HTMLDivElement>;
  pageWrapRef: React.Ref<HTMLDivElement>;
}

export default function PdfViewer({
  pdfFile,
  emptyMessage = "Upload or load a template to start.",
  isError = false,
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
      const viewport = page.viewport;
      if (viewport) {
        onPageDimensions(viewport.width, viewport.height);
      }
    }
    onRenderSuccess();
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      {!pdfFile ? (
        <div
          className={cn(
            "flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center",
            isError
              ? "border-danger-border bg-danger-muted"
              : "border-card-border bg-card",
          )}
        >
          <p
            className={cn(
              "max-w-md text-sm leading-relaxed",
              isError ? "text-danger-text" : "text-card-text",
            )}
          >
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div
          ref={pdfHostRef}
          className="mx-auto flex w-full min-w-0 justify-center overflow-x-auto rounded-xl border border-card-border bg-card p-3 sm:p-4"
        >
          <div className="relative inline-block max-w-full leading-none" ref={pageWrapRef}>
            <Document
              file={pdfFile}
              onLoadSuccess={(d) => onPageLoad(d.numPages)}
              onLoadError={(error) => {
                console.error("react-pdf failed to load document:", error);
              }}
              loading={<div className="p-3 text-card-text">Loading PDF...</div>}
              error={
                <div className="p-3 text-danger">
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
