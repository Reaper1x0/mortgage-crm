export type SortOrder = "asc" | "desc";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export type ListQueryParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  [key: string]: string | number | boolean | undefined;
};

export type PaginatedListResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type BulkImportPreview = {
  columns: string[];
  previewRows: Record<string, unknown>[];
  rows: Record<string, unknown>[];
  totalRows: number;
  fields: string[];
};

export type BulkImportResult = {
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  skippedReasons: Array<{ row: number; reason: string }>;
};
