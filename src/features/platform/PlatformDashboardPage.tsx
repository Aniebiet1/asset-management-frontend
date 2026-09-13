import { Link } from "react-router-dom";
import { Building2, Users2, Box, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { useFleetStatsQuery, useAlertsQuery } from "./api";

export function PlatformDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useFleetStatsQuery();
  const { data: alerts, isLoading: alertsLoading } = useAlertsQuery();
  const openAlerts = alerts?.filter((a) => a.status === "open") ?? [];

  const kpis = [
    { label: "Organizations", value: stats?.totalOrgs, icon: Building2 },
    { label: "Total Users", value: stats?.totalUsers, icon: Users2 },
    { label: "Total Assets", value: stats?.totalAssets, icon: Box },
  ];

  return (
    <div>
      <PageHeader title="Fleet overview" description="Every Tecres customer workspace at a glance." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
                  {statsLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : kpi.value}
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                <kpi.icon className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
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
