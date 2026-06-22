import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiOutlineInbox,
  HiOutlineArrowPath,
  HiChevronDown,
  HiChevronUpDown,
} from "react-icons/hi2";
import HoverBorderGradient from "./Aceternity UI/HoverBorderGradient";
import Spotlight from "./Aceternity UI/Spotlight";
import Checkbox from "./Checkbox";
import { cn } from "../../utils/cn";
import type { SortOrder } from "../../types/listQuery";

type Column<T = any> = {
  key?: string;
  title: React.ReactNode;
  dataIndex?: keyof T | string;
  render?: (value: any, row: T, index?: number) => React.ReactNode;
  className?: string;
  thClassName?: string;
  sortable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
};

export type { Column as DataTableColumn };

type RowSelectionConfig = {
  selectedKeys: string[];
  onToggle: (key: string, checked: boolean) => void;
  onToggleAllVisible: (checked: boolean) => void;
  allVisibleSelected: boolean;
  someVisibleSelected?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
};

type SortConfig = {
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (field: string) => void;
};

const DEFAULT_COLUMN_WIDTH = 160;
const SELECT_COLUMN_WIDTH = 56;
const ACTIONS_COLUMN_WIDTH = 320;
const MIN_COLUMN_WIDTH = 48;
const MAX_COLUMN_WIDTH = 640;

function getColumnId<T>(col: Column<T>, index: number) {
  return col.key || String(col.dataIndex || "") || `col-${index}`;
}

function getDefaultColumnWidth<T>(col: Column<T>, id: string) {
  if (typeof col.width === "number") return col.width;
  if (id === "__select") return SELECT_COLUMN_WIDTH;
  if (id === "actions" || col.dataIndex === "actions") return ACTIONS_COLUMN_WIDTH;
  return DEFAULT_COLUMN_WIDTH;
}

function clampWidth(width: number, col: Column<unknown>) {
  const min = col.minWidth ?? MIN_COLUMN_WIDTH;
  const max = col.maxWidth ?? MAX_COLUMN_WIDTH;
  return Math.min(max, Math.max(min, width));
}

function isActionsColumn<T>(col: Column<T>, colId: string) {
  return colId === "actions" || col.dataIndex === "actions" || col.key === "actions";
}

function isFixedWidthColumn<T>(col: Column<T>, colId: string) {
  return colId === "__select" || isActionsColumn(col, colId);
}

function isSelectColumn(colId: string) {
  return colId === "__select";
}

function columnDividerClass(index: number, total: number) {
  return index < total - 1 ? "border-r border-card-border" : "";
}

function ColumnResizeHandle({
  colId,
  active,
  onMouseDown,
}: {
  colId: string;
  active: boolean;
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${colId} column`}
      title="Drag to resize column"
      onMouseDown={onMouseDown}
      className={cn(
        "absolute -right-px top-0 z-20 flex h-full w-3 items-center justify-center",
        "cursor-col-resize touch-none select-none",
        "group/resize",
      )}
    >
      <span
        className={cn(
          "pointer-events-none h-[55%] min-h-5 w-px rounded-full transition-all duration-150",
          "bg-card-border/90",
          "group-hover/resize:h-[70%] group-hover/resize:w-0.5 group-hover/resize:bg-primary",
          active && "h-[70%] w-0.5 bg-primary shadow-[0_0_0_1px] shadow-primary/30",
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 opacity-0 transition-opacity",
          "group-hover/resize:opacity-100",
          active && "opacity-100",
        )}
      >
        <span className="h-1 w-0.5 rounded-full bg-primary/80" />
        <span className="h-1 w-0.5 rounded-full bg-primary/80" />
        <span className="h-1 w-0.5 rounded-full bg-primary/80" />
      </span>
    </div>
  );
}

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
  rowKey,
  rowSelection,
  sort,
  enableColumnResize = true,
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  rowKey?: (row: T) => string;
  rowSelection?: RowSelectionConfig;
  sort?: SortConfig;
  enableColumnResize?: boolean;
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

  const resolveRowKey = (row: T, idx: number) => {
    if (rowKey) return rowKey(row);
    const anyRow = row as Record<string, unknown>;
    if (anyRow?.id) return String(anyRow.id);
    if (anyRow?._id) return String(anyRow._id);
    if (anyRow?.key) return String(anyRow.key);
    return String(idx);
  };

  const displayColumns: Column<T>[] = rowSelection
    ? [
        {
          key: "__select",
          resizable: false,
          width: SELECT_COLUMN_WIDTH,
          title: (
            <div className="flex items-center justify-center">
              <Checkbox
                size="sm"
                checked={rowSelection.allVisibleSelected}
                onChange={(e) => rowSelection.onToggleAllVisible(e.target.checked)}
                disabled={rowSelection.disabled || !data.length}
                title={rowSelection.disabledTooltip}
              />
            </div>
          ),
          render: (_value, row) => {
            const key = resolveRowKey(row, 0);
            return (
              <div className="flex items-center justify-center">
                <Checkbox
                  size="sm"
                  checked={rowSelection.selectedKeys.includes(key)}
                  onChange={(e) => rowSelection.onToggle(key, e.target.checked)}
                  disabled={rowSelection.disabled}
                  title={rowSelection.disabledTooltip}
                />
              </div>
            );
          },
        },
        ...columns,
      ]
    : columns;

  const columnIds = useMemo(
    () => displayColumns.map((col, i) => getColumnId(col, i)),
    [displayColumns],
  );

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColId, setResizingColId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const resizeRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setColumnWidths((prev) => {
      let changed = false;
      const next = { ...prev };
      displayColumns.forEach((col, i) => {
        const id = getColumnId(col, i);
        if (next[id] === undefined) {
          next[id] = getDefaultColumnWidth(col, id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columnIds, displayColumns]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const totalColumnWidth = useMemo(
    () =>
      columnIds.reduce(
        (sum, id) => sum + (columnWidths[id] ?? DEFAULT_COLUMN_WIDTH),
        0,
      ),
    [columnIds, columnWidths],
  );

  const effectiveColumnWidths = useMemo(() => {
    const baseById = Object.fromEntries(
      columnIds.map((id) => [id, columnWidths[id] ?? DEFAULT_COLUMN_WIDTH]),
    );
    const tableWidth = Math.max(containerWidth, totalColumnWidth);
    const extra = tableWidth - totalColumnWidth;

    if (extra <= 0) return baseById;

    const flexColumns = columnIds
      .map((id, index) => ({ id, col: displayColumns[index], base: baseById[id] }))
      .filter(({ id, col }) => !isFixedWidthColumn(col, id));

    const flexTotal = flexColumns.reduce((sum, entry) => sum + entry.base, 0);
    const next = { ...baseById };

    flexColumns.forEach((entry) => {
      const share =
        flexTotal > 0
          ? (entry.base / flexTotal) * extra
          : extra / Math.max(flexColumns.length, 1);
      next[entry.id] = entry.base + share;
    });

    return next;
  }, [columnIds, columnWidths, containerWidth, displayColumns, totalColumnWidth]);

  const tableWidth = Math.max(containerWidth, totalColumnWidth);

  const startColumnResize = useCallback(
    (colId: string, col: Column<T>, event: React.MouseEvent<HTMLDivElement>) => {
      if (!enableColumnResize || col.resizable === false) return;

      event.preventDefault();
      event.stopPropagation();

      const startWidth = columnWidths[colId] ?? getDefaultColumnWidth(col, colId);

      resizeRef.current = { colId, startX: event.clientX, startWidth };
      setResizingColId(colId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths, enableColumnResize],
  );

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;

      const col = displayColumns.find((c, i) => getColumnId(c, i) === resize.colId);
      const delta = event.clientX - resize.startX;
      const nextWidth = clampWidth(resize.startWidth + delta, (col || {}) as Column<unknown>);

      setColumnWidths((prev) => {
        if (prev[resize.colId] === nextWidth) return prev;
        return { ...prev, [resize.colId]: nextWidth };
      });
    };

    const onMouseUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      setResizingColId(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [displayColumns]);

  const getColumnStyle = useCallback(
    (colId: string): React.CSSProperties => {
      const width = effectiveColumnWidths[colId] ?? DEFAULT_COLUMN_WIDTH;
      return { width, minWidth: width, maxWidth: width };
    },
    [effectiveColumnWidths],
  );

  const renderSortableTitle = (col: Column<T>) => {
    const field = String(col.dataIndex || col.key || "");
    const isActive = sort && field && sort.sortBy === field;

    if (!sort || !col.sortable || !field) return col.title;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-text"
        onClick={() => sort.onSort(field)}
      >
        <span>{col.title}</span>
        {isActive ? (
          sort.sortOrder === "asc" ? (
            <HiChevronDown className="h-3.5 w-3.5 rotate-180" />
          ) : (
            <HiChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <HiChevronUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    );
  };

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
        containerClassName="w-full min-w-0"
        roundedClassName="rounded-2xl"
        className="bg-card border border-card-border shadow-sm"
      >
        <div className="relative min-w-0">
          <Spotlight className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div ref={scrollRef} className="relative z-10 w-full min-w-0 overflow-x-auto">
            <table
              className="border-collapse"
              style={{
                tableLayout: "fixed",
                width: tableWidth,
              }}
            >
              <colgroup>
                {displayColumns.map((col, i) => {
                  const colId = getColumnId(col, i);
                  return <col key={colId} style={getColumnStyle(colId)} />;
                })}
              </colgroup>
              {/* Header */}
              <thead className="bg-card">
                <tr className="border-b border-card-border">
                  {displayColumns.map((col, i) => {
                    const colId = getColumnId(col, i);
                    const canResize = enableColumnResize && col.resizable !== false;
                    const selectCol = isSelectColumn(colId);

                    return (
                      <th
                        key={colId}
                        style={getColumnStyle(colId)}
                        className={cn(
                          "sticky top-0 z-10 bg-card relative",
                          selectCol
                            ? "px-2 py-2 text-center sm:py-3"
                            : "px-3 py-2 text-left sm:px-4 sm:py-3 overflow-hidden",
                          "text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-card-text",
                          "whitespace-nowrap",
                          columnDividerClass(i, displayColumns.length),
                          col.thClassName || "",
                        )}
                      >
                        {selectCol ? (
                          renderSortableTitle(col)
                        ) : (
                          <div className="truncate pr-2">{renderSortableTitle(col)}</div>
                        )}
                        {canResize ? (
                          <ColumnResizeHandle
                            colId={colId}
                            active={resizingColId === colId}
                            onMouseDown={(event) => startColumnResize(colId, col, event)}
                          />
                        ) : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-card-border">
                {/* Loading skeleton */}
                {loading &&
                  Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                    <tr key={`skeleton-${rowIdx}`} className="animate-pulse">
                      {displayColumns.map((col, colIdx) => {
                        const colId = getColumnId(col, colIdx);
                        const selectCol = isSelectColumn(colId);
                        return (
                          <td
                            key={`${colId}-${rowIdx}`}
                            style={getColumnStyle(colId)}
                            className={cn(
                              selectCol ? "px-2 py-2 text-center sm:py-3" : "px-3 py-2 sm:px-4 sm:py-3",
                            )}
                          >
                            <div
                              className={cn(
                                "h-3.5 rounded-full",
                                colIdx % 3 === 0 ? "w-4/5" : colIdx % 3 === 1 ? "w-3/5" : "w-2/5",
                                "bg-card-hover",
                              )}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                {/* Empty state */}
                {!loading && data.length === 0 && (
                  <tr>
                    <td colSpan={displayColumns.length} className="px-4 py-10 sm:px-6 sm:py-12 text-center">
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
                  data.map((row: T, idx) => (
                    <tr
                      key={resolveRowKey(row, idx)}
                      className={cn("transition", "hover:bg-card-hover")}
                    >
                      {displayColumns.map((col, cidx) => {
                        const colId = getColumnId(col, cidx);
                        const value =
                          col.dataIndex != null && col.dataIndex !== ""
                            ? row[col.dataIndex as keyof T]
                            : undefined;
                        const actionsCol = isActionsColumn(col, colId);
                        const selectCol = isSelectColumn(colId);
                        const cellContent = col.render
                          ? col.render(value, row, idx)
                          : (value as React.ReactNode);

                        return (
                          <td
                            key={colId}
                            style={getColumnStyle(colId)}
                            className={cn(
                              "py-2 text-xs sm:text-sm text-text align-middle sm:py-3",
                              selectCol
                                ? "px-2 text-center"
                                : "px-3 sm:px-4",
                              actionsCol || selectCol
                                ? "whitespace-nowrap"
                                : "whitespace-nowrap overflow-hidden text-ellipsis",
                              col.className || "",
                            )}
                          >
                            {actionsCol || selectCol ? (
                              cellContent
                            ) : (
                              <div className="truncate">{cellContent}</div>
                            )}
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
