import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListQueryParams, PaginatedListResult, SortOrder } from "../types/listQuery";

type UsePaginatedListOptions<T, P extends ListQueryParams> = {
  fetchFn: (params: P) => Promise<PaginatedListResult<T>>;
  initialFilters?: Partial<P>;
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: SortOrder;
  debounceKeys?: Array<keyof P & string>;
  debounceMs?: number;
};

function stripEmptyParams<P extends Record<string, unknown>>(params: P): P {
  const next = { ...params };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (value === "" || value === null || value === undefined) {
      delete next[key];
    }
  }
  return next;
}

export function usePaginatedList<T, P extends ListQueryParams = ListQueryParams>({
  fetchFn,
  initialFilters = {},
  initialPage = 1,
  initialPageSize = 10,
  initialSortBy = "createdAt",
  initialSortOrder = "desc",
  debounceKeys = ["search"] as Array<keyof P & string>,
  debounceMs = 300,
}: UsePaginatedListOptions<T, P>) {
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<Partial<P>>(() => ({ ...initialFilters }));
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [debouncedFilters, setDebouncedFilters] = useState<Partial<P>>(() => ({ ...initialFilters }));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasDebouncedChanges = useMemo(() => {
    return debounceKeys.some((key) => filters[key] !== debouncedFilters[key]);
  }, [filters, debouncedFilters, debounceKeys]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedFilters((prev) => {
        const keys = new Set([...Object.keys(prev), ...Object.keys(filters)]);
        for (const key of keys) {
          if (prev[key as keyof P] !== filters[key as keyof P]) {
            return filters;
          }
        }
        return prev;
      });
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, debounceMs]);

  const queryParams = useMemo(() => {
    return stripEmptyParams({
      ...debouncedFilters,
      page,
      limit: pageSize,
      sortBy,
      sortOrder,
    } as P);
  }, [debouncedFilters, page, pageSize, sortBy, sortOrder]);

  const queryKey = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const result = await fetchFnRef.current(queryParams);
        if (cancelled) return;
        setData(result.items);
        setTotal(result.pagination.total ?? result.items.length);
      } catch {
        if (!cancelled) {
          setData([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFnRef.current(queryParams);
      setData(result.items);
      setTotal(result.pagination.total ?? result.items.length);
      return result;
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  const setFilter = useCallback(<K extends keyof P>(key: K, value: P[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const setFilters = useCallback((next: Partial<P>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({ ...initialFilters });
    setPage(1);
  }, [initialFilters]);

  const setSort = useCallback(
    (field: string, order?: SortOrder) => {
      if (order) {
        setSortBy(field);
        setSortOrder(order);
      } else if (sortBy === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

  const handlePageSizeChange = useCallback((nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  }, []);

  return {
    data,
    loading,
    total,
    page,
    pageSize,
    filters,
    debouncedFilters,
    hasDebouncedChanges,
    sortBy,
    sortOrder,
    setPage,
    setPageSize: handlePageSizeChange,
    setFilter,
    setFilters,
    clearFilters,
    setSort,
    refetch,
    queryParams,
  };
}
