import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  const lineData = useMemo(() => {
    if (!data?.signupsLast14Days?.length) return [];
    return data.signupsLast14Days.map((d) => {
      const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return { bucket: label, casesProcessedCount: d.count };
    });
  }, [data?.signupsLast14Days]);

  const workspaceBar = useMemo(() => {
    if (!data?.workspaceRoleBreakdown?.length) return [];
    return [...data.workspaceRoleBreakdown]
      .sort((a, b) => b.count - a.count)
      .map((r) => ({ name: r.role, value: r.count }));
  }, [data?.workspaceRoleBreakdown]);

  const orgDonut = useMemo(() => {
    if (!data?.organizationRoleBreakdown?.length) return [];
    return data.organizationRoleBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({ name: r.role, value: r.count }));
  }, [data?.organizationRoleBreakdown]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description="System-wide overview: users, organizations, workspaces, and recent signups."
      />

      {error ? (
        <div className="rounded-2xl border border-danger-border bg-danger/10 px-4 py-3 text-sm text-danger-text">
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
          title="Workspace roles"
          description="Members by workspace role (Admin, Agent, Viewer)."
          bodyClassName="!px-0 !py-0"
        >
          <div className="-mx-2">
            <BarChartSimple data={workspaceBar} loading={loading} color="primary" />
          </div>
        </ChartPanel>
        <ChartPanel
          title="Organization roles"
          description="Members by organization role (Owner, Admin, Member, Viewer)."
          bodyClassName="!px-0 !py-0"
        >
          <div className="-mx-2 min-h-[320px]">
            <DonutWorkloadChart data={orgDonut} loading={loading} />
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}
