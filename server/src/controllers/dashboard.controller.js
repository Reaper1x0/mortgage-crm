const { R2XX, R4XX } = require("../Responses");
const DashboardService = require("../services/dashboard.service");
const { catchAsync } = require("../utils");

const DashboardController = {
  /**
   * GET /dashboard/summary
   * Returns summary metrics for the dashboard
   */
  getSummary: catchAsync(async (req, res) => {
    const { range, startDate, endDate } = req.query;
    const summary = await DashboardService.getSummary(range, startDate, endDate);
    return R2XX(res, "Summary fetched successfully", 200, { data: summary });
  }),

  /**
   * GET /dashboard/trends
   * Returns time-series trends data
   */
  getTrends: catchAsync(async (req, res) => {
    const { range, startDate, endDate } = req.query;
    const trends = await DashboardService.getTrends(range, startDate, endDate);
    return R2XX(res, "Trends fetched successfully", 200, { data: trends });
  }),

  /**
   * GET /dashboard/validation-failures
   * Returns top validation failures
   */
  getValidationFailures: catchAsync(async (req, res) => {
    const { range, startDate, endDate } = req.query;
    const failures = await DashboardService.getValidationFailures(
      range,
      startDate,
      endDate
    );
    return R2XX(res, "Validation failures fetched successfully", 200, {
      data: failures,
    });
  }),

  /**
   * GET /dashboard/workload
   * Returns workload metrics by date buckets
   */
  getWorkload: catchAsync(async (req, res) => {
    const { range, startDate, endDate } = req.query;
    const workload = await DashboardService.getWorkload(
      range,
      startDate,
      endDate
    );
    return R2XX(res, "Workload fetched successfully", 200, { data: workload });
  }),
};

module.exports = DashboardController;

