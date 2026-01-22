// src/utils/pagination.js

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const isAllLimit = (raw) => {
  if (raw === undefined || raw === null) return false;

  // supports: ?limit=all | ?limit=* | ?limit=0 | ?limit=-1
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "all" || v === "*") return true;
    // "0" / "-1"
    const n = Number(v);
    return Number.isFinite(n) && (n === 0 || n === -1);
  }

  if (typeof raw === "number") return raw === 0 || raw === -1;

  return false;
};

const parsePagination = (query = {}, defaults = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
    defaultSortBy = "createdAt",
    defaultSortOrder = "desc",
    allowedSortBy = null, // array or null
  } = defaults;

  // --- ALL mode ---
  const isAll = isAllLimit(query.limit);

  let page = Number(query.page ?? defaultPage);
  if (!Number.isFinite(page) || page <= 0) page = defaultPage;
  page = Math.floor(page);

  let limit;

  if (isAll) {
    // Convention: limit=0 means "no pagination"
    limit = 0;
    page = 1; // keep stable in meta
  } else {
    // normal pagination
    limit = Number(query.limit);

    // if limit is missing/invalid -> defaultLimit
    if (!Number.isFinite(limit)) limit = defaultLimit;

    // if limit passed as 0 but not "all", treat as defaultLimit
    // (optional behavior; keep if you want)
    if (limit === 0) limit = defaultLimit;

    limit = clamp(Math.floor(limit), 1, maxLimit);
  }

  let sortBy = String(query.sortBy ?? defaultSortBy);
  let sortOrder = String(query.sortOrder ?? defaultSortOrder).toLowerCase();

  if (allowedSortBy && Array.isArray(allowedSortBy) && !allowedSortBy.includes(sortBy)) {
    sortBy = defaultSortBy;
  }

  if (!["asc", "desc"].includes(sortOrder)) sortOrder = defaultSortOrder;

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
  const skip = isAll ? 0 : (page - 1) * limit;

  return { page, limit, skip, sort, sortBy, sortOrder, isAll };
};

const buildPaginationMeta = ({ page, limit, total, isAll = false }) => {
  // If isAll, totalPages = 1 and hasNext/hasPrev false
  if (isAll || limit === 0) {
    return {
      page: 1,
      limit: total || 0,
      total,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
      all: true,
    };
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
};

module.exports = { parsePagination, buildPaginationMeta };
