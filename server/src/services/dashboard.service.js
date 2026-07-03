const { Submission, MasterField } = require("../models");
const mongoose = require("mongoose");

const getDateRange = (range, startDate, endDate) => {
  const now = new Date();
  let start, end;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    // Default ranges
    end = now;
    switch (range) {
      case "daily":
        start = new Date(now);
        start.setDate(start.getDate() - 14);
        break;
      case "weekly":
        start = new Date(now);
        start.setDate(start.getDate() - 84); // 12 weeks
        break;
      case "monthly":
        start = new Date(now);
        start.setMonth(start.getMonth() - 12);
        break;
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 14);
    }
  }

  return { start, end };
};

/**
 * When a submission was marked complete (not last arbitrary update).
 */
const getCompletionTimestamp = (submission) => {
  if (submission.completedAt) return new Date(submission.completedAt);

  const reviewedDates = (submission.submission_fields || [])
    .filter((f) => f.is_reviewed && f.reviewedAt)
    .map((f) => new Date(f.reviewedAt).getTime())
    .filter((t) => !Number.isNaN(t));

  if (reviewedDates.length > 0) {
    return new Date(Math.max(...reviewedDates));
  }

  if (submission.eligibility?.updatedAt) {
    return new Date(submission.eligibility.updatedAt);
  }

  return new Date(submission.updatedAt);
};

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * Helper: Get date bucket format for grouping
 * For weekly: Group by year and week of year (ISO week format)
 * Note: MongoDB's $dateToString doesn't support %V (ISO week) in all versions
 * Using a workaround: group by year and day-of-year divided by 7
 */
const getDateBucketFormat = (range) => {
  switch (range) {
    case "daily":
      return { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    case "weekly":
      // Group by year and approximate week (day of year / 7, floored)
      // This gives us year-week buckets
      return {
        $concat: [
          { $dateToString: { format: "%Y", date: "$createdAt" } },
          "-W",
          {
            $toString: {
              $floor: {
                $divide: [
                  { $dayOfYear: "$createdAt" },
                  7,
                ],
              },
            },
          },
        ],
      };
    case "monthly":
      return { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    default:
      return { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
  }
};

/**
 * Build bucket key for a JS Date. Uses UTC to EXACTLY match MongoDB's aggregation
 * ($dateToString / $dayOfYear default to UTC), so filled keys align with real buckets.
 */
const toBucketKey = (date, range) => {
  const d = new Date(date);
  switch (range) {
    case "daily":
      return d.toISOString().slice(0, 10);
    case "weekly": {
      const year = d.getUTCFullYear();
      const startOfYear = Date.UTC(year, 0, 0);
      const dayOfYear = Math.floor((d.getTime() - startOfYear) / (1000 * 60 * 60 * 24));
      return `${year}-W${Math.floor(dayOfYear / 7)}`;
    }
    case "monthly":
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    default:
      return d.toISOString().slice(0, 10);
  }
};

/** Generate every bucket label in [start, end] so charts show a full timeline (UTC). */
const generateBucketKeys = (range, start, end) => {
  const keys = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setUTCHours(23, 59, 59, 999);

  if (range === "weekly") {
    const seen = new Set();
    while (cursor <= endDate) {
      const key = toBucketKey(cursor, "weekly");
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return keys;
  }

  if (range === "monthly") {
    cursor.setUTCDate(1);
    while (cursor <= endDate) {
      keys.push(toBucketKey(cursor, "monthly"));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return keys;
  }

  // daily (default)
  while (cursor <= endDate) {
    keys.push(toBucketKey(cursor, "daily"));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
};

const fillTrendBuckets = (range, start, end, sparseTrends) => {
  const byBucket = new Map(
    (sparseTrends || []).map((t) => [t.bucket, t.casesProcessedCount])
  );

  const generated = generateBucketKeys(range, start, end);
  const filled = generated.map((bucket) => ({
    bucket,
    casesProcessedCount: byBucket.get(bucket) ?? 0,
  }));

  // Safety net: never drop a real data bucket that the generated timeline missed
  // (e.g. rare boundary mismatch). Append any leftovers so counts always show.
  const generatedSet = new Set(generated);
  for (const t of sparseTrends || []) {
    if (!generatedSet.has(t.bucket)) {
      filled.push({ bucket: t.bucket, casesProcessedCount: t.casesProcessedCount });
    }
  }

  return filled;
};

const DashboardService = {
  /**
   * Get summary metrics for the dashboard (all-time / overall — not windowed by range).
   * Metrics:
   * - casesProcessedCount: submissions with status "review" or "completed"
   * - avgProcessingTimeMinutes: median minutes from createdAt to completedAt for completed cases
   * - manualEditsRatePercent: percentage of fields with source.type === "manual"
   * - pendingReviewsCount: submissions with status "review"
   * - completedCasesCount: submissions with status "completed"
   */
  getSummary: async (_range, _startDate, _endDate, workspaceId) => {
    // Summary KPIs are overall totals for the workspace, so no date filtering.
    const submissions = await Submission.find({
      workspace: workspaceId,
    }).lean();

    // Cases processed: status in ["review", "completed"]
    const casesProcessedCount = submissions.filter(
      (s) => s.status === "review" || s.status === "completed"
    ).length;

    // Median processing time: createdAt → completedAt (per case, not aggregated wall time)
    const completedSubmissions = submissions.filter(
      (s) => s.status === "completed"
    );
    let avgProcessingTimeMinutes = 0;
    if (completedSubmissions.length > 0) {
      const durations = completedSubmissions
        .map((s) => {
          const created = new Date(s.createdAt);
          const completed = getCompletionTimestamp(s);
          const diffMinutes = (completed.getTime() - created.getTime()) / (1000 * 60);
          return Math.max(0, diffMinutes);
        })
        .filter((m) => Number.isFinite(m));
      avgProcessingTimeMinutes = median(durations);
    }

    // Manual edits rate: count fields with source.type === "manual"
    let totalFields = 0;
    let manualFields = 0;
    submissions.forEach((s) => {
      if (s.submission_fields && Array.isArray(s.submission_fields)) {
        s.submission_fields.forEach((field) => {
          totalFields++;
          if (field.source && field.source.type === "manual") {
            manualFields++;
          }
        });
      }
    });
    const manualEditsRatePercent =
      totalFields > 0 ? (manualFields / totalFields) * 100 : 0;

    // Pending reviews: status === "review"
    const pendingReviewsCount = submissions.filter(
      (s) => s.status === "review"
    ).length;

    // Completed cases: status === "completed"
    const completedCasesCount = submissions.filter(
      (s) => s.status === "completed"
    ).length;

    return {
      casesProcessedCount,
      avgProcessingTimeMinutes: Math.round(avgProcessingTimeMinutes * 100) / 100, // Round to 2 decimals
      manualEditsRatePercent: Math.round(manualEditsRatePercent * 100) / 100,
      pendingReviewsCount,
      completedCasesCount,
    };
  },

  /**
   * Get trends data: time-series counts of processed cases
   * Returns buckets grouped by range (daily/weekly/monthly)
   */
  getTrends: async (range, startDate, endDate, workspaceId) => {
    const { start, end } = getDateRange(range, startDate, endDate);
    const dateBucketFormat = getDateBucketFormat(range);

    // Aggregate submissions grouped by date bucket
    // Only count processed cases (status in ["review", "completed"])
    const pipeline = [
      {
        $match: {
          workspace: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: start, $lte: end },
          status: { $in: ["review", "completed"] },
        },
      },
      {
        $group: {
          _id: dateBucketFormat,
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          bucket: "$_id",
          casesProcessedCount: "$count",
        },
      },
    ];

    const trends = await Submission.aggregate(pipeline);
    return fillTrendBuckets(range, start, end, trends);
  },

  /**
   * Get validation failures
   * Uses the new validation structure: submission_fields[].validation.errors[]
   * Counts actual validation rule failures from the validation.errors array
   * Returns enhanced data with severity breakdown, sample messages, and affected fields
   */
  getValidationFailures: async (range, startDate, endDate, workspaceId) => {
    const { start, end } = getDateRange(range, startDate, endDate);

    // Get all submissions in range with submission_fields
    // We need submission_fields to access validation.errors
    const submissions = await Submission.find({
      workspace: workspaceId,
      createdAt: { $gte: start, $lte: end },
      "submission_fields": { $exists: true, $ne: [] },
    })
      .select("submission_fields")
      .lean();

    // Enhanced tracking: rule -> { count, severityCounts, sampleMessages, affectedFields }
    const ruleData = {};
    let totalFailures = 0;

    submissions.forEach((submission) => {
      const submissionFields = submission.submission_fields || [];
      
      submissionFields.forEach((field) => {
        // Check if field has validation errors
        if (
          field.validation &&
          field.validation.validated &&
          !field.validation.passed &&
          Array.isArray(field.validation.errors) &&
          field.validation.errors.length > 0
        ) {
          // Process each validation error
          field.validation.errors.forEach((error) => {
            const rule = error.rule || "unknown";
            const severity = error.severity || "error";
            const message = error.message || "";
            
            if (!ruleData[rule]) {
              ruleData[rule] = {
                count: 0,
                severityCounts: { error: 0, warning: 0 },
                sampleMessages: [],
                affectedFields: new Set(),
              };
            }
            
            ruleData[rule].count++;
            ruleData[rule].severityCounts[severity] = (ruleData[rule].severityCounts[severity] || 0) + 1;
            totalFailures++;
            
            // Store sample messages (keep up to 3 unique ones)
            if (message && !ruleData[rule].sampleMessages.includes(message) && ruleData[rule].sampleMessages.length < 3) {
              ruleData[rule].sampleMessages.push(message);
            }
            
            // Track affected field keys
            if (field.key) {
              ruleData[rule].affectedFields.add(field.key);
            }
          });
        }
      });
    });

    // Convert to array format with enhanced data
    const topValidationFailures = Object.entries(ruleData)
      .map(([rule, data]) => ({
        rule,
        count: data.count,
        percentage: totalFailures > 0 ? Math.round((data.count / totalFailures) * 100 * 10) / 10 : 0,
        severityCounts: data.severityCounts,
        sampleMessages: data.sampleMessages,
        affectedFieldsCount: data.affectedFields.size,
        affectedFields: Array.from(data.affectedFields).slice(0, 5), // Top 5 affected fields
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 failures

    return { 
      topValidationFailures,
      totalFailures,
      uniqueRules: topValidationFailures.length,
    };
  },

  /**
   * Get workload metrics
   * Returns pending and completed counts grouped by date buckets
   */
  getWorkload: async (range, startDate, endDate, workspaceId) => {
    const { start, end } = getDateRange(range, startDate, endDate);
    const dateBucketFormat = getDateBucketFormat(range);

    // Aggregate by status and date bucket
    const pipeline = [
      {
        $match: {
          workspace: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            bucket: dateBucketFormat,
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.bucket",
          statuses: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          bucket: "$_id",
          statuses: 1,
        },
      },
    ];

    const workloadBuckets = await Submission.aggregate(pipeline);

    // Calculate totals
    const allSubmissions = await Submission.find({
      workspace: workspaceId,
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const pendingCount = allSubmissions.filter(
      (s) => s.status === "pending" || s.status === "review"
    ).length;
    const completedCount = allSubmissions.filter(
      (s) => s.status === "completed"
    ).length;

    return {
      buckets: workloadBuckets,
      totals: {
        pending: pendingCount,
        completed: completedCount,
      },
    };
  },
};

module.exports = DashboardService;

