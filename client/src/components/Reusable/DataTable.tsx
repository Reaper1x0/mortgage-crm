import React from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiOutlineInbox,
  HiOutlineArrowPath,
  HiChevronDown,
} from "react-icons/hi2";
import HoverBorderGradient from "./Aceternity UI/HoverBorderGradient";
import Spotlight from "./Aceternity UI/Spotlight";
import { cn } from "../../utils/cn";

type Column<T = any> = {
  key?: string;
  title: React.ReactNode;
  dataIndex?: keyof T | string;
  render?: (value: any, row: T, index?: number) => React.ReactNode;
  className?: string;
  thClassName?: string;
};

function IconPageButton({
  onClick,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        // base
        "relative inline-flex items-center justify-center rounded-xl",
        "border border-card-border bg-background text-text",
        "shadow-sm transition-all duration-200",
        "hover:bg-card-hover hover:shadow-md hover:-translate-y-[1px]",
        "active:translate-y-[0px]",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        // responsive sizing (smaller on mobile)
        "h-8 w-8 sm:h-9 sm:w-9",
        disabled
          ? "cursor-not-allowed opacity-40 hover:bg-background hover:shadow-sm hover:translate-y-0"
          : "",
        className || ""
      )}
    >
      <span className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 hover:opacity-100 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_45%)]" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export default function DataTable<T = any>({
  columns,
  data,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const isPaginated =
    typeof page === "number" &&
    typeof pageSize === "number" &&
    typeof total === "number";

  const totalPages = isPaginated
    ? Math.max(1, Math.ceil((total as number) / (pageSize as number)))
    : 1;

  const safePage = isPaginated ? Math.max(1, Math.min(totalPages, page!)) : 1;

  const startItem =
    isPaginated && total! > 0 ? (safePage - 1) * pageSize! + 1 : 0;

  const endItem =
    isPaginated && total! > 0 ? Math.min(total!, safePage * pageSize!) : 0;

  const canPrev = isPaginated && !loading && safePage > 1;
  const canNext = isPaginated && !loading && safePage < totalPages;

  const goTo = (p: number) => {
    if (!isPaginated || !onPageChange || loading) return;
    const next = Math.max(1, Math.min(totalPages, p));
    if (next !== safePage) onPageChange(next);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!onPageSizeChange || loading) return;
    const newSize = Number(e.target.value || 10);
    onPageSizeChange(newSize);
    onPageChange?.(1);
  };

  const skeletonRowCount = Math.max(6, Math.min(pageSize || 10, 10));

  return (
    <div className="space-y-3">
      {/* Toolbar / Pagination */}
      {isPaginated && (
        <HoverBorderGradient
          containerClassName="w-full"
          roundedClassName="rounded-2xl"
          className="bg-card border border-card-border shadow-sm"
        >
          <div className="relative">
            <Spotlight className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10 flex gap-3 px-3 py-3 sm:flex-row sm:items-center justify-between sm:px-4">
              {/* Left: rows per page */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-card-text opacity-80">
                  Rows
                </span>

                <div className="relative">
                  <select
                    className={cn(
                      "appearance-none rounded-xl border border-card-border bg-background",
                      "pl-3 pr-9 py-2 text-xs text-text shadow-sm",
                      "hover:bg-card-hover transition cursor-pointer",
                      // tighter on mobile
                      "h-8 sm:h-auto",
                      loading ? "opacity-60" : ""
                    )}
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    disabled={loading}
                  >
                    {[5, 10, 25, 50, 100].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text opacity-70">
                    <HiChevronDown className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {/* Middle: info */}
              <div className="flex items-center gap-2 text-sm text-card-text">
                {loading ? (
                  <span className="inline-flex items-center gap-2 opacity-80">
                    <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                    Loading…
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="opacity-80">
                      <span className="font-semibold text-text">{startItem}</span>
                      {"–"}
                      <span className="font-semibold text-text">{endItem}</span>
                      <span className="opacity-80"> of </span>
                      <span className="font-semibold text-text">{total}</span>
                    </span>

                    <span className="hidden sm:inline opacity-30">•</span>

                    <span className="opacity-80">
                      <span className="font-semibold text-text">{safePage}</span>
                      <span className="opacity-80"> / </span>
                      <span className="font-semibold text-text">{totalPages}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Right: icon-only controls */}
              <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                {/* Hide double buttons on very small screens */}
                <div className="hidden xs:flex items-center gap-1.5 sm:gap-2">
                  <IconPageButton onClick={() => goTo(1)} disabled={!canPrev} title="First page">
                    <HiChevronDoubleLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </IconPageButton>
                </div>

                <IconPageButton
                  onClick={() => goTo(safePage - 1)}
                  disabled={!canPrev}
                  title="Previous page"
                >
                  <HiChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </IconPageButton>

                <IconPageButton
                  onClick={() => goTo(safePage + 1)}
                  disabled={!canNext}
                  title="Next page"
                >
                  <HiChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </IconPageButton>

                <div className="hidden xs:flex items-center gap-1.5 sm:gap-2">
                  <IconPageButton
                    onClick={() => goTo(totalPages)}
                    disabled={!canNext}
                    title="Last page"
                  >
                    <HiChevronDoubleRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </IconPageButton>
                </div>
              </div>
            </div>
          </div>
        </HoverBorderGradient>
      )}

      {/* Table */}
      <HoverBorderGradient
        containerClassName="w-full"
        roundedClassName="rounded-2xl"
        className="bg-card border border-card-border shadow-sm overflow-hidden"
      >
        <div className="relative">
          <Spotlight className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full border-collapse min-w-max">
              {/* Header */}
              <thead className="bg-card">
                <tr className="border-b border-card-border">
                  {columns.map((col, i) => (
                    <th
                      key={col.key || String(col.dataIndex) || String(i)}
                      className={cn(
                        "sticky top-0 z-10 bg-card text-left",
                        "text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-card-text",
                        // tighter padding on mobile
                        "px-3 py-2 sm:px-4 sm:py-3",
                        // prevent header wrapping weirdly on mobile
                        "whitespace-nowrap",
                        col.thClassName || ""
                      )}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-card-border">
                {/* Loading skeleton */}
                {loading &&
                  Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                    <tr key={`skeleton-${rowIdx}`} className="animate-pulse">
                      {columns.map((col, colIdx) => (
                        <td
                          key={`${col.key || String(col.dataIndex) || colIdx}-${rowIdx}`}
                          className="px-3 py-2 sm:px-4 sm:py-3"
                        >
                          <div
                            className={cn(
                              "h-3.5 rounded-full",
                              colIdx % 3 === 0 ? "w-4/5" : colIdx % 3 === 1 ? "w-3/5" : "w-2/5",
                              "bg-card-hover"
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}

                {/* Empty state */}
                {!loading && data.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 sm:px-6 sm:py-12 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                        <div className="rounded-2xl border border-card-border bg-background/70 p-3 shadow-sm">
                          <HiOutlineInbox className="h-6 w-6 text-text opacity-70" />
                        </div>
                        <div className="text-sm font-semibold text-text">
                          No results found
                        </div>
                        <div className="text-xs text-card-text opacity-80">
                          Try adjusting filters, search, or pagination.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Real rows */}
                {!loading &&
                  data.map((row: any, idx) => (
                    <tr
                      key={row?.id || row?._id || idx}
                      className={cn("transition", "hover:bg-card-hover")}
                    >
                      {columns.map((col, cidx) => {
                        const value =
                          typeof col.dataIndex === "string"
                            ? row[col.dataIndex]
                            : col.dataIndex
                            ? row[col.dataIndex as keyof typeof row]
                            : undefined;

                        return (
                          <td
                            key={col.key || String(col.dataIndex) || String(cidx)}
                            className={cn(
                              // smaller text + tighter padding on mobile
                              "px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-text align-middle",
                              // keep cells from exploding width on mobile
                              "whitespace-nowrap",
                              col.className || ""
                            )}
                          >
                            {col.render ? col.render(value, row, idx) : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </HoverBorderGradient>
    </div>
  );
}
