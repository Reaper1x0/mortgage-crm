import React, { useState } from "react";
import { useDashboardAnalytics, DashboardRange } from "../../hooks/useDashboardAnalytics";
import PageHeader from "../Reusable/PageHeader";
import Card from "../Reusable/Card";
import Button from "../Reusable/Button";
import LineTrendChart from "../charts/LineTrendChart";
import DonutWorkloadChart from "../charts/DonutWorkloadChart";
import { cn } from "../../utils/cn";

const DashboardAnalytics: React.FC = () => {
  const [range, setRange] = useState<DashboardRange>("daily");
  const { data, loading, error, retry } = useDashboardAnalytics(range);

  // KPI Cards Data
  const kpiCards = [
    {
      title: "Cases Processed",
      value: data.summary?.casesProcessedCount ?? 0,
      loading,
    },
    {
      title: "Avg Processing Time",
      value: data.summary
        ? `${data.summary.avgProcessingTimeMinutes.toFixed(1)} min`
        : "0 min",
      loading,
    },
    {
      title: "Manual Edit Rate",
      value: data.summary
        ? `${data.summary.manualEditsRatePercent.toFixed(1)}%`
        : "0%",
      loading,
    },
    {
      title: "Pending Reviews",
      value: data.summary?.pendingReviewsCount ?? 0,
      loading,
    },
    {
      title: "Completed",
      value: data.summary?.completedCasesCount ?? 0,
      loading,
    },
  ];

  // Prepare trends data for chart
  const trendsData = data.trends.map((t) => ({
    bucket: t.bucket,
    casesProcessedCount: t.casesProcessedCount,
  }));

  // Prepare workload data for donut chart
  // Don't pass colors - let the chart component handle color mapping based on names
  const workloadData = data.workload
    ? [
        {
          name: "Pending",
          value: data.workload.totals.pending,
        },
        {
          name: "Completed",
          value: data.workload.totals.completed,
        },
      ].filter((d) => d.value > 0)
    : [];

  // Prepare validation failures for table
  const validationFailures = data.validationFailures?.topValidationFailures || [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard Analytics"
        description="View analytics and metrics for submissions and processing"
        right={
          <div className="flex gap-2">
            <Button
              variant={range === "daily" ? "primary" : "secondary"}
              onClick={() => setRange("daily")}
              className="text-xs"
            >
              Daily
            </Button>
            <Button
              variant={range === "weekly" ? "primary" : "secondary"}
              onClick={() => setRange("weekly")}
              className="text-xs"
            >
              Weekly
            </Button>
            <Button
              variant={range === "monthly" ? "primary" : "secondary"}
              onClick={() => setRange("monthly")}
              className="text-xs"
            >
              Monthly
            </Button>
          </div>
        }
      />

      {error && (
        <Card>
          <div className="p-4 text-danger">
            <p>Error loading dashboard data: {error.message}</p>
            <Button onClick={retry} variant="primary" className="mt-2">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index}>
            <div className="p-4">
              <div className="text-sm text-text-secondary mb-1">{kpi.title}</div>
              {loading ? (
                <div className="h-8 w-20 bg-card-border animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold text-text">{kpi.value}</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Trends Chart */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text mb-4">Cases Processed Trends</h3>
          <LineTrendChart data={trendsData} loading={loading} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Validation Failures */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-text mb-4">
              Top Validation Failures
            </h3>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-text-secondary">Loading...</div>
              </div>
            ) : validationFailures.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-text-secondary">No validation failures</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-card-border">
                        <th className="text-left py-2 px-3 text-sm font-semibold text-text">
                          Rule
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-semibold text-text">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationFailures.map((failure, index) => (
                        <tr
                          key={index}
                          className="border-b border-card-border hover:bg-card-hover"
                        >
                          <td className="py-2 px-3 text-sm text-text-secondary">
                            {failure.rule}
                          </td>
                          <td className="py-2 px-3 text-sm text-text text-right">
                            {failure.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Workload Chart */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-text mb-4">Workload Distribution</h3>
            <DonutWorkloadChart data={workloadData} loading={loading} />
            {!loading && data.workload && (
              <div className="mt-4 flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-text">
                    {data.workload.totals.pending}
                  </div>
                  <div className="text-sm text-text-secondary">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text">
                    {data.workload.totals.completed}
                  </div>
                  <div className="text-sm text-text-secondary">Completed</div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardAnalytics;

