import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import ChartPanel from "../Reusable/ChartPanel";
import BarChartSimple from "../charts/BarChartSimple";
import LineTrendChart from "../charts/LineTrendChart";
import DonutWorkloadChart from "../charts/DonutWorkloadChart";
import { SuperAdminService } from "../../service/superAdminService";
import {
  FiCheckCircle,
  FiCreditCard,
  FiGrid,
  FiLayers,
  FiShield,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof SuperAdminService.getDashboard>> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await SuperAdminService.getDashboard();
      setData(res);
    } catch (e: unknown) {
      setError("Could not load dashboard. Try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;
  const getMetric = (value: number | string | undefined) => {
    if (loading) return "…";
    if (!data || error) return "-";
    return value ?? "-";
  };
  const verifiedPct =
    s && s.totalUsers > 0 ? Math.round((s.verifiedUsers / s.totalUsers) * 1000) / 10 : 0;
  const formatMoney = (value = 0, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const lineData = useMemo(() => {
    if (!data?.signupsLast14Days?.length) return [];
    return data.signupsLast14Days.map((d) => {
      const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return { bucket: label, casesProcessedCount: d.count };
    });
  }, [data?.signupsLast14Days]);

  const systemRoleBar = useMemo(() => {
    const palette = [
      "var(--color-primary)",
      "var(--color-info)",
      "var(--color-accent)",
      "var(--color-success)",
    ];
    const rows = data?.systemRoleBreakdown || [];
    return rows.map((r, idx) => {
      const key = String(r.role || "unknown");
      const name =
        key === "superAdmin" ? "Super admin" : key === "user" ? "User" : key.replace(/_/g, " ");
      return {
        name,
        value: Number(r.count || 0),
        color: palette[idx % palette.length],
      };
    });
  }, [data?.systemRoleBreakdown]);

  const subscriptionDonut = useMemo(() => {
    const order = ["active", "trialing", "past_due", "incomplete", "canceled", "unpaid", "paused"];
    const colors: Record<string, string> = {
      active: "var(--color-success)",
      trialing: "var(--color-info)",
      past_due: "var(--color-warning)",
      incomplete: "var(--color-danger)",
      canceled: "var(--color-card-text)",
      unpaid: "var(--color-danger)",
      paused: "var(--color-accent)",
    };
    const countMap = new Map((data?.subscriptionStatusBreakdown || []).map((s) => [s.status, s.count]));
    return order
      .map((status) => ({
        name: status.replace(/_/g, " "),
        value: Number(countMap.get(status) || 0),
        color: colors[status],
      }))
      .filter((d) => d.value > 0);
  }, [data?.subscriptionStatusBreakdown]);

  const revenueByPlanBar = useMemo(() => {
    const planColors = [
      "var(--color-primary)",
      "var(--color-info)",
      "var(--color-accent)",
      "var(--color-success)",
      "var(--color-warning)",
      "var(--color-danger)",
    ];
    return (data?.estimatedRevenue?.byPlan || []).map((plan, idx) => ({
      name: plan.name,
      value: Number(plan.mrr || 0),
      color: planColors[idx % planColors.length],
    }));
  }, [data?.estimatedRevenue?.byPlan]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description="System-wide overview: users, organizations, workspaces, and recent signups."
      />

      {error ? (
        <div className="rounded-2xl border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total users"
          subtitle={data && !error ? `${s?.superAdminUsers ?? 0} super admin(s)` : "All accounts"}
          loading={loading}
          value={getMetric(s?.totalUsers)}
          icon={<FiUsers className="h-4 w-4" aria-hidden />}
          iconClassName="text-primary"
        />
        <StatCard
          title="Organizations"
          subtitle="Tenant organizations"
          loading={loading}
          value={getMetric(s?.totalOrganizations)}
          icon={<FiLayers className="h-4 w-4" aria-hidden />}
          iconClassName="text-info"
        />
        <StatCard
          title="Workspaces"
          subtitle="Across all orgs"
          loading={loading}
          value={getMetric(s?.totalWorkspaces)}
          icon={<FiGrid className="h-4 w-4" aria-hidden />}
          iconClassName="text-accent"
        />
        <StatCard
          title="Verified email"
          subtitle={s ? `${s.unverifiedUsers} not verified` : "Email verification"}
          loading={loading}
          value={getMetric(s ? `${s.verifiedUsers} (${verifiedPct}%)` : undefined)}
          icon={<FiUserCheck className="h-4 w-4" aria-hidden />}
          iconClassName="text-success"
        />
        <StatCard
          title="Workspace seats"
          subtitle={s ? `~${s.avgWorkspacesPerUser} per user avg` : "Membership seats"}
          loading={loading}
          value={getMetric(s?.workspaceMemberships)}
          icon={<FiCheckCircle className="h-4 w-4" aria-hidden />}
          iconClassName="text-primary"
        />
        <StatCard
          title="Org memberships"
          subtitle={s ? `~${s.avgOrgsPerUser} per user avg` : "Org memberships"}
          loading={loading}
          value={getMetric(s?.organizationMemberships)}
          icon={<FiShield className="h-4 w-4" aria-hidden />}
          iconClassName="text-warning"
        />
        <StatCard
          title="Estimated MRR"
          subtitle={
            data?.estimatedRevenue?.estimateAvailable
              ? `From ${data?.estimatedRevenue?.estimatedFromSubscriptions || 0} billable subscription(s)`
              : "Revenue estimate unavailable"
          }
          loading={loading}
          value={getMetric(formatMoney(data?.estimatedRevenue?.mrr, data?.estimatedRevenue?.currency))}
          icon={<FiCreditCard className="h-4 w-4" aria-hidden />}
          iconClassName="text-success"
        />
        <StatCard
          title="Estimated ARR"
          subtitle="Projected annual recurring revenue"
          loading={loading}
          value={getMetric(formatMoney(data?.estimatedRevenue?.arr, data?.estimatedRevenue?.currency))}
          icon={<FiTrendingUp className="h-4 w-4" aria-hidden />}
          iconClassName="text-info"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-2">
        <ChartPanel
          title="New user registrations"
          description="Count of new accounts per day (last 14 days)"
        >
          <LineTrendChart data={lineData} loading={loading} />
        </ChartPanel>

        <ChartPanel
          title="System account roles"
          description="Accounts by built-in system role"
        >
          <BarChartSimple data={systemRoleBar} loading={loading} color="primary" />
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-2">
        <ChartPanel
          title="Subscription status"
          description="Portfolio health across subscription states"
        >
          <DonutWorkloadChart data={subscriptionDonut} loading={loading} />
        </ChartPanel>

        <ChartPanel
          title="Estimated MRR by plan"
          description="Plan-level contribution to monthly recurring revenue"
        >
          <BarChartSimple data={revenueByPlanBar} loading={loading} color="primary" />
        </ChartPanel>
      </div>
    </div>
  );
}
