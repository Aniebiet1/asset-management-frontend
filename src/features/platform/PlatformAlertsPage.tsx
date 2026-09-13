import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertSeverityBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { useAlertsQuery, useResolveAlertMutation } from "./api";
import { ApiError } from "@/lib/http-error";
import { toast } from "sonner";

export function PlatformAlertsPage() {
  const { data: alerts, isLoading } = useAlertsQuery();
  const resolveAlert = useResolveAlertMutation();

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert.mutateAsync(id);
      toast.success("Alert resolved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't resolve that alert.");
    }
  };

  return (
    <div>
      <PageHeader title="Alerts" description="Quota breaches, failed-login spikes, expired plans and stale workspaces." />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !alerts?.length ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">No alerts.</div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{alert.title}</p>
                    <AlertSeverityBadge severity={alert.severity} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(alert.createdAt)}</p>
                </div>
                {alert.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => handleResolve(alert.id)} disabled={resolveAlert.isPending}>
                    Resolve
                  </Button>
                )}
                {alert.status === "resolved" && <span className="text-xs font-medium text-muted-foreground">Resolved</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
