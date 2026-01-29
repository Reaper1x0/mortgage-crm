import React, { useState } from "react";
import { useDashboardAnalytics } from "../../hooks/useDashboardAnalytics";
import { DashboardRange } from "../../service/dashboardService";
import PageHeader from "../Reusable/PageHeader";
import Card from "../Reusable/Card";
import Button from "../Reusable/Button";
import LineTrendChart from "../charts/LineTrendChart";
import DonutWorkloadChart from "../charts/DonutWorkloadChart";
import StatusBadge from "../Reusable/StatusBadge";
import { FiAlertCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";

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
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-text">
                Top Validation Failures
              </h3>
              {!loading && data.validationFailures && (
                <div className="text-sm text-text-secondary mt-1">
                  {data.validationFailures.totalFailures} failures • {data.validationFailures.uniqueRules} rules
                </div>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-card-border bg-card animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-6 bg-card-border rounded w-20" />
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-card-border rounded w-3/4 mb-2" />
                        <div className="h-3 bg-card-border rounded w-1/2" />
                      </div>
                      <div className="h-6 bg-card-border rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (data.validationFailures?.topValidationFailures || []).length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <FiInfo className="h-12 w-12 text-text-secondary mb-2" />
                <div className="text-text-secondary">No validation failures</div>
              </div>
            ) : (
              <div className="space-y-2">
                {(data.validationFailures?.topValidationFailures || [])
                  .slice(0, 10)
                  .map((failure, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-card-border hover:bg-card-hover transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Severity badges */}
                        <div className="flex flex-col gap-1 items-start min-w-[90px]">
                          {failure.severityCounts.error > 0 && (
                            <StatusBadge tone="danger" className="text-xs">
                              <FiAlertCircle className="h-3 w-3 mr-1" />
                              {failure.severityCounts.error}
                            </StatusBadge>
                          )}
                          {failure.severityCounts.warning > 0 && (
                            <StatusBadge tone="warning" className="text-xs">
                              <FiAlertTriangle className="h-3 w-3 mr-1" />
                              {failure.severityCounts.warning}
                            </StatusBadge>
                          )}
                        </div>

                        {/* Middle: Rule + optional message */}
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium text-text truncate"
                            title={failure.rule}
                          >
                            {failure.rule}
                          </div>
                          {failure.sampleMessages.length > 0 && (
                            <div className="text-xs text-text-secondary italic truncate mt-0.5">
                              {failure.sampleMessages[0]}
                            </div>
                          )}
                          {failure.affectedFieldsCount > 0 && (
                            <div className="text-xs text-text-secondary mt-1">
                              {failure.affectedFieldsCount} field{failure.affectedFieldsCount !== 1 ? "s" : ""} affected
                            </div>
                          )}
                        </div>

                        {/* Right: Count + % */}
                        <div className="text-right min-w-[80px]">
                          <div className="text-sm font-bold text-text">
                            {failure.count}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {failure.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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

