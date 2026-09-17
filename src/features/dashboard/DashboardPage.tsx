import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, CheckCircle2, Wrench, Users2, Wallet, ArrowUpRight, Plus, ScanLine } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, MaintenanceStatusBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { useAssetsQuery } from "@/features/assets/api";
import { useMaintenanceQuery } from "@/features/maintenance/api";
import { useDashboardStatsQuery, useDashboardChartsQuery, useDashboardActivityQuery } from "./api";

const UPCOMING_MAINTENANCE_STATUSES = new Set(["scheduled", "in_progress", "waiting_parts"]);
const MAINTENANCE_DUE_LIMIT = 5;

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function CardSpinner() {
  const org = useAuthStore((s) => s.org);
  return (
    <div className="flex h-full min-h-24 items-center justify-center">
      <BrandedLoader size="sm" logoUrl={org?.logoUrl} orgName={org?.name} />
    </div>
  );
}

export function DashboardPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const { data: stats, isLoading: statsLoading } = useDashboardStatsQuery();
  const { data: charts, isLoading: chartsLoading } = useDashboardChartsQuery();
  const { data: activity, isLoading: activityLoading } = useDashboardActivityQuery();
  const { data: maintenance, isLoading: maintenanceLoading } = useMaintenanceQuery();
  const assets = useAssetsQuery({ pageSize: 200 });
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");
  const canCreate = hasPermission(currentUser?.role, "canCreateAsset");

  const assetById = useMemo(() => {
    const map = new Map<string, { name: string; assetTag: string }>();
    for (const a of assets.data?.data ?? []) {
      map.set(a.id, { name: a.name, assetTag: a.assetTag });
    }
    return map;
  }, [assets.data]);

  const upcomingMaintenance = useMemo(() => {
    return (maintenance ?? [])
      .filter((m) => UPCOMING_MAINTENANCE_STATUSES.has(m.status))
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, MAINTENANCE_DUE_LIMIT);
  }, [maintenance]);

  const kpis = stats
    ? [
        { label: "Total Assets", value: stats.assets.total, icon: Box, href: "/assets" },
        { label: "Available", value: stats.assets.available, icon: CheckCircle2, href: "/assets?status=available" },
        { label: "In Maintenance", value: stats.assets.inMaintenance, icon: Wrench, href: "/maintenance" },
        { label: "Active Users", value: stats.activeUsers, icon: Users2, href: "/people" },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${currentUser?.name.split(" ")[0]}`}
        description={`Here's what's happening across ${org?.name} today.`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/check-in-out">
                <ScanLine className="size-3.5" />
                Scan Asset
              </Link>
            </Button>
            {canCreate && (
              <Button size="sm" className="gap-1.5" asChild>
                <Link to="/assets/new">
                  <Plus className="size-3.5" />
                  New Asset
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statsLoading ? (
          <Card className="col-span-2 lg:col-span-4">
            <CardSpinner />
          </Card>
        ) : (
          <>
            {kpis.map((kpi) => (
              <Link key={kpi.label} to={kpi.href}>
                <Card className="transition-colors hover:border-input">
                  <CardContent className="flex items-start justify-between p-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                      <kpi.icon className="size-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {canViewValuation && stats?.assets.totalValue !== undefined && (
              <Link to="/reports" className="col-span-2 lg:col-span-4">
                <Card className="border-primary/20 bg-primary/5 transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <Wallet className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Fleet Value</p>
                        <p className="text-xl font-semibold tracking-tight text-foreground">
                          {formatCurrency(stats.assets.totalValue, org?.currency, org?.currencySymbol)}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </>
        )}
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Assets by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pl-0">
            {chartsLoading ? (
              <CardSpinner />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.byCategory ?? []} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="categoryName" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                  <RechartsTooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--color-chart-1)" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Assets by Status</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center gap-4">
            {chartsLoading ? (
              <CardSpinner />
            ) : (
              <>
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={charts?.byStatus ?? []} dataKey="count" nameKey="status" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {(charts?.byStatus ?? []).map((entry, i) => (
                        <Cell key={entry.status} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-1.5">
                  {(charts?.byStatus ?? []).map((entry) => (
                    <div key={entry.status} className="flex items-center justify-between text-xs">
                      <StatusBadge status={entry.status} className="border-0 bg-transparent px-0" />
                      <span className="font-medium text-foreground">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity + maintenance */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/reports">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {activityLoading ? (
              <CardSpinner />
            ) : activity && activity.length > 0 ? (
              activity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                    {getInitials(entry.userName ?? "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      <span className="font-medium">{entry.userName ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{entry.action.replace(/\./g, " ").replace("_", " ")}</span>{" "}
                      <span className="font-medium">{entry.entityName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Maintenance Due</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/maintenance">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {maintenanceLoading ? (
              <CardSpinner />
            ) : upcomingMaintenance.length > 0 ? (
              upcomingMaintenance.map((m) => {
                const asset = assetById.get(m.assetId);
                return (
                  <div key={m.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{m.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {asset?.name ?? m.assetName ?? "Unknown asset"} · {asset?.assetTag ?? m.assetTag ?? m.assetId}
                      </p>
                    </div>
                    <MaintenanceStatusBadge status={m.status} className="shrink-0" />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Nothing due right now.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
