import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users2, Box, AlertTriangle, ShieldAlert, Gauge, Wrench, PackageX, Ban, Lock, MapPin, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { PageHeader } from "@/components/common/PageHeader";
import { PlanStatusBadge } from "@/components/common/StatusBadge";
import { DashboardCard, IconTile, Meter, MiniStat, SegmentedControl, StatTile, ViewAllLink } from "@/components/common/DashboardCard";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { planStatusVizColor } from "@/lib/status";
import { useFleetStatsQuery, useAlertsQuery, useFleetAnalyticsQuery, useLoginRiskQuery, useOrgsQuery } from "./api";
import type { RiskFilter } from "./riskFilters";

type GrowthSeries = "orgs" | "assets";
const ORG_ROWS = 5;

function CardSpinner() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center">
      <BrandedLoader size="sm" />
    </div>
  );
}

function monthLabels(month: string): { short: string; long: string } {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return {
    short: date.toLocaleDateString(undefined, { month: "short" }),
    long: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

interface RiskTileProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  tone: "critical" | "warning";
  /** Drill-down this tile opens on the organizations list. */
  filter: RiskFilter;
}

/**
 * Every tile is a link into the organizations list filtered to the orgs behind its number, so a
 * non-zero count is always actionable. A zero count still links (the list shows its own empty
 * state) rather than becoming a dead element that looks clickable but isn't.
 */
function RiskTile({ label, value, icon, tone, filter }: RiskTileProps) {
  const isElevated = (value ?? 0) > 0;
  return (
    <Link
      to={`/platform/orgs?risk=${filter}`}
      title={`${label}: ${value ?? "-"}. View the organizations affected.`}
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isElevated
          ? tone === "critical"
            ? "bg-rose-500/8 hover:bg-rose-500/12"
            : "bg-amber-500/8 hover:bg-amber-500/12"
          : "bg-muted/50 hover:bg-muted"
      )}
    >
      <IconTile icon={icon} tone={isElevated ? tone : "neutral"} className="size-9" />
      <div className="min-w-0">
        <p className="text-lg leading-none font-semibold text-foreground tabular-nums">{value ?? "-"}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

export function PlatformDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useFleetStatsQuery();
  const { data: alerts, isLoading: alertsLoading } = useAlertsQuery();
  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalyticsQuery();
  const { data: loginRisk, isLoading: loginRiskLoading } = useLoginRiskQuery();
  const { data: orgs, isLoading: orgsLoading } = useOrgsQuery();
  const [growthSeries, setGrowthSeries] = useState<GrowthSeries>("orgs");
  const openAlerts = alerts?.filter((a) => a.status === "open") ?? [];
  const perOrg = (total: number | undefined) =>
    total != null && stats?.totalOrgs ? Math.round(total / stats.totalOrgs).toLocaleString() : "-";

  const growthData = useMemo(
    () =>
      (analytics?.growth ?? []).map((g) => {
        const labels = monthLabels(g.month);
        return { key: g.month, label: labels.short, tooltipLabel: labels.long, value: growthSeries === "orgs" ? g.newOrgs : g.newAssets };
      }),
    [analytics, growthSeries]
  );
  const growthTotal = growthData.reduce((sum, d) => sum + d.value, 0);

  const planSegments = analytics
    ? (["active", "suspended", "expired"] as const).map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: analytics.planBreakdown[key],
        color: planStatusVizColor[key],
      }))
    : [];

  // Workspaces closest to their asset quota first: the ones most likely to need a call.
  const orgsByQuota = useMemo(
    () =>
      [...(orgs ?? [])]
        .map((o) => ({ ...o, assetUsage: o.assetQuota > 0 ? (o.assetCount / o.assetQuota) * 100 : 0 }))
        .sort((a, b) => b.assetUsage - a.assetUsage)
        .slice(0, ORG_ROWS),
    [orgs]
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title="Fleet overview" description="Every Tecres customer workspace at a glance." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Organizations" value={statsLoading ? "-" : (stats?.totalOrgs ?? 0).toLocaleString()} icon={Building2} href="/platform/orgs" />
        <StatTile label="Total users" value={statsLoading ? "-" : (stats?.totalUsers ?? 0).toLocaleString()} icon={Users2} />
        <StatTile label="Total assets" value={statsLoading ? "-" : (stats?.totalAssets ?? 0).toLocaleString()} icon={Box} />
        <StatTile
          label="Open alerts"
          value={alertsLoading ? "-" : openAlerts.length}
          icon={AlertTriangle}
          tone={openAlerts.length > 0 ? "warning" : "brand"}
          href="/platform/alerts"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <DashboardCard
          title="Fleet growth"
          description={
            analyticsLoading
              ? "Last 6 months."
              : `${growthTotal.toLocaleString()} new ${growthSeries === "orgs" ? "workspaces" : "assets"} in the last 6 months.`
          }
          className="lg:col-span-8"
          action={
            <SegmentedControl
              ariaLabel="Growth measure"
              value={growthSeries}
              onChange={setGrowthSeries}
              options={[
                { value: "orgs", label: "Workspaces" },
                { value: "assets", label: "Assets" },
              ]}
            />
          }
        >
          {analyticsLoading ? (
            <CardSpinner />
          ) : (
            <ColumnChart data={growthData} seriesName={growthSeries === "orgs" ? "New workspaces" : "New assets"} height={300} />
          )}
        </DashboardCard>

        <DashboardCard title="Plan status" description="Subscription state across the fleet." className="lg:col-span-4">
          {analyticsLoading ? (
            <CardSpinner />
          ) : (
            <DonutChart
              segments={planSegments}
              centerValue={planSegments.reduce((sum, s) => sum + s.value, 0).toLocaleString()}
              centerLabel="workspaces"
              emptyText="No workspaces yet."
            />
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat icon={Users2} label="Avg users" value={perOrg(stats?.totalUsers)} />
            <MiniStat icon={Box} label="Avg assets" value={perOrg(stats?.totalAssets)} />
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <DashboardCard
          title="Workspaces by quota use"
          description="Closest to their asset limit first."
          className="lg:col-span-7"
          action={<ViewAllLink to="/platform/orgs" />}
        >
          {orgsLoading ? (
            <CardSpinner />
          ) : orgsByQuota.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No workspaces yet.</p>
          ) : (
            <>
              <table className="hidden w-full text-left text-[13px] md:table">
                <thead>
                  <tr className="text-[11px] text-muted-foreground">
                    <th className="pb-2.5 font-medium">Workspace</th>
                    <th className="pb-2.5 font-medium">Plan</th>
                    <th className="pb-2.5 font-medium">Users</th>
                    <th className="w-[34%] pb-2.5 font-medium">Asset quota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orgsByQuota.map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 pr-3">
                        <Link to={`/platform/orgs/${o.id}`} className="group flex min-w-0 items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/75 text-[10px] font-bold">
                            {getInitials(o.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground group-hover:underline">{o.name}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {o.lastActivityAt ? `Active ${formatRelativeTime(o.lastActivityAt)}` : "No activity yet"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        <PlanStatusBadge status={o.planStatus} />
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground tabular-nums">
                        {o.userCount}/{o.userQuota}
                      </td>
                      <td className="py-3">
                        <Meter percent={o.assetUsage} tone={o.assetUsage >= 90 ? "critical" : o.assetUsage >= 75 ? "warning" : "brand"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-border md:hidden">
                {orgsByQuota.map((o) => (
                  <li key={o.id} className="py-3">
                    <Link to={`/platform/orgs/${o.id}`} className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium text-foreground">{o.name}</span>
                      <PlanStatusBadge status={o.planStatus} className="shrink-0" />
                    </Link>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {o.assetCount}/{o.assetQuota} assets
                      </span>
                      <div className="flex-1">
                        <Meter percent={o.assetUsage} tone={o.assetUsage >= 90 ? "critical" : o.assetUsage >= 75 ? "warning" : "brand"} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="Detected login risk"
          description="Accounts mid a failed-login spike, and from where."
          className="lg:col-span-5"
        >
          {loginRiskLoading ? (
            <CardSpinner />
          ) : !loginRisk?.length ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <IconTile icon={Lock} tone="neutral" />
              <p className="text-sm text-muted-foreground">No suspicious login activity right now.</p>
            </div>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {loginRisk.map((entry) => (
                <li key={entry.userId}>
                  <Link
                    to={`/platform/orgs/${entry.orgId}?tab=users`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      {getInitials(entry.userName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-foreground">{entry.userName}</span>
                        {entry.isLocked && <Lock className="size-3 shrink-0 text-rose-500" aria-label="Locked" />}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{entry.orgName}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                        {entry.failedLoginAttempts} failed
                      </span>
                      {entry.lastIp && (
                        <span className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="size-3" />
                          {entry.lastIp}
                          {entry.distinctIpCount > 1 ? ` +${entry.distinctIpCount - 1}` : ""}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <DashboardCard
          title="Risk and health"
          description="Fleet-wide signals worth a look. Each one opens the workspaces behind it."
          className="lg:col-span-8"
        >
          {analyticsLoading ? (
            <CardSpinner />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <RiskTile label="Suspended orgs" value={analytics?.risk.suspendedOrgs} icon={Ban} tone="critical" filter="suspended" />
              <RiskTile label="Near asset quota" value={analytics?.risk.orgsNearAssetQuota} icon={Gauge} tone="warning" filter="near-asset-quota" />
              <RiskTile label="Near user quota" value={analytics?.risk.orgsNearUserQuota} icon={Gauge} tone="warning" filter="near-user-quota" />
              <RiskTile
                label="Overdue maintenance"
                value={analytics?.risk.overdueMaintenance}
                icon={Wrench}
                tone="warning"
                filter="overdue-maintenance"
              />
              <RiskTile label="Damaged / lost assets" value={analytics?.risk.riskyAssets} icon={PackageX} tone="critical" filter="risky-assets" />
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Open alerts" className="lg:col-span-4" action={<ViewAllLink to="/platform/alerts" />}>
          {alertsLoading ? (
            <CardSpinner />
          ) : openAlerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <IconTile icon={ShieldAlert} tone="neutral" />
              <p className="text-sm text-muted-foreground">No open alerts.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {openAlerts.slice(0, 5).map((alert) => (
                <li key={alert.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-[13px]">
                  <span className="truncate font-medium text-foreground">{alert.title}</span>
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground capitalize">{alert.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
