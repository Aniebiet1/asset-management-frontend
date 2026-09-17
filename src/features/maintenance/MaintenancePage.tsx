import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Wrench, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { MaintenanceStatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useAssetsQuery } from "@/features/assets/api";
import { useMaintenanceQuery, useDeleteMaintenanceMutation } from "@/features/maintenance/api";
import { CreateMaintenanceDialog, EditMaintenanceDialog, MAINTENANCE_STATUS_OPTIONS } from "@/features/maintenance/components/MaintenanceFormDialogs";
import { ApiError } from "@/lib/http-error";
import { toast } from "sonner";
import type { MaintenanceRecord, MaintenanceStatus } from "@/types";

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  preventive: "Preventive",
  corrective: "Corrective",
  calibration: "Calibration",
  inspection: "Inspection",
  upgrade: "Upgrade",
};

function isOverdue(record: MaintenanceRecord): boolean {
  if (record.status === "completed" || record.status === "cancelled") return false;
  return new Date(record.scheduledDate).getTime() < Date.now();
}

export function MaintenancePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canSchedule = hasPermission(currentUser?.role, "canScheduleMaintenance");
  const canComplete = hasPermission(currentUser?.role, "canCompleteMaintenance");

  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MaintenanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const maintenance = useMaintenanceQuery();
  // The list endpoint doesn't join asset name/tag (it's a flat select on maintenance_records),
  // so this cross-references the assets list to display them - see api.ts's comment.
  const assets = useAssetsQuery({ pageSize: 200 });
  const deleteMaintenance = useDeleteMaintenanceMutation();

  const assetById = useMemo(() => {
    const map = new Map<string, { name: string; assetTag: string }>();
    for (const a of assets.data?.data ?? []) {
      map.set(a.id, { name: a.name, assetTag: a.assetTag });
    }
    return map;
  }, [assets.data]);

  const rows = useMemo(() => {
    const all = maintenance.data ?? [];
    const filtered = statusFilter === "all" ? all : all.filter((r) => r.status === statusFilter);
    return [...filtered].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [maintenance.data, statusFilter]);

  function assetLabel(record: MaintenanceRecord) {
    const asset = assetById.get(record.assetId);
    return {
      name: asset?.name ?? record.assetName ?? "Unknown asset",
      tag: asset?.assetTag ?? record.assetTag ?? record.assetId,
    };
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteMaintenance.mutateAsync(deleteTarget.id);
      toast.success("Maintenance record deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete this maintenance record.");
    } finally {
      setIsDeleting(false);
    }
  }

  const isLoading = maintenance.isLoading || assets.isLoading;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Schedule, track and complete preventive and corrective maintenance work."
        actions={
          canSchedule && (
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              Schedule maintenance
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MaintenanceStatus | "all")}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {MAINTENANCE_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Wrench className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No maintenance records</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === "all" ? "Nothing scheduled yet." : "No records match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Asset</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((record) => {
                  const asset = assetLabel(record);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Link to={`/assets/${record.assetId}`} className="min-w-0">
                          <p className="truncate font-medium text-foreground hover:underline">{asset.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{asset.tag}</p>
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-52 truncate text-sm text-foreground">{record.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {MAINTENANCE_TYPE_LABELS[record.maintenanceType] ?? record.maintenanceType}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={record.priority} />
                      </TableCell>
                      <TableCell>
                        <MaintenanceStatusBadge status={record.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={isOverdue(record) ? "font-medium text-rose-400" : "text-muted-foreground"}>
                          {formatDate(record.scheduledDate)}
                          {isOverdue(record) && " (overdue)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(record.completedDate)}</TableCell>
                      <TableCell>
                        {canComplete && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setEditTarget(record)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(record)}>
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {rows.map((record) => {
              const asset = assetLabel(record);
              return (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{record.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {asset.name} · {asset.tag}
                        </p>
                      </div>
                      <MaintenanceStatusBadge status={record.status} className="shrink-0" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <PriorityBadge priority={record.priority} />
                      <span>{MAINTENANCE_TYPE_LABELS[record.maintenanceType] ?? record.maintenanceType}</span>
                      <span className={isOverdue(record) ? "font-medium text-rose-400" : ""}>
                        Due {formatDate(record.scheduledDate)}
                        {isOverdue(record) && " (overdue)"}
                      </span>
                    </div>
                    {canComplete && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditTarget(record)}>
                          <Pencil className="size-3.5" />
                          Update
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => setDeleteTarget(record)}>
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <CreateMaintenanceDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditMaintenanceDialog record={editTarget} onOpenChange={(open) => !open && setEditTarget(null)} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete maintenance record?</DialogTitle>
            <DialogDescription>
              This removes "{deleteTarget?.title}" permanently. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} className="gap-1.5" onClick={handleDelete}>
              {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
