import { useState } from "react";
import { AlarmClock, ArrowLeftRight, Box, CalendarClock, Camera, ExternalLink, Loader2, Printer, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardCard, Meter, StatTile } from "@/components/common/DashboardCard";
import { ConditionBadge, StatusBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateTime, getInitials } from "@/lib/format";
import { ApiError } from "@/lib/http-error";
import { resolveLogoDataUrl } from "@/lib/pdfLogo";
import { hexToRgb, readableForeground } from "@/lib/color";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import { useAssetsQuery } from "@/features/assets/api";
import {
  fetchReceipt,
  useActiveAssignmentsQuery,
  useAssetsByIdsQuery,
  useCheckinMutation,
  useCheckoutMutation,
  usePeopleQuery,
} from "@/features/check-in-out/api";
import { BarcodeScanner } from "@/features/check-in-out/components/BarcodeScanner";
import { loanStatus } from "@/features/check-in-out/loanStatus";
import { useAssetValue } from "@/features/assets/useAssetValue";
import { useAuthStore } from "@/store/auth.store";
import type { AssetAssignment, SelectableAssetCondition } from "@/types";

const CONDITIONS: SelectableAssetCondition[] = ["excellent", "good", "fair", "poor", "damaged"];
const CONDITION_LABEL: Record<SelectableAssetCondition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function CheckInOutPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logoSrc = useResolvedLogoSrc(org?.logoUrl ?? null, accessToken);
  const canCheckInOut = hasPermission(currentUser?.role, "canCheckInOut");
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");

  const [inputValue, setInputValue] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [custodianId, setCustodianId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [conditionOut, setConditionOut] = useState<SelectableAssetCondition>("good");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [checkinTarget, setCheckinTarget] = useState<AssetAssignment | null>(null);
  const [conditionIn, setConditionIn] = useState<SelectableAssetCondition>("good");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);

  const [printingId, setPrintingId] = useState<string | null>(null);

  const assetsQuery = useAssetsQuery({ search: activeQuery, pageSize: 10 }, { enabled: activeQuery.trim().length > 0 });
  const assignmentsQuery = useActiveAssignmentsQuery();
  const peopleQuery = usePeopleQuery();
  const checkoutMutation = useCheckoutMutation();
  const checkinMutation = useCheckinMutation();

  const activeAssignments = assignmentsQuery.data?.active ?? [];
  const overdueIds = new Set((assignmentsQuery.data?.overdue ?? []).map((a) => a.id));
  const { byId: assetsById } = useAssetsByIdsQuery(activeAssignments.map((a) => a.assetId));
  const peopleById = new Map((peopleQuery.data ?? []).map((u) => [u.id, u]));
  const valueOf = useAssetValue();
  // Captured once per mount so loan bars and the "due this week" count don't shift between renders.
  const [now] = useState(() => Date.now());
  const loans = activeAssignments
    .map((assignment) => ({ assignment, status: loanStatus(assignment, now, overdueIds.has(assignment.id)) }))
    // Late first, then soonest due, then open-ended loans last.
    .sort((a, b) => Number(b.status.overdue) - Number(a.status.overdue) || (a.status.daysLeft ?? Infinity) - (b.status.daysLeft ?? Infinity));
  const dueThisWeek = loans.filter((l) => !l.status.overdue && l.status.daysLeft != null && l.status.daysLeft <= 7).length;

  const matches = assetsQuery.data?.data ?? [];
  // A scan (or a typed full tag) is an exact identifier: when one result's tag matches it exactly,
  // take that one even if the contains-search also returned batch siblings (TAG-004-A, ...).
  const exactTagMatch = matches.find((a) => a.assetTag.toLowerCase() === activeQuery.trim().toLowerCase()) ?? null;
  const selectedAsset =
    matches.find((a) => a.id === selectedAssetId) ?? exactTagMatch ?? (matches.length === 1 ? matches[0] : null);
  const assignmentForSelected = selectedAsset
    ? activeAssignments.find((a) => a.assetId === selectedAsset.id) ?? null
    : null;

  function resetSearch() {
    setInputValue("");
    setActiveQuery("");
    setSelectedAssetId(null);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuery(inputValue.trim());
    setSelectedAssetId(null);
  }

  function handleScanDetected(text: string) {
    setScannerOpen(false);
    setInputValue(text);
    setActiveQuery(text.trim());
    setSelectedAssetId(null);
  }

  function openCheckoutDialog() {
    setCustodianId("");
    setExpectedReturnDate("");
    setConditionOut("good");
    setCheckoutNotes("");
    setCheckoutError(null);
    setCheckoutOpen(true);
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAsset) return;
    if (!custodianId) {
      setCheckoutError("Choose who this asset is being checked out to.");
      return;
    }
    setCheckoutError(null);
    try {
      await checkoutMutation.mutateAsync({
        assetId: selectedAsset.id,
        userId: custodianId,
        expectedReturnDate: expectedReturnDate || undefined,
        conditionOut,
        notes: checkoutNotes.trim() || undefined,
      });
      toast.success(`${selectedAsset.name} checked out`);
      setCheckoutOpen(false);
      resetSearch();
    } catch (err) {
      setCheckoutError(errorMessage(err, "Couldn't check out this asset. Please try again."));
    }
  }

  function openCheckinDialog(assignment: AssetAssignment) {
    setCheckinTarget(assignment);
    setConditionIn("good");
    setCheckinNotes("");
    setCheckinError(null);
  }

  async function handleCheckinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkinTarget) return;
    setCheckinError(null);
    try {
      await checkinMutation.mutateAsync({
        assignmentId: checkinTarget.id,
        conditionIn,
        notes: checkinNotes.trim() || undefined,
      });
      toast.success("Asset checked in");
      setCheckinTarget(null);
      resetSearch();
    } catch (err) {
      setCheckinError(errorMessage(err, "Couldn't check in this asset. Please try again."));
    }
  }

  async function handlePrintReceipt(assignment: AssetAssignment) {
    setPrintingId(assignment.id);
    try {
      const receipt = await fetchReceipt(assignment.id);
      const asset = assetsById.get(receipt.assetId);
      const person = peopleById.get(receipt.userId);
      const doc = new jsPDF({ unit: "mm", format: "a5" });
      const logoDataUrl = await resolveLogoDataUrl(logoSrc);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 12;

      const primaryRgb = hexToRgb(org?.primaryColor ?? "") ?? [23, 23, 23];
      const bandForeground = readableForeground(org?.primaryColor ?? "#171717");
      const foregroundRgb = hexToRgb(bandForeground) ?? [250, 250, 250];
      const isReturned = Boolean(receipt.returnedAt);
      const statusLabel = isReturned ? "RETURNED" : "ACTIVE";
      const statusRgb: [number, number, number] = isReturned ? [5, 150, 105] : [37, 99, 235];
      const conditionRgb: Record<SelectableAssetCondition, [number, number, number]> = {
        excellent: [5, 150, 105],
        good: [37, 99, 235],
        fair: [217, 119, 6],
        poor: [234, 88, 12],
        damaged: [220, 38, 38],
      };

      // Header band, tinted with the org's brand color so the receipt matches the app theme.
      const bandHeight = 30;
      doc.setFillColor(...(primaryRgb as [number, number, number]));
      doc.rect(0, 0, pageWidth, bandHeight, "F");

      let titleX = marginX;
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, marginX, 8, 13, 13);
          titleX = marginX + 13 + 4;
        } catch {
          // Unsupported image encoding for jsPDF - fall back to a text-only header.
        }
      }

      doc.setTextColor(...(foregroundRgb as [number, number, number]));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(org?.name ?? "TecresTrackIT AMS", titleX, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Asset Check-Out Receipt", titleX, 21.5);

      // Status pill, top right of the band.
      const pillLabel = statusLabel;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      const pillTextWidth = doc.getTextWidth(pillLabel);
      const pillWidth = pillTextWidth + 8;
      const pillX = pageWidth - marginX - pillWidth;
      doc.setFillColor(...statusRgb);
      doc.roundedRect(pillX, 8, pillWidth, 6.5, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(pillLabel, pillX + pillWidth / 2, 12.4, { align: "center" });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...(foregroundRgb as [number, number, number]));
      doc.text(`No. ${receipt.receiptNo ?? receipt.id}`, pageWidth - marginX, 20, { align: "right" });

      // Info table.
      const rows: [string, string][] = [
        ["Asset", asset ? `${asset.name} (${asset.assetTag})` : receipt.assetId],
        ["Custodian", person?.name ?? receipt.userId],
        ["Checked Out", formatDateTime(receipt.assignedAt)],
        ["Expected Return", receipt.expectedReturnDate ? formatDate(receipt.expectedReturnDate) : "Not set"],
        ["Condition Out", CONDITION_LABEL[receipt.conditionOut as SelectableAssetCondition] ?? receipt.conditionOut],
        ["Returned", receipt.returnedAt ? formatDateTime(receipt.returnedAt) : "Not yet returned"],
      ];
      if (receipt.notes) rows.push(["Notes", receipt.notes]);

      autoTable(doc, {
        startY: bandHeight + 8,
        margin: { left: marginX, right: marginX },
        body: rows,
        theme: "plain",
        styles: { fontSize: 9.5, cellPadding: { top: 3.2, bottom: 3.2, left: 0, right: 2 }, lineColor: [230, 230, 230] },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [115, 115, 115], cellWidth: 38 },
          1: { textColor: [23, 23, 23] },
        },
        didParseCell: (data) => {
          if (data.section !== "body" || data.column.index !== 1) return;
          const label = rows[data.row.index]?.[0];
          if (label === "Condition Out") {
            data.cell.styles.textColor = conditionRgb[receipt.conditionOut as SelectableAssetCondition] ?? [23, 23, 23];
            data.cell.styles.fontStyle = "bold";
          }
          if (label === "Returned") {
            data.cell.styles.textColor = statusRgb;
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.row.index === rows.length - 1) return;
          doc.setDrawColor(230, 230, 230);
          doc.line(marginX, data.cell.y + data.cell.height, pageWidth - marginX, data.cell.y + data.cell.height);
        },
      });

      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      // Signature line for physical custody handoff.
      const sigY = Math.max(finalY + 24, pageHeight - 34);
      doc.setDrawColor(180, 180, 180);
      doc.line(marginX, sigY, marginX + 58, sigY);
      doc.line(pageWidth - marginX - 40, sigY, pageWidth - marginX, sigY);
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      doc.text("Custodian signature", marginX, sigY + 4);
      doc.text("Date", pageWidth - marginX - 40, sigY + 4);

      // Footer.
      doc.setDrawColor(230, 230, 230);
      doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated by ${org?.name ?? "TecresTrackIT AMS"} on ${formatDateTime(new Date().toISOString())}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" }
      );

      doc.save(`receipt-${receipt.receiptNo ?? receipt.id}.pdf`);
      toast.success("Receipt downloaded");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't generate the receipt. Please try again."));
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Check-Out / Return"
        description="Scan or search an asset to check it out to a custodian, or process a return."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:grid-cols-3 sm:gap-4">
        <StatTile label="Checked out" value={assignmentsQuery.isLoading ? "-" : activeAssignments.length} icon={ArrowLeftRight} />
        <StatTile
          label="Overdue returns"
          value={assignmentsQuery.isLoading ? "-" : overdueIds.size}
          icon={AlarmClock}
          tone={overdueIds.size > 0 ? "critical" : "brand"}
        />
        <div className="col-span-2 sm:col-span-1">
          <StatTile
            label="Due in the next 7 days"
            value={assignmentsQuery.isLoading ? "-" : dueThisWeek}
            icon={CalendarClock}
            tone={dueThisWeek > 0 ? "warning" : "brand"}
          />
        </div>
      </div>

      <Card className="mb-4 sm:mb-5">
        <CardContent className="space-y-3 p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Scan or type an asset tag, name, brand, model or serial number"
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-1.5 sm:flex-none">
                <Search className="size-3.5" />
                Search
              </Button>
              <Button type="button" variant="outline" className="flex-1 gap-1.5 sm:flex-none" onClick={() => setScannerOpen((v) => !v)}>
                <Camera className="size-3.5" />
                {scannerOpen ? "Cancel Scan" : "Scan"}
              </Button>
            </div>
          </form>

          {scannerOpen && (
            <div className="rounded-lg border border-dashed border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Point the camera at a barcode or QR code</p>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setScannerOpen(false)}>
                  <X className="size-3.5" />
                </Button>
              </div>
              <BarcodeScanner
                onDetected={handleScanDetected}
                onError={(message) => {
                  toast.error(message);
                  setScannerOpen(false);
                }}
              />
            </div>
          )}

          {activeQuery && (
            <div>
              {assetsQuery.isFetching ? (
                <Skeleton className="h-14 w-full" />
              ) : matches.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  No asset matches "{activeQuery}".
                </p>
              ) : matches.length > 1 && !selectedAsset ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{matches.length} assets matched, pick one:</p>
                  {matches.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAssetId(asset.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {asset.imageUrl ? (
                            <img src={asset.imageUrl} alt={asset.name} className="size-full object-cover" />
                          ) : (
                            <Box className="size-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{asset.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">{asset.assetTag}</span>
                        </span>
                      </span>
                      <span className="shrink-0">
                        <StatusBadge status={asset.status} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : selectedAsset ? (
                <div className="rounded-lg border border-border p-4">
                  <div className="flex gap-3">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted sm:size-20">
                      {selectedAsset.imageUrl ? (
                        <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="size-full object-cover" />
                      ) : (
                        <Box className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{selectedAsset.name}</p>
                        <StatusBadge status={selectedAsset.status} />
                        <ConditionBadge condition={selectedAsset.condition} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedAsset.assetTag}</p>
                      {(selectedAsset.brand || selectedAsset.model) && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {[selectedAsset.brand, selectedAsset.model].filter(Boolean).join(" ")}
                        </p>
                      )}
                      {selectedAsset.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{selectedAsset.description}</p>
                      )}
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border pt-3 sm:grid-cols-3">
                    <AssetDetail label="Asset Type" value={selectedAsset.categoryName} />
                    <AssetDetail label="Location" value={selectedAsset.locationName} />
                    <AssetDetail label="Department" value={selectedAsset.departmentName} />
                    <AssetDetail label="Serial number" value={selectedAsset.serialNumber} mono />
                    <AssetDetail label="Custodian" value={selectedAsset.custodianName ?? "Unassigned"} />
                    <AssetDetail label="Vendor" value={selectedAsset.vendorName} />
                    <AssetDetail
                      label="Purchased"
                      value={selectedAsset.purchaseDate ? formatDate(selectedAsset.purchaseDate) : null}
                    />
                    <AssetDetail
                      label="Warranty ends"
                      value={selectedAsset.warrantyExpiry ? formatDate(selectedAsset.warrantyExpiry) : null}
                    />
                    {canViewValuation && (
                      <AssetDetail
                        label="Current value"
                        value={(() => {
                          const { value, estimated } = valueOf(selectedAsset);
                          if (value == null) return null;
                          return `${formatCurrency(value, org?.currency, org?.currencySymbol)}${estimated ? " (est.)" : ""}`;
                        })()}
                      />
                    )}
                    {assignmentForSelected && (
                      <>
                        <AssetDetail label="Checked out" value={formatDateTime(assignmentForSelected.assignedAt)} />
                        <AssetDetail
                          label="Due back"
                          value={
                            assignmentForSelected.expectedReturnDate
                              ? formatDate(assignmentForSelected.expectedReturnDate)
                              : null
                          }
                        />
                      </>
                    )}
                  </dl>

                  {selectedAsset.notes && (
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Notes: </span>
                      {selectedAsset.notes}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {selectedAsset.status === "available" && canCheckInOut && (
                      <Button type="button" size="sm" onClick={openCheckoutDialog}>
                        Check Out
                      </Button>
                    )}
                    {selectedAsset.status === "in_use" && canCheckInOut && assignmentForSelected && (
                      <Button type="button" size="sm" onClick={() => openCheckinDialog(assignmentForSelected)}>
                        Check In
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link to={`/assets/${selectedAsset.id}`}>
                        <ExternalLink className="size-3.5" />
                        View full details
                      </Link>
                    </Button>
                    {matches.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedAssetId(null)}>
                        Back to results
                      </Button>
                    )}
                    {selectedAsset.status === "in_use" && !assignmentForSelected && (
                      <p className="text-xs text-muted-foreground">
                        Marked in use, but no matching open assignment was found.
                      </p>
                    )}
                    {!["available", "in_use"].includes(selectedAsset.status) && (
                      <p className="text-xs text-muted-foreground">
                        This asset can't be checked out or in while {humanizeStatus(selectedAsset.status)}.
                      </p>
                    )}
                    {!canCheckInOut && ["available", "in_use"].includes(selectedAsset.status) && (
                      <p className="text-xs text-muted-foreground">You don't have permission to check assets in or out.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardCard title="Active check-outs" description="Late returns first, then whatever is due back soonest.">
        {assignmentsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : loans.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No assets are currently checked out.</p>
        ) : (
          <ul className="-mx-4 divide-y divide-border sm:-mx-5">
            {loans.map(({ assignment, status }) => {
              const asset = assetsById.get(assignment.assetId);
              const person = peopleById.get(assignment.userId);
              const personName = person?.name ?? assignment.userName ?? "Unknown custodian";
              return (
                <li
                  key={assignment.id}
                  className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:px-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] md:items-center md:gap-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Box className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      {asset ? (
                        <Link to={`/assets/${asset.id}`} className="block truncate font-medium text-foreground hover:underline">
                          {asset.name}
                        </Link>
                      ) : (
                        <p className="truncate font-medium text-muted-foreground">Loading asset...</p>
                      )}
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{asset?.assetTag ?? ""}</p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-2 text-[13px]">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/75 text-[10px] font-semibold">
                      {getInitials(personName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{personName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">Out since {formatDate(assignment.assignedAt)}</p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px]">
                      <span className={status.overdue ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>{status.text}</span>
                      {assignment.expectedReturnDate && <span className="text-muted-foreground">Due {formatDate(assignment.expectedReturnDate)}</span>}
                    </div>
                    {status.percent == null ? (
                      <p className="text-xs text-muted-foreground">Open-ended loan</p>
                    ) : (
                      <Meter percent={status.percent} tone={status.overdue ? "critical" : "brand"} label={status.overdue ? "Late" : undefined} />
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2 md:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 md:flex-none"
                      disabled={printingId === assignment.id}
                      onClick={() => handlePrintReceipt(assignment)}
                    >
                      {printingId === assignment.id ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
                      Receipt
                    </Button>
                    {canCheckInOut && (
                      <Button type="button" size="sm" className="flex-1 md:flex-none" onClick={() => openCheckinDialog(assignment)}>
                        Check In
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardCard>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check out {selectedAsset?.name}</DialogTitle>
            <DialogDescription>Assign this asset to a custodian.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckoutSubmit} className="space-y-4">
            <FormField label="Custodian" htmlFor="custodianId" required>
              <Select value={custodianId} onValueChange={setCustodianId}>
                <SelectTrigger id="custodianId" className="w-full">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {(peopleQuery.data ?? [])
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Expected return date" htmlFor="expectedReturnDate" hint="Optional">
              <Input
                id="expectedReturnDate"
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </FormField>
            <FormField label="Condition at check-out" htmlFor="conditionOut">
              <Select value={conditionOut} onValueChange={(v) => setConditionOut(v as SelectableAssetCondition)}>
                <SelectTrigger id="conditionOut" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Notes" htmlFor="checkoutNotes" hint="Optional">
              <Textarea id="checkoutNotes" value={checkoutNotes} onChange={(e) => setCheckoutNotes(e.target.value)} />
            </FormField>
            {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCheckoutOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={checkoutMutation.isPending} className="gap-1.5">
                {checkoutMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Check Out
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkinTarget} onOpenChange={(open) => !open && setCheckinTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check in {checkinTarget ? assetsById.get(checkinTarget.assetId)?.name ?? "asset" : ""}</DialogTitle>
            <DialogDescription>Record the condition this asset is being returned in.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckinSubmit} className="space-y-4">
            <FormField label="Condition at check-in" htmlFor="conditionIn" required>
              <Select value={conditionIn} onValueChange={(v) => setConditionIn(v as SelectableAssetCondition)}>
                <SelectTrigger id="conditionIn" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conditionIn === "damaged" && (
                <p className="text-[11px] text-muted-foreground">
                  Marking this damaged moves the asset to "In Maintenance" instead of "Available".
                </p>
              )}
            </FormField>
            <FormField label="Notes" htmlFor="checkinNotes" hint="Optional">
              <Textarea id="checkinNotes" value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} />
            </FormField>
            {checkinError && <p className="text-sm text-destructive">{checkinError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCheckinTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={checkinMutation.isPending} className="gap-1.5">
                {checkinMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Check In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetDetail({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-sm text-foreground", mono && "font-mono text-xs")}>{value || "-"}</dd>
    </div>
  );
}

function humanizeStatus(status: string): string {
  return status.replace(/_/g, " ");
}