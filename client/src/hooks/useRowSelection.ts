import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseRowSelectionOptions<T> = {
  rowKey: (row: T) => string;
  rows: T[];
};

export function useRowSelection<T>({ rowKey, rows }: UseRowSelectionOptions<T>) {
  const rowKeyRef = useRef(rowKey);
  rowKeyRef.current = rowKey;

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const visibleKeys = useMemo(
    () => rows.map((row) => rowKeyRef.current(row)),
    [rows],
  );

  useEffect(() => {
    const allowed = new Set(rows.map((row) => rowKeyRef.current(row)));
    setSelectedKeys((prev) => {
      if (!prev.length) return prev;
      const next = prev.filter((key) => allowed.has(key));
      return next.length === prev.length ? prev : next;
    });
  }, [rows]);

  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key));

  const someVisibleSelected =
    visibleKeys.some((key) => selectedKeys.includes(key)) && !allVisibleSelected;

  const isSelected = useCallback(
    (key: string) => selectedKeys.includes(key),
    [selectedKeys],
  );

  const toggle = useCallback((key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter((k) => k !== key);
    });
  }, []);

  const toggleAllVisible = useCallback(
    (checked: boolean) => {
      setSelectedKeys((prev) => {
        if (checked) {
          const merged = new Set([...prev, ...visibleKeys]);
          return Array.from(merged);
        }
        const next = prev.filter((key) => !visibleKeys.includes(key));
        return next.length === prev.length ? prev : next;
      });
    },
    [visibleKeys],
  );

  const clear = useCallback(() => setSelectedKeys([]), []);

  const pruneToRows = useCallback((nextRows: T[]) => {
    const allowed = new Set(nextRows.map((row) => rowKeyRef.current(row)));
    setSelectedKeys((prev) => {
      if (!prev.length) return prev;
      const next = prev.filter((key) => allowed.has(key));
      return next.length === prev.length ? prev : next;
    });
  }, []);

  return {
    selectedKeys,
    selectedCount: selectedKeys.length,
    isSelected,
    toggle,
    toggleAllVisible,
    allVisibleSelected,
    someVisibleSelected,
    clear,
    pruneToRows,
    setSelectedKeys,
  };
}
