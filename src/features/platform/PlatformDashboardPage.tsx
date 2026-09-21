import { Link } from "react-router-dom";
import {
  Building2,
  Users2,
  Box,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Gauge,
  Wrench,
  PackageX,
  Ban,
  Lock,
  MapPin,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PlanStatusBadge } from "@/components/common/StatusBadge";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { formatDateTime } from "@/lib/format";
import { useFleetStatsQuery, useAlertsQuery, useFleetAnalyticsQuery, useLoginRiskQuery } from "./api";
import type { RiskFilter } from "./riskFilters";

function CardSpinner() {
  return (
    <div className="flex h-full min-h-24 items-center justify-center">
      <BrandedLoader size="sm" />
    </div>
  );
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

interface RiskTileProps {
  label: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  tone: "critical" | "warning" | "neutral";
  /** Drill-down this tile opens on the organizations list. */
  filter: RiskFilter;
}

/**
 * Every tile is a link into the organizations list filtered to the orgs behind its number, so a
 * non-zero count is always actionable. A zero count still links (the list shows its own empty
 * state) rather than becoming a dead element that looks clickable but isn't.
 */
function RiskTile({ label, value, icon: Icon, tone, filter }: RiskTileProps) {
  const isElevated = (value ?? 0) > 0;
  const toneClasses =
    tone === "critical"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
        : "border-border bg-muted text-muted-foreground";

  return (
    <Link
      to={`/platform/orgs?risk=${filter}`}
      title={`${label}: ${value ?? "-"}. View the organizations affected.`}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isElevated ? toneClasses : "border-border bg-card hover:bg-muted/40"
      )}
    >
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${isElevated ? "bg-background/50" : "bg-muted"}`}>
        <Icon className={`size-4 ${isElevated ? "" : "text-muted-foreground"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none text-foreground">{value ?? "-"}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

export function PlatformDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useFleetStatsQuery();
  const { data: alerts, isLoading: alertsLoading } = useAlertsQuery();
  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalyticsQuery();
  const { data: loginRisk, isLoading: loginRiskLoading } = useLoginRiskQuery();
  const openAlerts = alerts?.filter((a) => a.status === "open") ?? [];

  const kpis = [
    { label: "Organizations", value: stats?.totalOrgs, icon: Building2 },
    { label: "Total Users", value: stats?.totalUsers, icon: Users2 },
    { label: "Total Assets", value: stats?.totalAssets, icon: Box },
    { label: "Suspended", value: analytics?.risk.suspendedOrgs, icon: Ban, tinted: (analytics?.risk.suspendedOrgs ?? 0) > 0 },
  ];

  const growthData = analytics?.growth.map((g) => ({ ...g, label: formatMonth(g.month) })) ?? [];

  const planData = analytics
    ? [
        { key: "active", name: "Active", value: analytics.planBreakdown.active, fill: "var(--color-chart-3)" },
        { key: "suspended", name: "Suspended", value: analytics.planBreakdown.suspended, fill: "var(--color-chart-5)" },
        { key: "expired", name: "Expired", value: analytics.planBreakdown.expired, fill: "var(--muted-foreground)" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <PageHeader title="Fleet overview" description="Every Tecres customer workspace at a glance." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
                  {statsLoading || analyticsLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : kpi.value}
                </p>
              </div>
              <div
                className={`flex size-8 items-center justify-center rounded-lg ${
                  "tinted" in kpi && kpi.tinted ? "bg-rose-500/10 text-rose-400" : "bg-muted text-muted-foreground"
                }`}
              >
                <kpi.icon className="size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Fleet growth</CardTitle>
            <p className="text-xs text-muted-foreground">New workspaces and assets added, last 6 months.</p>
          </CardHeader>
          <CardContent className="h-64 pl-0">
            {analyticsLoading ? (
              <CardSpinner />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ left: 0, right: 16 }}>
                  <defs>
                    <linearGradient id="orgsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                  <RechartsTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span className="text-muted-foreground">{value}</span>} />
                  <Area
                    type="monotone"
                    dataKey="newOrgs"
                    name="New workspaces"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#orgsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="newAssets"
                    name="New assets"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    fill="url(#assetsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Plan status</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center gap-4">
            {analyticsLoading ? (
              <CardSpinner />
            ) : planData.length === 0 ? (
              <p className="w-full text-center text-sm text-muted-foreground">No workspaces yet.</p>
            ) : (
              <>
                <div className="h-full w-[55%] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {planData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  {planData.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between text-xs">
                      <PlanStatusBadge status={entry.key} className="border-0 bg-transparent px-0" />
                      <span className="font-medium text-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldAlert className="size-4 text-amber-500" />
            Risk & health
          </CardTitle>
          <p className="text-xs text-muted-foreground">Fleet-wide signals worth a look, computed across every workspace.</p>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <CardSpinner />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <RiskTile label="Suspended orgs" value={analytics?.risk.suspendedOrgs} icon={Ban} tone="critical" filter="suspended" />
              <RiskTile
                label="Near asset quota"
                value={analytics?.risk.orgsNearAssetQuota}
                icon={Gauge}
                tone="warning"
                filter="near-asset-quota"
              />
              <RiskTile
                label="Near user quota"
                value={analytics?.risk.orgsNearUserQuota}
                icon={Gauge}
                tone="warning"
                filter="near-user-quota"
              />
              <RiskTile
                label="Overdue maintenance"
                value={analytics?.risk.overdueMaintenance}
                icon={Wrench}
                tone="warning"
                filter="overdue-maintenance"
              />
              <RiskTile
                label="Damaged / lost assets"
                value={analytics?.risk.riskyAssets}
                icon={PackageX}
                tone="critical"
                filter="risky-assets"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Lock className="size-4 text-rose-500" />
            Detected login risk
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Accounts fleet-wide currently mid a failed-login spike, so you can see who's being targeted and from where.
          </p>
        </CardHeader>
        <CardContent>
          {loginRiskLoading ? (
            <CardSpinner />
          ) : !loginRisk?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No suspicious login activity right now.</p>
          ) : (
            <div className="divide-y divide-border">
              {loginRisk.map((entry) => (
                <Link
                  key={entry.userId}
                  to={`/platform/orgs/${entry.orgId}?tab=users`}
                  className="flex flex-col gap-2 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-lg sm:px-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{entry.userName}</p>
                      <span className="text-xs text-muted-foreground">{entry.userEmail}</span>
                      {entry.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
                          <Lock className="size-3" />
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.orgName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-medium text-amber-400">{entry.failedLoginAttempts} failed attempts</span>
                    {entry.lastIp && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {entry.lastIp}
                        {entry.distinctIpCount > 1 ? ` (+${entry.distinctIpCount - 1} more)` : ""}
                      </span>
                    )}
                    {entry.lastAttemptAt && <span>{formatDateTime(entry.lastAttemptAt)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <AlertTriangle className="size-4 text-amber-500" />
              Open alerts
            </p>
            <Link to="/platform/alerts" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {alertsLoading ? (
            <BrandedLoader size="sm" className="justify-start" />
          ) : openAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open alerts.</p>
          ) : (
            <div className="space-y-2">
              {openAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                  <span className="font-medium text-foreground">{alert.title}</span>
                  <span className="text-xs text-muted-foreground">{alert.severity}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
