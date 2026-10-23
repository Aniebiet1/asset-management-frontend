import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanStatusBadge } from "@/components/common/StatusBadge";
import { Meter } from "@/components/common/DashboardCard";
import { BrandedLoader } from "@/components/brand/BrandedLoader";
import { formatDate, formatDateTime, getInitials } from "@/lib/format";
import { roleLabelMap } from "@/lib/status";
import { usePlatformAuthStore } from "@/store/platformAuth.store";
import {
  useOrgDetailQuery,
  useUpdateOrgStatusMutation,
  useUpdateOrgQuotasMutation,
  useOrgUsersQuery,
  useOrgActivityQuery,
  useForceResetPasswordMutation,
} from "./api";
import type { PlatformOrgUser } from "@/types";
import { ApiError } from "@/lib/http-error";
import { toast } from "sonner";

function humanizeAction(action: string): string {
  return action.replace(/_/g, " ");
}

export function PlatformOrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";
  const { data, isLoading } = useOrgDetailQuery(id);
  const updateStatus = useUpdateOrgStatusMutation(id!);
  const updateQuotas = useUpdateOrgQuotasMutation(id!);
  const users = useOrgUsersQuery(id);
  const activity = useOrgActivityQuery(id);
  const forceReset = useForceResetPasswordMutation(id!);
  const isOwner = usePlatformAuthStore((s) => s.admin?.role) === "platform_owner";

  const [assetQuota, setAssetQuota] = useState<string>("");
  const [userQuota, setUserQuota] = useState<string>("");
  const [forceResetTarget, setForceResetTarget] = useState<PlatformOrgUser | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-24">
        <BrandedLoader />
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

  const handleForceReset = async () => {
    if (!forceResetTarget) return;
    try {
      await forceReset.mutateAsync(forceResetTarget.id);
      toast.success(`Password reset email sent to ${forceResetTarget.email}`);
      setForceResetTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reset that user's password.");
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

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users{users.data ? ` (${users.data.length})` : ""}</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Usage</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {[
                  { label: "Users", used: usage.userCount, quota: org.userQuota },
                  { label: "Assets", used: usage.assetCount, quota: org.assetQuota },
                ].map(({ label, used, quota }) => {
                  const percent = quota > 0 ? (used / quota) * 100 : 0;
                  return (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 mb-2 text-lg font-semibold text-foreground tabular-nums">
                        {used.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {quota.toLocaleString()}</span>
                      </p>
                      <Meter percent={percent} tone={percent >= 90 ? "critical" : percent >= 75 ? "warning" : "brand"} />
                    </div>
                  );
                })}
                <div>
                  <p className="text-xs text-muted-foreground">Last activity</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{org.lastActivityAt ? formatDate(org.lastActivityAt) : "-"}</p>
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
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          {users.isLoading ? (
            <Card className="p-0">
              <div className="flex justify-center py-10">
                <BrandedLoader size="sm" />
              </div>
            </Card>
          ) : users.data?.length ? (
            <>
              {/* Desktop table */}
              <Card className="hidden overflow-hidden p-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Joined</TableHead>
                      {isOwner && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.data.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{roleLabelMap[u.role] ?? u.role}</TableCell>
                        <TableCell>
                          <span
                            className={
                              u.isActive
                                ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                                : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                            }
                          >
                            <span className="size-1.5 rounded-full bg-current opacity-80" />
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.totpEnabled ? "Enabled" : "Not enrolled"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        {isOwner && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="ghost" size="icon-sm" title="Force password reset" onClick={() => setForceResetTarget(u)}>
                                <KeyRound className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {users.data.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{u.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
                            u.isActive
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current opacity-80" />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{roleLabelMap[u.role] ?? u.role}</span>
                        <span>2FA: {u.totpEnabled ? "Enabled" : "Not enrolled"}</span>
                        <span>Joined {formatDate(u.createdAt)}</span>
                      </div>
                      {isOwner && (
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setForceResetTarget(u)}>
                            <KeyRound className="size-3.5" />
                            Reset password
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">No users in this workspace yet.</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="p-0">
            {activity.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activity.data?.length ? (
              <div className="divide-y divide-border">
                {activity.data.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div>
                      <p className="font-medium capitalize text-foreground">{humanizeAction(log.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.entityName ?? log.userName ?? "System"}
                        {log.ipAddress ? ` · ${log.ipAddress}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">No activity recorded for this workspace yet.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!forceResetTarget} onOpenChange={(open) => !open && setForceResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force a password reset for {forceResetTarget?.name}?</DialogTitle>
            <DialogDescription>
              This emails {forceResetTarget?.email} a reset link and immediately revokes their existing sessions. They will need to set a
              new password before signing in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setForceResetTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={forceReset.isPending} className="gap-1.5" onClick={handleForceReset}>
              {forceReset.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Send reset email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
