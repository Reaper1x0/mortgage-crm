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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        onClick={onPrevPage}
        disabled={pageIndex === 0}
        className="!px-2.5 !py-1 text-xs"
      >
        Prev
      </Button>
      <Button
        variant="secondary"
        onClick={onNextPage}
        disabled={pageIndex >= pdfNumPages - 1}
        className="!px-2.5 !py-1 text-xs"
      >
        Next
      </Button>
      <div className="text-xs text-card-text">
        Page <span className="font-medium text-text">{pageIndex + 1}</span> / {pdfNumPages}
      </div>
    </div>
  );
}
