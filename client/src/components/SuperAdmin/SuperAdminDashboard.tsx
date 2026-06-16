import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../Reusable/PageHeader";
import StatCard from "../Reusable/StatCard";
import ChartPanel from "../Reusable/ChartPanel";
import BarChartSimple from "../charts/BarChartSimple";
import LineTrendChart from "../charts/LineTrendChart";
import DonutWorkloadChart from "../charts/DonutWorkloadChart";
import { SuperAdminService } from "../../service/superAdminService";
import { FiGrid, FiLayers, FiList, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";

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
      const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return { bucket: label, casesProcessedCount: d.count };
    });
  }, [data?.signupsLast14Days]);

  const systemRoleBar = useMemo(() => {
    const palette = ["var(--color-primary)", "var(--color-info)", "var(--color-accent)", "var(--color-success)"];
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
    return order.map((status) => ({
      name: status.replace(/_/g, " "),
      value: Number(countMap.get(status) || 0),
      color: colors[status],
    }));
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total users"
          value={getMetric(s?.totalUsers)}
          hint={data && !error ? `${s?.superAdminUsers ?? 0} super admin(s)` : undefined}
          loading={loading}
          icon={<FiUsers className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          title="Organizations"
          value={getMetric(s?.totalOrganizations)}
          hint="Tenant organizations"
          loading={loading}
          icon={<FiLayers className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          title="Workspaces"
          value={getMetric(s?.totalWorkspaces)}
          hint="Across all orgs"
          loading={loading}
          icon={<FiGrid className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          title="Verified email"
          value={getMetric(s ? `${s.verifiedUsers} (${verifiedPct}%)` : undefined)}
          hint={s ? `${s.unverifiedUsers} not verified` : undefined}
          loading={loading}
          icon={<FiUserCheck className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          title="Workspace seats"
          value={getMetric(s?.workspaceMemberships)}
          hint={s ? `~${s.avgWorkspacesPerUser} per user avg` : undefined}
          loading={loading}
          icon={<FiList className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          title="Org memberships"
          value={getMetric(s?.organizationMemberships)}
          hint={s ? `~${s.avgOrgsPerUser} per user avg` : undefined}
          loading={loading}
          icon={<FiShield className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          title="Estimated MRR"
          value={getMetric(formatMoney(data?.estimatedRevenue?.mrr, data?.estimatedRevenue?.currency))}
          hint={
            data?.estimatedRevenue?.estimateAvailable
              ? `From ${data?.estimatedRevenue?.estimatedFromSubscriptions || 0} billable subscription(s)`
              : "Revenue estimate unavailable (Stripe not configured)"
          }
          loading={loading}
          icon={<FiList className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          title="Estimated ARR"
          value={getMetric(formatMoney(data?.estimatedRevenue?.arr, data?.estimatedRevenue?.currency))}
          hint="Projected annual recurring revenue"
          loading={loading}
          icon={<FiGrid className="h-5 w-5" aria-hidden />}
        />
      </div>

      <ChartPanel
        title="New user registrations"
        description="Count of new accounts per day (last 14 days)."
        bodyClassName="!px-0 !py-0"
      >
        <div className="-mx-2">
          <LineTrendChart data={lineData} loading={loading} />
        </div>
      </ChartPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel
          title="System account roles"
          description="Accounts by built-in system role (super admin vs user). Tenant RBAC is not shown here."
          bodyClassName="!px-0 !py-0"
        >
          <div className="-mx-2 min-h-[280px]">
            <BarChartSimple data={systemRoleBar} loading={loading} color="primary" />
          </div>
        </ChartPanel>
        <ChartPanel
          title="Subscription status distribution"
          description="Portfolio health across active, trialing, due, incomplete, and canceled states."
          bodyClassName="!px-0 !py-0"
        >
          <div className="-mx-2 min-h-[320px]">
            <DonutWorkloadChart data={subscriptionDonut} loading={loading} />
          </div>
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ChartPanel
          title="Estimated MRR by plan"
          description="Plan-level contribution to monthly recurring revenue estimate."
          bodyClassName="!px-0 !py-0"
        >
          <div className="-mx-2 min-h-[320px]">
            <BarChartSimple data={revenueByPlanBar} loading={loading} color="primary" />
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}
