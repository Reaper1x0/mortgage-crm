import { ReactNode } from "react";
import Button from "./Button";

type BulkActionBarProps = {
  selectedCount: number;
  itemLabel?: string;
  children?: ReactNode;
  onClear?: () => void;
};

export default function BulkActionBar({
  selectedCount,
  itemLabel = "item",
  children,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  const plural = selectedCount === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-card-text">
          <span className="font-semibold text-text">{selectedCount}</span> {plural} selected
        </p>
        <div className="flex flex-wrap gap-2">
          {children}
          {onClear ? (
            <Button variant="secondary" onClick={onClear}>
              Clear Selection
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
