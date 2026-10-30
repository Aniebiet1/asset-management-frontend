import { useMemo, useState } from "react";
import { CalendarClock, Download, FileSpreadsheet, FileText, Loader2, Pencil, Plus, Trash2, Wallet, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MiniStat } from "@/components/common/DashboardCard";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, type ExportColumn } from "@/features/reports/lib/export";
import { resolveLogoDataUrl } from "@/lib/pdfLogo";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import { ApiError } from "@/lib/http-error";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";
import { useDeleteServiceEntryMutation, useServiceHistoryQuery } from "./api";
import { ServiceEntryDialog } from "./ServiceEntryDialog";
import { serviceTypeLabel, serviceTypeOf } from "./serviceTypes";
import type { ServiceEntryType, ServiceHistoryEntry } from "@/types";

const TYPE_DOT: Record<ServiceEntryType, string> = {
  repair: "bg-amber-500",
  service: "bg-(--viz-series)",
  inspection: "bg-muted-foreground/60",
};

/**
 * Fits a half-width tile on phones: "3 Oct" this year (the year goes without saying),
 * "Oct 2025" for older dates. The full date is in the tile's tooltip.
 */
function shortServiceDate(date: string): string {
  const isThisYear = formatDate(date, "yyyy") === String(new Date().getFullYear());
  return formatDate(date, isThisYear ? "d MMM" : "MMM yyyy");
}

/** Asset detail tab for the optional "serviceHistory" add-on. Only rendered when the org has it on. */
export function ServiceHistoryTab({ assetId, assetName, assetTag }: { assetId: string; assetName: string; assetTag: string }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logoSrc = useResolvedLogoSrc(org?.logoUrl ?? null, accessToken);
  const canLog = hasPermission(currentUser?.role, "canCompleteMaintenance");
  const { data, isLoading, isError } = useServiceHistoryQuery(assetId);
  const deleteEntry = useDeleteServiceEntryMutation(assetId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceHistoryEntry | null>(null);
  const [deleting, setDeleting] = useState<ServiceHistoryEntry | null>(null);

  const money = (amount: number | string) => formatCurrency(amount, org?.currency, org?.currencySymbol);

  const entries = data?.entries ?? [];
  // Costs are left out of the file for the same roles the API leaves them out for, rather than
  // exporting a blank column.
  const canSeeCosts = data?.summary.totalCost != null;
  const exportColumns = useMemo<ExportColumn<ServiceHistoryEntry>[]>(() => {
    const columns: ExportColumn<ServiceHistoryEntry>[] = [
      { header: "Date", accessor: (e) => formatDate(e.completedDate ?? e.scheduledDate, "dd MMM yyyy") },
      { header: "Type", accessor: (e) => serviceTypeLabel(e.maintenanceType) },
      { header: "Title", accessor: (e) => e.title },
    ];
    if (canSeeCosts) {
      columns.push({
        header: "Cost",
        accessor: (e) => (e.cost != null ? formatCurrency(e.cost, org?.currency, org?.currencySymbol) : "-"),
      });
    }
    columns.push(
      { header: "Vendor", accessor: (e) => e.vendorName ?? "-" },
      { header: "Technician", accessor: (e) => e.technicianName ?? "-" },
      { header: "Logged by", accessor: (e) => e.loggedByName ?? "-" },
      { header: "Comment", accessor: (e) => e.notes ?? "" }
    );
    return columns;
  }, [canSeeCosts, org?.currency, org?.currencySymbol]);

  const exportFileBase = `service-history-${assetTag}-${new Date().toISOString().slice(0, 10)}`.replace(/\s+/g, "-");
  const handleExportCsv = () => exportRowsToCsv(entries, exportColumns, `${exportFileBase}.csv`);
  const handleExportExcel = () => exportRowsToExcel(entries, exportColumns, `${exportFileBase}.xlsx`);
  const handleExportPdf = async () => {
    const logoDataUrl = await resolveLogoDataUrl(logoSrc);
    exportRowsToPdf(entries, exportColumns, `${exportFileBase}.pdf`, `Service history: ${assetName} (${assetTag})`, {
      orgName: org?.name ?? "",
      logoDataUrl,
    });
  };

  const openLog = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (entry: ServiceHistoryEntry) => {
    setEditing(entry);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteEntry.mutateAsync(deleting.id);
      toast.success("Entry deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete this entry.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Service history couldn't be loaded. Refresh the page to try again.</p>;
  }

  const { summary } = data;

  return (
    <div className="space-y-5">
      <div className={cn("grid grid-cols-2 gap-2.5", canSeeCosts ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {canSeeCosts && (
          // Full width on phones so the other two tiles share the row below, instead of one orphan.
          <div className="col-span-2 sm:col-span-1">
            <MiniStat
              icon={Wallet}
              label="Total spent"
              value={formatCompactCurrency(summary.totalCost, org?.currency, org?.currencySymbol)}
              title={money(summary.totalCost!)}
            />
          </div>
        )}
        <MiniStat
          icon={Wrench}
          label={`${summary.entryCount === 1 ? "Entry" : "Entries"}, ${summary.repairCount} ${summary.repairCount === 1 ? "repair" : "repairs"}`}
          value={summary.entryCount}
        />
        <MiniStat
          icon={CalendarClock}
          label="Last serviced"
          value={summary.lastServicedAt ? shortServiceDate(summary.lastServicedAt) : "Never"}
          title={summary.lastServicedAt ? formatDate(summary.lastServicedAt, "dd MMM yyyy") : undefined}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">History</h3>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={entries.length === 0}>
                <Download className="size-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportCsv}>
                <FileText className="size-3.5" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportExcel}>
                <FileSpreadsheet className="size-3.5" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportPdf}>
                <FileText className="size-3.5" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canLog && (
            <Button size="sm" className="gap-1.5" onClick={openLog}>
              <Plus className="size-3.5" />
              Log service
            </Button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No repairs or services logged yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canLog ? "Each time work is done on this asset, log it here to keep its full history and cost." : "Entries appear here once someone logs work on this asset."}
          </p>
        </div>
      ) : (
        <ol className="relative">
          {entries.map((entry, index) => {
            const type = serviceTypeOf(entry.maintenanceType);
            const isLast = index === entries.length - 1;
            const meta = [entry.vendorName, entry.technicianName, entry.loggedByName && `Logged by ${entry.loggedByName}`].filter(Boolean);
            return (
              <li key={entry.id} className="group relative flex gap-3 pb-5 last:pb-0">
                <div className="relative flex w-3 shrink-0 justify-center">
                  <span className={cn("relative z-10 mt-1.5 size-2.5 rounded-full ring-4 ring-card", TYPE_DOT[type])} />
                  {!isLast && <span className="absolute top-4 bottom-[-4px] w-px bg-border" aria-hidden />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(entry.completedDate ?? entry.scheduledDate, "dd MMM yyyy")}
                      <span className="mx-1.5">·</span>
                      <span className="font-medium text-foreground/80">{serviceTypeLabel(entry.maintenanceType)}</span>
                    </p>
                    {canSeeCosts && entry.cost != null && (
                      <p className="text-sm font-semibold text-foreground tabular-nums">{Number(entry.cost) > 0 ? money(entry.cost) : "No cost"}</p>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{entry.title}</p>
                  {entry.notes && (
                    <p className="mt-1.5 rounded-lg bg-muted/50 px-3 py-2 text-sm whitespace-pre-line text-muted-foreground">{entry.notes}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">{meta.join(" · ")}</p>
                    {canLog && (
                      <div className="flex gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                        <Button variant="ghost" size="icon-sm" title="Edit entry" onClick={() => openEdit(entry)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Delete entry" onClick={() => setDeleting(entry)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {canLog && <ServiceEntryDialog assetId={assetId} entry={editing} open={dialogOpen} onOpenChange={setDialogOpen} />}

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              "{deleting?.title}" will be removed from this asset's history and from its total cost. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleteEntry.isPending} className="gap-1.5" onClick={handleDelete}>
              {deleteEntry.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
