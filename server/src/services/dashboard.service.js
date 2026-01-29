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
   * Uses the new validation structure: submission_fields[].validation.errors[]
   * Counts actual validation rule failures from the validation.errors array
   * Returns enhanced data with severity breakdown, sample messages, and affected fields
   */
  getValidationFailures: async (range, startDate, endDate) => {
    const { start, end } = getDateRange(range, startDate, endDate);

    // Get all submissions in range with submission_fields
    // We need submission_fields to access validation.errors
    const submissions = await Submission.find({
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

