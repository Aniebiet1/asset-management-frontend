import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Lock,
  RotateCcw,
} from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { useCategoriesQuery, useLocationsQuery } from "@/features/catalog/api";
import {
  useAssetReportQuery,
  usePeopleForReportsQuery,
  useValuationDepreciationReportQuery,
  type AssetReportRow,
} from "@/features/reports/api";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, type ExportColumn } from "@/features/reports/lib/export";
import {
  DEPRECIATION_BUCKET_ORDER,
  depreciationBucketBadgeClass,
  depreciationBucketLabel,
  type DepreciationBucket,
} from "@/features/reports/lib/grouping";
import { ApiError } from "@/lib/http-error";
import { computeDepreciation } from "@/lib/depreciation";
import { formatCurrency, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";
import type { Organization } from "@/types";

type DateFieldMode = "purchaseDate" | "depreciationDate";
type GroupByMode = "none" | "category" | "location" | "depreciationBucket";
type SortByMode = "purchaseDate" | "currentValue" | "name" | "assetTag";

const FLAT_PAGE_SIZE = 50;
/** The backend's own `pageSize` cap (`assetReportQuerySchema.pageSize.max(500)`) - used when
 * grouping so a group reflects more than a single 50-row page without a second endpoint. */
const GROUPED_PAGE_SIZE = 500;

interface DisplayRow {
  asset: AssetReportRow;
  categoryName: string;
  locationName: string;
  custodianName: string;
  currentValue: number | undefined;
  percentDepreciated: number | undefined;
}

function ReportsAccessDenied() {
  return (
    <div>
      <PageHeader title="Reports" description="Filterable asset reports with CSV, Excel and PDF export." />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-24 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Lock className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">You do not have access to reports</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Ask an organization admin or asset manager to run and export a report for you.
        </p>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const canExportReports = hasPermission(currentUser?.role, "canExportReports");
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");

  if (!canExportReports || !org) return <ReportsAccessDenied />;

  return <ReportsPageContent org={org} canViewValuation={canViewValuation} />;
}

function ReportsPageContent({ org, canViewValuation }: { org: Organization; canViewValuation: boolean }) {
  const [categoryId, setCategoryId] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [custodianId, setCustodianId] = useState("all");
  const [dateField, setDateField] = useState<DateFieldMode>("purchaseDate");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByMode>("none");
  const [sortBy, setSortBy] = useState<SortByMode>("purchaseDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const categories = useCategoriesQuery();
  const locations = useLocationsQuery();
  const people = usePeopleForReportsQuery();
  const valuation = useValuationDepreciationReportQuery({ enabled: canViewValuation });

  const pageSize = groupBy === "none" ? FLAT_PAGE_SIZE : GROUPED_PAGE_SIZE;
  const effectivePage = groupBy === "none" ? page : 1;

  const report = useAssetReportQuery({
    categoryId: categoryId === "all" ? undefined : categoryId,
    locationId: locationId === "all" ? undefined : locationId,
    custodianId: custodianId === "all" ? undefined : custodianId,
    dateField,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    sortDir,
    page: effectivePage,
    pageSize,
  });

  const categoryById = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c] as const)), [categories.data]);
  const locationById = useMemo(() => new Map((locations.data ?? []).map((l) => [l.id, l] as const)), [locations.data]);
  const personById = useMemo(() => new Map((people.data ?? []).map((p) => [p.id, p] as const)), [people.data]);

  const rows = report.data ?? [];
  const hasMore = rows.length >= pageSize;

  const displayRows: DisplayRow[] = useMemo(
    () =>
      rows.map((asset) => {
        const category = categoryById.get(asset.categoryId);
        const location = locationById.get(asset.locationId);
        const custodian = asset.custodianId ? personById.get(asset.custodianId) : undefined;

        let currentValue: number | undefined;
        let percentDepreciated: number | undefined;
        if (canViewValuation && asset.purchasePrice !== undefined && category) {
          const purchasePrice = Number(asset.purchasePrice);
          const salvageValue = asset.salvageValue !== undefined ? Number(asset.salvageValue) : 0;
          const depreciation = computeDepreciation(purchasePrice, salvageValue, asset.purchaseDate, category.usefulLifeMonths);
          currentValue = depreciation.currentValue;
          percentDepreciated = depreciation.percentDepreciated;
        }

        return {
          asset,
          categoryName: category?.name ?? "Uncategorized",
          locationName: location?.name ?? "-",
          custodianName: custodian?.name ?? "Unassigned",
          currentValue,
          percentDepreciated,
        };
      }),
    [rows, categoryById, locationById, personById, canViewValuation]
  );

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, DisplayRow[]>();
    for (const row of displayRows) {
      const key =
        groupBy === "category"
          ? row.categoryName
          : groupBy === "location"
            ? row.locationName
            : row.percentDepreciated !== undefined
              ? depreciationBucketLabel(row.percentDepreciated)
              : "Not available";
      const bucket = map.get(key) ?? [];
      bucket.push(row);
      map.set(key, bucket);
    }
    const entries = Array.from(map.entries());
    if (groupBy === "depreciationBucket") {
      entries.sort(
        (a, b) =>
          DEPRECIATION_BUCKET_ORDER.indexOf(a[0] as DepreciationBucket) -
          DEPRECIATION_BUCKET_ORDER.indexOf(b[0] as DepreciationBucket)
      );
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries;
  }, [displayRows, groupBy]);

  const valuationSummary = useMemo(() => {
    if (!valuation.data || valuation.data.length === 0) return null;
    let totalPurchase = 0;
    let totalCurrent = 0;
    let percentSum = 0;
    let counted = 0;
    for (const row of valuation.data) {
      if (row.purchasePrice === null) continue;
      const purchasePrice = Number(row.purchasePrice);
      const salvageValue = row.salvageValue !== null ? Number(row.salvageValue) : 0;
      const depreciation = computeDepreciation(purchasePrice, salvageValue, row.purchaseDate, row.usefulLifeMonths);
      totalPurchase += purchasePrice;
      totalCurrent += depreciation.currentValue;
      percentSum += depreciation.percentDepreciated;
      counted += 1;
    }
    if (counted === 0) return null;
    return { assetCount: counted, totalPurchase, totalCurrent, avgPercentDepreciated: percentSum / counted };
  }, [valuation.data]);

  const exportColumns: ExportColumn<DisplayRow>[] = useMemo(() => {
    const columns: ExportColumn<DisplayRow>[] = [
      { header: "Asset Tag", accessor: (r) => r.asset.assetTag },
      { header: "Name", accessor: (r) => r.asset.name },
      { header: "Category", accessor: (r) => r.categoryName },
      { header: "Location", accessor: (r) => r.locationName },
      { header: "Custodian", accessor: (r) => r.custodianName },
      { header: "Purchase Date", accessor: (r) => formatDate(r.asset.purchaseDate) },
      { header: "Depreciation Date", accessor: (r) => formatDate(r.asset.depreciationDate) },
    ];
    if (canViewValuation) {
      columns.push(
        {
          header: "Current Value",
          accessor: (r) => (r.currentValue !== undefined ? formatCurrency(r.currentValue, org.currency, org.currencySymbol) : "-"),
        },
        {
          header: "Percent Depreciated",
          accessor: (r) => (r.percentDepreciated !== undefined ? `${r.percentDepreciated.toFixed(1)}%` : "-"),
        }
      );
    }
    return columns;
  }, [canViewValuation, org.currency, org.currencySymbol]);

  const exportFilenameBase = `asset-report-${new Date().toISOString().slice(0, 10)}`;
  const handleExportCsv = () => exportRowsToCsv(displayRows, exportColumns, `${exportFilenameBase}.csv`);
  const handleExportExcel = () => exportRowsToExcel(displayRows, exportColumns, `${exportFilenameBase}.xlsx`);
  const handleExportPdf = () => exportRowsToPdf(displayRows, exportColumns, `${exportFilenameBase}.pdf`, "Asset Report");

  const handleResetFilters = () => {
    setCategoryId("all");
    setLocationId("all");
    setCustodianId("all");
    setDateField("purchaseDate");
    setDateFrom("");
    setDateTo("");
    setSortBy("purchaseDate");
    setSortDir("desc");
    setPage(1);
  };

  const columnCount = canViewValuation ? 8 : 6;

  function renderRow(row: DisplayRow) {
    return (
      <TableRow key={row.asset.id}>
        <TableCell>
          <p className="font-medium text-foreground">{row.asset.name}</p>
          <p className="text-xs text-muted-foreground">{row.asset.assetTag}</p>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{row.categoryName}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{row.locationName}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{row.custodianName}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{formatDate(row.asset.purchaseDate)}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{formatDate(row.asset.depreciationDate)}</TableCell>
        {canViewValuation && (
          <TableCell className="text-right text-sm font-medium text-foreground">
            {row.currentValue !== undefined ? formatCurrency(row.currentValue, org.currency, org.currencySymbol) : "-"}
          </TableCell>
        )}
        {canViewValuation && (
          <TableCell className="text-right">
            {row.percentDepreciated !== undefined ? (
              <Badge variant="outline" className={depreciationBucketBadgeClass(row.percentDepreciated)}>
                {row.percentDepreciated.toFixed(1)}%
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        )}
      </TableRow>
    );
  }

  return (
    <div>
      <PageHeader title="Reports" description="Filterable asset reports with CSV, Excel and PDF export." />

      {canViewValuation && valuationSummary && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Assets valued</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{valuationSummary.assetCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total purchase value</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(valuationSummary.totalPurchase, org.currency, org.currencySymbol)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total current value</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(valuationSummary.totalCurrent, org.currency, org.currencySymbol)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg. percent depreciated</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{valuationSummary.avgPercentDepreciated.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Filtering by how depreciated an asset is (percent or remaining book value) is not available as a
          standalone range filter yet, the backend currently supports one date-based filter at a time. Percent
          depreciated is still shown as a column and can be combined with the "Depreciation bucket" group-by
          option below.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs sm:w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={locationId}
          onValueChange={(v) => {
            setLocationId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs sm:w-40">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {(locations.data ?? []).map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={custodianId}
          onValueChange={(v) => {
            setCustodianId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs sm:w-44">
            <SelectValue placeholder="All custodians" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All custodians</SelectItem>
            {(people.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-lg border border-input p-0.5">
          <button
            type="button"
            onClick={() => {
              setDateField("purchaseDate");
              setPage(1);
            }}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs transition-colors",
              dateField === "purchaseDate" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Purchase date
          </button>
          <button
            type="button"
            onClick={() => {
              setDateField("depreciationDate");
              setPage(1);
            }}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs transition-colors",
              dateField === "depreciationDate" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Depreciation date
          </button>
        </div>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="h-8 w-full text-xs sm:w-36"
          aria-label="Date from"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="h-8 w-full text-xs sm:w-36"
          aria-label="Date to"
        />

        <Button variant="ghost" size="sm" onClick={handleResetFilters} className="gap-1.5 text-xs">
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={groupBy}
            onValueChange={(v) => {
              setGroupBy(v as GroupByMode);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="category">Group by category</SelectItem>
              <SelectItem value="location">Group by location</SelectItem>
              <SelectItem value="depreciationBucket" disabled={!canViewValuation}>
                Group by depreciation bucket
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByMode)}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchaseDate">Sort: Purchase date</SelectItem>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="assetTag">Sort: Asset tag</SelectItem>
              <SelectItem value="currentValue" disabled={!canViewValuation}>
                Sort: Current value
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="h-8 gap-1.5 text-xs"
          >
            {sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
            {sortDir === "asc" ? "Ascending" : "Descending"}
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={displayRows.length === 0}>
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
      </div>

      {report.isError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {report.error instanceof ApiError ? report.error.message : "Could not load the report. Please try again."}
        </div>
      )}

      {report.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Custodian</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Depreciation Date</TableHead>
                    {canViewValuation && <TableHead className="text-right">Current Value</TableHead>}
                    {canViewValuation && <TableHead className="text-right">% Depreciated</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupBy === "none"
                    ? displayRows.map(renderRow)
                    : (groups ?? []).flatMap(([label, groupRows]) => [
                        <TableRow key={`group-${label}`} className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={columnCount} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {label}
                            <span className="ml-2 font-normal normal-case text-muted-foreground/70">({groupRows.length})</span>
                          </TableCell>
                        </TableRow>,
                        ...groupRows.map(renderRow),
                      ])}
                </TableBody>
              </Table>
            </div>
            {displayRows.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">No assets match your filters.</div>
            )}
          </Card>

          {groupBy === "none" && displayRows.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page}
                {!hasMore && " (last page)"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
                  <ChevronLeft className="size-3.5" />
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="gap-1">
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
