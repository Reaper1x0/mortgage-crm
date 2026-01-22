// src/utils/mongoosePaginate.js

const { buildPaginationMeta } = require("./pagination.utils");

/**
 * Generic paginator for any Mongoose model.
 * Pass limit=0 | -1 | "all" to fetch all records (no pagination).
 */
const mongoosePaginate = async ({
  model,
  filter = {},
  projection = null,
  populate = null, // e.g. [{ path: "userId", select: "name email" }]
  sort = { createdAt: -1 },
  page = 1,
  limit = 10,
  lean = true,
}) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);

  const limitIsAll =
    limit === "all" ||
    limit === "*" ||
    limit === 0 ||
    limit === -1 ||
    limit === null ||
    limit === undefined;

  const limitNum = limitIsAll ? 0 : Math.max(parseInt(limit, 10) || 10, 1);
  const skip = limitIsAll ? 0 : (pageNum - 1) * limitNum;

  // Build query
  let q = model.find(filter, projection).sort(sort);

  if (!limitIsAll) {
    q = q.skip(skip).limit(limitNum);
  }

  if (populate) q = q.populate(populate);
  if (lean) q = q.lean();

  const items = await q.exec();

  // If we're fetching all, we already have everything; total = items.length
  const total = limitIsAll ? items.length : await model.countDocuments(filter);

  return {
    items,
    pagination: buildPaginationMeta({
      page: limitIsAll ? 1 : pageNum,
      limit: limitIsAll ? total : limitNum,
      total,
    }),
    ...(limitIsAll ? { all: true } : {}),
  };
};

module.exports = { mongoosePaginate };
