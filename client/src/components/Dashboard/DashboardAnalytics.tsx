import React, { useState, useEffect } from "react";
import { useDashboardAnalytics } from "../../hooks/useDashboardAnalytics";
import { DashboardRange } from "../../service/dashboardService";
import { AuditTrailService, AuditLog } from "../../service/auditTrailService";
import PageHeader from "../Reusable/PageHeader";
import Card from "../Reusable/Card";
import Button from "../Reusable/Button";
import LineTrendChart from "../charts/LineTrendChart";
import DonutWorkloadChart from "../charts/DonutWorkloadChart";
import StatusBadge from "../Reusable/StatusBadge";
import Avatar from "../Reusable/Avatar";
import { FiAlertCircle, FiAlertTriangle, FiInfo, FiFile, FiEdit, FiCheck, FiUpload, FiDownload } from "react-icons/fi";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { timeAgo } from "../../utils/date";
import { BACKEND_URL } from "../../constants/env.constants";

const DashboardAnalytics: React.FC = () => {
  const [range, setRange] = useState<DashboardRange>("daily");
  const { data, loading, error, retry } = useDashboardAnalytics(range);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

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

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      setAuditLogsLoading(true);
      try {
        const response = await AuditTrailService.getRecentAuditLogs({ limit: 20 });
        setAuditLogs(response.audit_logs || []);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      } finally {
        setAuditLogsLoading(false);
      }
    };
    fetchAuditLogs();
  }, []);

  // Get action icon and label
  const getActionInfo = (action: string) => {
    const actionMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      document_uploaded: { icon: <FiUpload className="h-4 w-4" />, label: "Uploaded Document", color: "text-primary" },
      document_replaced: { icon: <FiFile className="h-4 w-4" />, label: "Replaced Document", color: "text-warning" },
      document_deleted: { icon: <FiFile className="h-4 w-4" />, label: "Deleted Document", color: "text-danger" },
      field_extracted: { icon: <FiFile className="h-4 w-4" />, label: "Extracted Field", color: "text-primary" },
      field_edited: { icon: <FiEdit className="h-4 w-4" />, label: "Edited Field", color: "text-warning" },
      field_reviewed: { icon: <FiCheck className="h-4 w-4" />, label: "Reviewed Field", color: "text-success" },
      field_approved: { icon: <FiCheck className="h-4 w-4" />, label: "Approved Field", color: "text-success" },
      master_field_created: { icon: <FiFile className="h-4 w-4" />, label: "Created Master Field", color: "text-primary" },
      master_field_updated: { icon: <FiEdit className="h-4 w-4" />, label: "Updated Master Field", color: "text-warning" },
      master_field_deleted: { icon: <FiFile className="h-4 w-4" />, label: "Deleted Master Field", color: "text-danger" },
      submission_created: { icon: <FiFile className="h-4 w-4" />, label: "Created Submission", color: "text-primary" },
      submission_updated: { icon: <FiEdit className="h-4 w-4" />, label: "Updated Submission", color: "text-warning" },
      submission_completed: { icon: <FiCheck className="h-4 w-4" />, label: "Completed Submission", color: "text-success" },
      template_created: { icon: <FiFile className="h-4 w-4" />, label: "Created Template", color: "text-primary" },
      template_updated: { icon: <FiEdit className="h-4 w-4" />, label: "Updated Template", color: "text-warning" },
      document_generated: { icon: <FiDownload className="h-4 w-4" />, label: "Generated Document", color: "text-primary" },
      document_downloaded: { icon: <FiDownload className="h-4 w-4" />, label: "Downloaded Document", color: "text-primary" },
    };
    return actionMap[action] || { icon: <FiFile className="h-4 w-4" />, label: action, color: "text-text" };
  };


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

      {/* Recent Activity / Audit Logs */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text mb-4">Recent Activity</h3>
          {auditLogsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-card-border bg-card animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-card-border rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-card-border rounded w-3/4 mb-2" />
                      <div className="h-3 bg-card-border rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <FiInfo className="h-12 w-12 text-text-secondary mb-2" />
              <div className="text-text-secondary">No recent activity</div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {auditLogs.map((log) => {
                const actionInfo = getActionInfo(log.action);
                const user = log.user_id;
                const submission = typeof log.submission_id === "object" ? log.submission_id : null;
                const userName = user?.fullName || user?.username || log.user_name || log.user_email || "Unknown";
                
                return (
                  <div
                    key={log._id}
                    className="p-3 rounded-lg border border-card-border hover:bg-card-hover transition"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <Avatar
                          user={normalizeUserForAvatar(user, BACKEND_URL)}
                          size="sm"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-text">{userName}</span>
                          <span className={`flex items-center gap-1 ${actionInfo.color}`}>
                            {actionInfo.icon}
                            <span className="text-sm">{actionInfo.label}</span>
                          </span>
                        </div>
                        
                        {/* Additional context */}
                        <div className="mt-1 text-xs text-card-text space-y-0.5">
                          {log.document_name && (
                            <div>
                              <span className="font-medium">Document:</span> {log.document_name}
                            </div>
                          )}
                          {log.field_key && (
                            <div>
                              <span className="font-medium">Field:</span> {log.field_key}
                            </div>
                          )}
                          {submission && (
                            <div>
                              <span className="font-medium">Submission:</span> {submission.submission_name || submission.legal_name || "N/A"}
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="mt-1 text-xs text-card-text">
                          {timeAgo(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DashboardAnalytics;

