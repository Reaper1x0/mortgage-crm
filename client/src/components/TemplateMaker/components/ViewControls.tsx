import Button from "../../Reusable/Button";

interface ViewControlsProps {
  pageIndex: number;
  pdfNumPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function ViewControls({
  pageIndex,
  pdfNumPages,
  onPrevPage,
  onNextPage,
}: ViewControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
      <Button variant="secondary" onClick={onPrevPage} disabled={pageIndex === 0} className="text-xs sm:text-sm">
        Prev
      </Button>
      <Button
        variant="secondary"
        onClick={onNextPage}
        disabled={pageIndex >= pdfNumPages - 1}
        className="text-xs sm:text-sm"
      >
        Next
      </Button>
      <div className="text-xs sm:text-sm text-card-text">
        Page <span className="text-text font-medium">{pageIndex + 1}</span> / {pdfNumPages}
      </div>
    </div>
  );
}

