const toSafeString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

/**
 * Case-insensitive partial match across multiple string fields.
 */
const buildTextSearch = (search, fields = []) => {
  const term = toSafeString(search);
  if (!term || !fields.length) return null;

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: term, $options: "i" },
    })),
  };
};

/**
 * Single-field case-insensitive partial match.
 */
const buildRegexFilter = (field, value) => {
  const term = toSafeString(value);
  if (!term || !field) return null;
  return { [field]: { $regex: term, $options: "i" } };
};

/**
 * Exact match on a field value.
 */
const buildExactFilter = (field, value) => {
  if (value === undefined || value === null || value === "") return null;
  if (!field) return null;
  return { [field]: value };
};

/**
 * Date range filter with end-of-day on `to`.
 */
const buildDateRangeFilter = (field, from, to) => {
  if (!field) return null;
  const hasFrom = Boolean(from);
  const hasTo = Boolean(to);
  if (!hasFrom && !hasTo) return null;

  const range = {};
  if (hasFrom) range.$gte = new Date(from);
  if (hasTo) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
};

/**
 * Parse required=true|false query param into boolean filter.
 */
const buildBooleanQueryFilter = (field, rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;
  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === "true") return { [field]: true };
  if (normalized === "false") return { [field]: false };
  return null;
};

/**
 * Shallow-merge filter parts; skips null/undefined/empty objects.
 */
const mergeFilters = (base = {}, ...parts) => {
  const result = { ...base };

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;

    for (const [key, value] of Object.entries(part)) {
      if (key === "$or" && Array.isArray(value)) {
        result.$or = [...(result.$or || []), ...value];
        continue;
      }

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] === "object" &&
        !Array.isArray(result[key])
      ) {
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value;
      }
    }
  }

  return result;
};

module.exports = {
  toSafeString,
  buildTextSearch,
  buildRegexFilter,
  buildExactFilter,
  buildDateRangeFilter,
  buildBooleanQueryFilter,
  mergeFilters,
};
