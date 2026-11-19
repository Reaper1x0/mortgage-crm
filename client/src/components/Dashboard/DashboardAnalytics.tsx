import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  useDashboardSummary,
  useDashboardTrends,
  useDashboardValidationFailures,
  useDashboardWorkload,
} from "../../hooks/useDashboardAnalytics";
import { DashboardRange } from "../../service/dashboardService";
import { AuditTrailService, AuditLog } from "../../service/auditTrailService";
import { usePermissions } from "../../context/PermissionContext";
import PageHeader from "../Reusable/PageHeader";
import Card from "../Reusable/Card";
import LineTrendChart from "../charts/LineTrendChart";
import DonutWorkloadChart from "../charts/DonutWorkloadChart";
import StatusBadge from "../Reusable/StatusBadge";
import Avatar from "../Reusable/Avatar";
import CardRangeToggle from "./CardRangeToggle";
import { formatProcessingTime } from "../../utils/formatDuration";
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiInfo,
  FiLayers,
} from "react-icons/fi";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { timeAgo } from "../../utils/date";
import { getAuditActionInfo } from "../../utils/auditAction";
import { buildWorkspacePath } from "../../utils/tenantRouting";
import { cn } from "../../utils/cn";

type MetricCardProps = {
  title: string;
  subtitle?: string;
  loading: boolean;
  value: React.ReactNode;
  icon: React.ReactNode;
  iconClassName?: string;
};

function DashboardMetricCard({
  title,
  subtitle,
  loading,
  value,
  icon,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card containerClassName="h-full" className="!flex h-full flex-col !p-5">
      <div className="flex items-center gap-2.5">
        <div className={cn("shrink-0 [&_svg]:h-6 [&_svg]:w-6", iconClassName)}>{icon}</div>
        <div className="min-w-0 text-sm font-medium leading-snug text-card-text">{title}</div>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-card-border" />
      ) : (
        <div className="mt-3 text-3xl font-semibold tracking-tight text-text tabular-nums">{value}</div>
      )}
      <div className="mt-1.5 text-xs leading-relaxed text-card-text">{subtitle || "\u00a0"}</div>
    </Card>
  );
}

type ChartCardProps = {
  title: string;
  subtitle?: string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  children: React.ReactNode;
};

function DashboardChartCard({
  title,
  subtitle,
  range,
  onRangeChange,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[20px] font-semibold text-text">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-card-text sm:text-sm">{subtitle}</p> : null}
          </div>
          <CardRangeToggle value={range} onChange={onRangeChange} />
        </div>
        <div className="min-h-[280px] min-w-0">{children}</div>
      </div>
    </Card>
  );
}

const RECENT_ACTIVITY_LIMIT = 5;

const DashboardAnalytics: React.FC = () => {
  const { organizationId = "", workspaceId = "" } = useParams();
  const { canWorkspace, effective } = usePermissions();
  const canViewActivity = canWorkspace("workspace.audit.read") || effective?.isOrgOwner === true;
  const activityPath =
    organizationId && workspaceId
      ? buildWorkspacePath(organizationId, workspaceId, "activity")
      : "";

  const [trendsRange, setTrendsRange] = useState<DashboardRange>("daily");
  const [workloadRange, setWorkloadRange] = useState<DashboardRange>("daily");
  const [failuresRange, setFailuresRange] = useState<DashboardRange>("daily");

  const summary = useDashboardSummary();
  const trendsQuery = useDashboardTrends(trendsRange);
  const workloadQuery = useDashboardWorkload(workloadRange);
  const failuresQuery = useDashboardValidationFailures(failuresRange);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  const workloadData = workloadQuery.data
    ? [
        { name: "Pending", value: workloadQuery.data.totals.pending },
        { name: "Completed", value: workloadQuery.data.totals.completed },
      ].filter((d) => d.value > 0)
    : [];

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setAuditLogsLoading(true);
      try {
        const response = await AuditTrailService.getRecentAuditLogs({
          limit: RECENT_ACTIVITY_LIMIT,
          page: 1,
        });
        const logs = response.audit_logs || [];
        setAuditLogs(logs.slice(0, RECENT_ACTIVITY_LIMIT));
        setAuditTotal(response.pagination?.total ?? logs.length);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      } finally {
        setAuditLogsLoading(false);
      }
    };
    void fetchAuditLogs();
  }, []);

  const completedCount = summary.data?.completedCasesCount ?? 0;
  const showSeeMore = !auditLogsLoading && canViewActivity && !!activityPath && auditTotal > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Analytics"
        description="View analytics and metrics for submissions and processing"
      />

      {/* KPI cards — overall (all-time) totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <DashboardMetricCard
          title="Pending Reviews"
          subtitle="Awaiting review"
          loading={summary.loading}
          value={summary.data?.pendingReviewsCount ?? 0}
          icon={<FiClock className="h-4 w-4" aria-hidden />}
          iconClassName="text-warning"
        />
        <DashboardMetricCard
          title="Cases Processed"
          subtitle="In review or completed"
          loading={summary.loading}
          value={summary.data?.casesProcessedCount ?? 0}
          icon={<FiLayers className="h-4 w-4" aria-hidden />}
          iconClassName="text-primary"
        />
        <DashboardMetricCard
          title="Completed"
          subtitle="Fully completed cases"
          loading={summary.loading}
          value={summary.data?.completedCasesCount ?? 0}
          icon={<FiCheckCircle className="h-4 w-4" aria-hidden />}
          iconClassName="text-success"
        />
        <DashboardMetricCard
          title="Typical Processing Time"
          subtitle={
            completedCount > 0
              ? `Median per case · ${completedCount} completed`
              : "No completed cases yet"
          }
          loading={summary.loading}
          value={formatProcessingTime(summary.data?.avgProcessingTimeMinutes)}
          icon={<FiActivity className="h-4 w-4" aria-hidden />}
          iconClassName="text-primary"
        />
        <DashboardMetricCard
          title="Manual Edit Rate"
          subtitle="% of fields edited manually"
          loading={summary.loading}
          value={
            summary.data ? `${summary.data.manualEditsRatePercent.toFixed(1)}%` : "0%"
          }
          icon={<FiEdit3 className="h-4 w-4" aria-hidden />}
          iconClassName="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-2">
        <DashboardChartCard
          title="Cases Processed Trends"
          subtitle="Volume over time"
          range={trendsRange}
          onRangeChange={setTrendsRange}
        >
          <LineTrendChart
            data={trendsQuery.data ?? []}
            loading={trendsQuery.loading}
            range={trendsRange}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Workload Distribution"
          subtitle="Pending vs completed in range"
          range={workloadRange}
          onRangeChange={setWorkloadRange}
        >
          <DonutWorkloadChart data={workloadData} loading={workloadQuery.loading} />
        </DashboardChartCard>
      </div>

      <Card containerClassName="h-full">
        <div className="flex h-full flex-col p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-text sm:text-lg">
                Top Validation Failures
              </h3>
              {!failuresQuery.loading && failuresQuery.data ? (
                <div className="mt-0.5 text-xs text-text-secondary sm:text-sm">
                  {failuresQuery.data.totalFailures} failures ·{" "}
                  {failuresQuery.data.uniqueRules} rules
                </div>
              ) : null}
            </div>
            <CardRangeToggle value={failuresRange} onChange={setFailuresRange} />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {failuresQuery.loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-lg border border-card-border bg-card p-2 sm:p-3"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="h-5 w-16 rounded bg-card-border sm:h-6 sm:w-20" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 h-3 w-3/4 rounded bg-card-border sm:h-4" />
                        <div className="h-2 w-1/2 rounded bg-card-border sm:h-3" />
                      </div>
                      <div className="h-5 w-12 rounded bg-card-border sm:h-6 sm:w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (failuresQuery.data?.topValidationFailures || []).length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center">
                <FiInfo className="mb-2 h-10 w-10 text-text-secondary sm:h-12 sm:w-12" />
                <div className="text-sm text-text-secondary sm:text-base">
                  No validation failures in this period
                </div>
              </div>
            ) : (
              <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1 sm:max-h-[600px]">
                {(failuresQuery.data?.topValidationFailures || [])
                  .slice(0, 10)
                  .map((failure, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-card-border p-2 transition hover:bg-card-hover sm:p-3"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex min-w-[70px] flex-shrink-0 flex-col items-start gap-1 sm:min-w-[90px]">
                          {failure.severityCounts.error > 0 && (
                            <StatusBadge tone="danger" className="text-xs">
                              <FiAlertCircle className="mr-1 h-3 w-3" />
                              {failure.severityCounts.error}
                            </StatusBadge>
                          )}
                          {failure.severityCounts.warning > 0 && (
                            <StatusBadge tone="warning" className="text-xs">
                              <FiAlertTriangle className="mr-1 h-3 w-3" />
                              {failure.severityCounts.warning}
                            </StatusBadge>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-xs font-medium text-text sm:text-sm"
                            title={failure.rule}
                          >
                            {failure.rule}
                          </div>
                          {failure.sampleMessages.length > 0 && (
                            <div className="mt-0.5 truncate text-xs italic text-text-secondary">
                              {failure.sampleMessages[0]}
                            </div>
                          )}
                          {failure.affectedFieldsCount > 0 && (
                            <div className="mt-1 text-xs text-text-secondary">
                              {failure.affectedFieldsCount} field
                              {failure.affectedFieldsCount !== 1 ? "s" : ""} affected
                            </div>
                          )}
                        </div>

                        <div className="min-w-[60px] flex-shrink-0 text-right sm:min-w-[80px]">
                          <div className="text-xs font-bold text-text sm:text-sm">
                            {failure.count}
                          </div>
                          <div className="text-xs text-text-secondary">{failure.percentage}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <h3 className="text-base font-semibold text-text sm:text-lg">Recent Activity</h3>
            {showSeeMore ? (
              <Link
                to={activityPath}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                See more
              </Link>
            ) : null}
          </div>
          {auditLogsLoading ? (
            <div className="space-y-2 sm:space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-card-border bg-card p-2 sm:p-3"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-card-border sm:h-10 sm:w-10" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 h-3 w-3/4 rounded bg-card-border sm:h-4" />
                      <div className="h-2 w-1/2 rounded bg-card-border sm:h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center sm:h-64">
              <FiInfo className="mb-2 h-10 w-10 text-text-secondary sm:h-12 sm:w-12" />
              <div className="text-sm text-text-secondary sm:text-base">No recent activity</div>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {auditLogs.slice(0, RECENT_ACTIVITY_LIMIT).map((log) => {
                const actionInfo = getAuditActionInfo(log.action);
                const ActionIcon = actionInfo.Icon;
                const user = log.user_id;
                const submission =
                  typeof log.submission_id === "object" ? log.submission_id : null;
                const userName =
                  user?.fullName ||
                  user?.username ||
                  log.user_name ||
                  log.user_email ||
                  "Unknown";

                return (
                  <div
                    key={log._id}
                    className="rounded-lg border border-card-border p-2 transition hover:bg-card-hover sm:p-3"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0">
                        <Avatar user={normalizeUserForAvatar(user)} size="sm" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="text-xs font-semibold text-text sm:text-sm">
                            {userName}
                          </span>
                          <span className={`flex items-center gap-1 ${actionInfo.color}`}>
                            <ActionIcon className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">{actionInfo.label}</span>
                          </span>
                        </div>

                        <div className="mt-1 space-y-0.5 text-xs text-card-text">
                          {log.document_name && (
                            <div className="truncate">
                              <span className="font-medium">Document:</span> {log.document_name}
                            </div>
                          )}
                          {log.field_key && (
                            <div className="truncate">
                              <span className="font-medium">Field:</span> {log.field_key}
                            </div>
                          )}
                          {submission && (
                            <div className="truncate">
                              <span className="font-medium">Submission:</span>{" "}
                              {submission.submission_name || submission.legal_name || "N/A"}
                            </div>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-card-text">{timeAgo(log.timestamp)}</div>
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
