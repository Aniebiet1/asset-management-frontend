import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, Wrench, Users2, Wallet, Plus, ScanLine, ArrowLeftRight, AlarmClock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardCard, MiniStat, StatTile, ViewAllLink } from "@/components/common/DashboardCard";
import { DonutChart } from "@/components/charts/DonutChart";
import { RankedBars } from "@/components/charts/RankedBars";
import { hasPermission } from "@/lib/permissions";
import { assetStatusVizColor, assetStatusVizOrder, statusColorMap } from "@/lib/status";
import { formatCompactCurrency, formatCurrency, formatRelativeTime, getInitials } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { useAssetsQuery } from "@/features/assets/api";
import { useMaintenanceQuery } from "@/features/maintenance/api";
import { useActiveAssignmentsQuery } from "@/features/check-in-out/api";
import { useDashboardStatsQuery, useDashboardChartsQuery, useDashboardActivityQuery } from "./api";
import { AssetActivityCard } from "./AssetActivityCard";

const UPCOMING_MAINTENANCE_STATUSES = new Set(["scheduled", "in_progress", "waiting_parts"]);
const ACTIVITY_LIMIT = 6;

function CardSpinner() {
  const org = useAuthStore((s) => s.org);
  return (
    <div className="flex h-full min-h-40 items-center justify-center">
      <BrandedLoader size="sm" logoUrl={org?.logoUrl} orgName={org?.name} />
    </div>
  );
}

function describeAction(action: string): string {
  return action.replace(/[._]/g, " ").toLowerCase();
}

export function DashboardPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const { data: stats, isLoading: statsLoading } = useDashboardStatsQuery();
  const { data: charts, isLoading: chartsLoading } = useDashboardChartsQuery();
  const { data: activity, isLoading: activityLoading } = useDashboardActivityQuery();
  const { data: maintenance, isLoading: maintenanceLoading } = useMaintenanceQuery();
  const { data: assignments } = useActiveAssignmentsQuery();
  const assets = useAssetsQuery({ pageSize: 200 });
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");
  const canCreate = hasPermission(currentUser?.role, "canCreateAsset");

  const assetById = useMemo(() => {
    const map = new Map<string, { name: string; assetTag: string }>();
    for (const a of assets.data?.data ?? []) map.set(a.id, { name: a.name, assetTag: a.assetTag });
    return map;
  }, [assets.data]);

  const upcomingMaintenance = useMemo(
    () =>
      (maintenance ?? [])
        .filter((m) => UPCOMING_MAINTENANCE_STATUSES.has(m.status))
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [maintenance]
  );

  const statusSegments = useMemo(() => {
    const counts = new Map((charts?.byStatus ?? []).map((s) => [s.status, s.count]));
    return assetStatusVizOrder.map((status) => ({
      key: status,
      label: statusColorMap[status]?.label ?? status,
      value: counts.get(status) ?? 0,
      color: assetStatusVizColor[status],
    }));
  }, [charts]);

  const categoryBars = (charts?.byCategory ?? []).map((c) => ({
    key: c.categoryId ?? "none",
    label: c.categoryName ?? "Uncategorized",
    value: c.count,
  }));

  const overdueCount = assignments?.overdue.length;
  const firstName = currentUser?.name.split(" ")[0];

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`Here's what's happening across ${org?.name} today.`}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full bg-card px-4" asChild>
              <Link to="/check-in-out">
                <ScanLine className="size-3.5" />
                Scan Asset
              </Link>
            </Button>
            {canCreate && (
              <Button size="sm" className="h-9 gap-1.5 rounded-full px-4 shadow-sm shadow-primary/25" asChild>
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Total assets" value={statsLoading ? "-" : (stats?.assets.total ?? 0)} icon={Box} href="/assets" />
        <StatTile label="In use" value={statsLoading ? "-" : (stats?.assets.inUse ?? 0)} icon={ArrowLeftRight} href="/check-in-out" />
        <StatTile
          label="Overdue returns"
          value={overdueCount ?? "-"}
          icon={AlarmClock}
          tone={(overdueCount ?? 0) > 0 ? "critical" : "brand"}
          href="/check-in-out"
        />
        <StatTile
          label="Maintenance due"
          value={statsLoading ? "-" : (stats?.maintenanceDue ?? 0)}
          icon={Wrench}
          tone={(stats?.maintenanceDue ?? 0) > 0 ? "warning" : "brand"}
          href="/maintenance"
        />
      </div>

      {/* Lead row: activity table + status breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <AssetActivityCard knownAssets={assetById} upcomingMaintenance={upcomingMaintenance} maintenanceLoading={maintenanceLoading} />
        </div>

        <DashboardCard title="Asset status" description="Where every asset is right now." className="lg:col-span-4">
          {chartsLoading ? (
            <CardSpinner />
          ) : (
            <DonutChart
              segments={statusSegments}
              centerValue={(stats?.assets.total ?? statusSegments.reduce((sum, s) => sum + s.value, 0)).toLocaleString()}
              centerLabel="assets"
              emptyText="No assets yet."
            />
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat icon={Users2} label="Active users" value={stats?.activeUsers ?? "-"} />
            {canViewValuation && stats?.assets.totalValue !== undefined ? (
              <MiniStat
                icon={Wallet}
                label="Fleet value"
                value={formatCompactCurrency(stats.assets.totalValue, org?.currency, org?.currencySymbol)}
                title={formatCurrency(stats.assets.totalValue, org?.currency, org?.currencySymbol)}
              />
            ) : (
              <MiniStat icon={CheckCircle2} label="Available" value={stats?.assets.available ?? "-"} />
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Second row: assets by type + recent activity */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <DashboardCard
          title="Assets by type"
          description="How the fleet splits across asset types."
          className="lg:col-span-7"
          action={<ViewAllLink to="/reports" label="Reports" />}
        >
          {chartsLoading ? <CardSpinner /> : <RankedBars data={categoryBars} emptyText="No assets yet." />}
        </DashboardCard>

        <DashboardCard title="Recent activity" description="Latest changes across the workspace." className="lg:col-span-5">
          {activityLoading ? (
            <CardSpinner />
          ) : activity && activity.length > 0 ? (
            <ul className="-mx-2 space-y-0.5">
              {activity.slice(0, ACTIVITY_LIMIT).map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/75 text-[11px] font-semibold">
                    {getInitials(entry.userName ?? "?")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">
                      <span className="font-semibold">{entry.userName ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{describeAction(entry.action)}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{entry.entityName ?? entry.entityType}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No activity yet.</p>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
