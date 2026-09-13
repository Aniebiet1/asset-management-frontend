import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanStatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";
import { useOrgDetailQuery, useUpdateOrgStatusMutation, useUpdateOrgQuotasMutation } from "./api";
import { ApiError } from "@/lib/http-error";
import { toast } from "sonner";

export function PlatformOrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useOrgDetailQuery(id);
  const updateStatus = useUpdateOrgStatusMutation(id!);
  const updateQuotas = useUpdateOrgQuotasMutation(id!);

  const [assetQuota, setAssetQuota] = useState<string>("");
  const [userQuota, setUserQuota] = useState<string>("");

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { org, usage } = data;
  const isSuspended = org.planStatus === "suspended";

  const handleToggleSuspend = async () => {
    try {
      await updateStatus.mutateAsync(isSuspended ? "active" : "suspended");
      toast.success(isSuspended ? "Workspace reactivated" : "Workspace suspended");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update the workspace status.");
    }
  };

  const handleUpdateQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: { assetQuota?: number; userQuota?: number } = {};
      if (assetQuota) payload.assetQuota = Number(assetQuota);
      if (userQuota) payload.userQuota = Number(userQuota);
      await updateQuotas.mutateAsync(payload);
      setAssetQuota("");
      setUserQuota("");
      toast.success("Quotas updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update quotas.");
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 gap-1.5 text-xs" asChild>
        <Link to="/platform/orgs">
          <ArrowLeft className="size-3.5" />
          Back to Organizations
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{org.name}</h1>
            <PlanStatusBadge status={org.planStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{org.slug} · created {formatDate(org.createdAt)}</p>
        </div>
        <Button variant={isSuspended ? "default" : "destructive"} size="sm" onClick={handleToggleSuspend} disabled={updateStatus.isPending}>
          {isSuspended ? "Reactivate workspace" : "Suspend workspace"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Usage</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Users</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {usage.userCount} / {org.userQuota}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assets</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {usage.assetCount} / {org.assetQuota}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last activity</p>
              <p className="mt-1 text-sm font-medium text-foreground">{org.lastActivityAt ? formatDate(org.lastActivityAt) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Onboarding</p>
              <p className="mt-1 text-sm font-medium text-foreground">{org.onboardingCompletedAt ? "Completed" : "Pending"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Adjust quotas</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateQuotas} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="userQuota">User quota</Label>
                <Input id="userQuota" type="number" min={1} placeholder={String(org.userQuota)} value={userQuota} onChange={(e) => setUserQuota(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assetQuota">Asset quota</Label>
                <Input id="assetQuota" type="number" min={1} placeholder={String(org.assetQuota)} value={assetQuota} onChange={(e) => setAssetQuota(e.target.value)} />
              </div>
              <Button type="submit" size="sm" disabled={updateQuotas.isPending || (!assetQuota && !userQuota)}>
                Update quotas
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
