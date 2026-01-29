const { Submission, MasterField } = require("../models");
const mongoose = require("mongoose");

/**
 * Helper: Calculate date range based on range type
 * Defaults: daily=last 14 days, weekly=last 12 weeks, monthly=last 12 months
 */
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

const DashboardService = {
  /**
   * Get summary metrics for the dashboard
   * Metrics:
   * - casesProcessedCount: submissions with status "review" or "completed"
   * - avgProcessingTimeMinutes: average time from createdAt to updatedAt for completed submissions
   * - manualEditsRatePercent: percentage of fields with source.type === "manual"
   * - pendingReviewsCount: submissions with status "review"
   * - completedCasesCount: submissions with status "completed"
   */
  getSummary: async (range, startDate, endDate) => {
    const { start, end } = getDateRange(range, startDate, endDate);

    // Get all submissions in the date range
    const submissions = await Submission.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    // Cases processed: status in ["review", "completed"]
    const casesProcessedCount = submissions.filter(
      (s) => s.status === "review" || s.status === "completed"
    ).length;

    // Average processing time: for completed submissions, calculate createdAt to updatedAt
    const completedSubmissions = submissions.filter(
      (s) => s.status === "completed"
    );
    let avgProcessingTimeMinutes = 0;
    if (completedSubmissions.length > 0) {
      const totalMinutes = completedSubmissions.reduce((sum, s) => {
        const created = new Date(s.createdAt);
        const updated = new Date(s.updatedAt);
        const diffMs = updated - created;
        const diffMinutes = diffMs / (1000 * 60);
        return sum + diffMinutes;
      }, 0);
      avgProcessingTimeMinutes = totalMinutes / completedSubmissions.length;
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
  getTrends: async (range, startDate, endDate) => {
    const { start, end } = getDateRange(range, startDate, endDate);
    const dateBucketFormat = getDateBucketFormat(range);

    // Aggregate submissions grouped by date bucket
    // Only count processed cases (status in ["review", "completed"])
    const pipeline = [
      {
        $match: {
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
    return trends;
  },

  /**
   * Get validation failures
   * Maps eligibility.needs_review_keys to validation rules from MasterField
   * Falls back to counting by key if no MasterField or rules exist
   */
  getValidationFailures: async (range, startDate, endDate) => {
    const { start, end } = getDateRange(range, startDate, endDate);

    // Get all submissions in range with needs_review_keys
    const submissions = await Submission.find({
      createdAt: { $gte: start, $lte: end },
      "eligibility.needs_review_keys": { $exists: true, $ne: [] },
    })
      .select("eligibility.needs_review_keys")
      .lean();

    // Get all MasterFields for mapping
    const masterFields = await MasterField.find({}).lean();
    const masterFieldMap = {};
    masterFields.forEach((mf) => {
      masterFieldMap[mf.key] = mf;
    });

    // Count failures by rule
    const ruleCounts = {};

    submissions.forEach((submission) => {
      const needsReviewKeys =
        submission.eligibility?.needs_review_keys || [];
      needsReviewKeys.forEach((key) => {
        const masterField = masterFieldMap[key];
        if (masterField && masterField.validation_rules) {
          // Count by each validation rule
          masterField.validation_rules.forEach((rule) => {
            ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
          });
        } else {
          // Fallback: count by key itself
          ruleCounts[key] = (ruleCounts[key] || 0) + 1;
        }
      });
    });

    // Convert to array and sort by count descending
    const topValidationFailures = Object.entries(ruleCounts)
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count);

    return { topValidationFailures };
  },

  /**
   * Get workload metrics
   * Returns pending and completed counts grouped by date buckets
   */
  getWorkload: async (range, startDate, endDate) => {
    const { start, end } = getDateRange(range, startDate, endDate);
    const dateBucketFormat = getDateBucketFormat(range);

    // Aggregate by status and date bucket
    const pipeline = [
      {
        $match: {
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

