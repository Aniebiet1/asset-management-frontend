import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  ListFilter,
  Lock,
  Receipt,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { IconTile, StatTile } from "@/components/common/DashboardCard";
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
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { resolveLogoDataUrl } from "@/lib/pdfLogo";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import { useAuthStore } from "@/store/auth.store";
import type { Organization } from "@/types";

type DateFieldMode = "purchaseDate" | "depreciationDate";
type GroupByMode = "none" | "category" | "location" | "depreciationBucket";
type SortByMode = "purchaseDate" | "depreciationDate" | "currentValue" | "name" | "assetTag";

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

/** Local yyyy-mm-dd (what <input type="date"> holds), not UTC, so "today" matches the user's day. */
function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

const DATE_PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  { label: "Last 30 days", range: () => ({ from: isoDay(daysAgo(30)), to: isoDay(new Date()) }) },
  { label: "Last 90 days", range: () => ({ from: isoDay(daysAgo(90)), to: isoDay(new Date()) }) },
  { label: "This year", range: () => ({ from: `${new Date().getFullYear()}-01-01`, to: isoDay(new Date()) }) },
  { label: "Last 12 months", range: () => ({ from: isoDay(daysAgo(365)), to: isoDay(new Date()) }) },
];

function BuilderSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 space-y-3 px-4 py-4 sm:px-5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function BuilderField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
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
  const accessToken = useAuthStore((s) => s.accessToken);
  const logoSrc = useResolvedLogoSrc(org.logoUrl ?? null, accessToken);
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryId !== "all") count += 1;
    if (locationId !== "all") count += 1;
    if (custodianId !== "all") count += 1;
    if (dateFrom || dateTo) count += 1;
    return count;
  }, [categoryId, locationId, custodianId, dateFrom, dateTo]);

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
      { header: "Asset Type", accessor: (r) => r.categoryName },
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
  const handleExportPdf = async () => {
    const logoDataUrl = await resolveLogoDataUrl(logoSrc);
    exportRowsToPdf(displayRows, exportColumns, `${exportFilenameBase}.pdf`, "Asset Report", { orgName: org.name, logoDataUrl });
  };

  const activeFilterChips = [
    categoryId !== "all" && {
      key: "category",
      label: "Asset type",
      value: categoryById.get(categoryId)?.name ?? "Selected",
      clear: () => {
        setCategoryId("all");
        setPage(1);
      },
    },
    locationId !== "all" && {
      key: "location",
      label: "Location",
      value: locationById.get(locationId)?.name ?? "Selected",
      clear: () => {
        setLocationId("all");
        setPage(1);
      },
    },
    custodianId !== "all" && {
      key: "custodian",
      label: "Custodian",
      value: personById.get(custodianId)?.name ?? "Selected",
      clear: () => {
        setCustodianId("all");
        setPage(1);
      },
    },
    (dateFrom || dateTo) && {
      key: "dates",
      label: dateField === "purchaseDate" ? "Purchase date" : "Depreciation date",
      value: dateFrom && dateTo ? `${formatDate(dateFrom)} to ${formatDate(dateTo)}` : dateFrom ? `From ${formatDate(dateFrom)}` : `Until ${formatDate(dateTo)}`,
      clear: () => {
        setDateFrom("");
        setDateTo("");
        setPage(1);
      },
    },
  ].filter(Boolean) as { key: string; label: string; value: string; clear: () => void }[];

  const handleResetFilters = () => {
    setCategoryId("all");
    setLocationId("all");
    setCustodianId("all");
    setDateField("purchaseDate");
    setDateFrom("");
    setDateTo("");
    setSortBy("purchaseDate");
    setSortDir("desc");
    setGroupBy("none");
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
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:gap-4 xl:grid-cols-4">
          <StatTile label="Assets valued" value={valuationSummary.assetCount.toLocaleString()} icon={Boxes} />
          <StatTile
            label="Total purchase value"
            value={formatCompactCurrency(valuationSummary.totalPurchase, org.currency, org.currencySymbol)}
            hint={formatCurrency(valuationSummary.totalPurchase, org.currency, org.currencySymbol)}
            icon={Receipt}
          />
          <StatTile
            label="Total current value"
            value={formatCompactCurrency(valuationSummary.totalCurrent, org.currency, org.currencySymbol)}
            hint={formatCurrency(valuationSummary.totalCurrent, org.currency, org.currencySymbol)}
            icon={Wallet}
          />
          <StatTile label="Avg. depreciated" value={`${valuationSummary.avgPercentDepreciated.toFixed(1)}%`} icon={TrendingDown} />
        </div>
      )}

      <Card className="mb-3 gap-0 p-0 ring-foreground/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <IconTile icon={SlidersHorizontal} className="size-9" />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Build your report</h2>
              <p className="truncate text-xs text-muted-foreground">
                {report.isLoading ? "Loading assets..." : `${displayRows.length.toLocaleString()} asset${displayRows.length === 1 ? "" : "s"} on this page`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="h-8 gap-1.5 rounded-full text-xs lg:hidden"
            >
              {filtersOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {filtersOpen ? "Hide options" : "Options"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              disabled={activeFilterCount === 0 && sortBy === "purchaseDate" && sortDir === "desc" && groupBy === "none" && dateField === "purchaseDate"}
              className="h-8 gap-1.5 rounded-full text-xs"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 rounded-full px-3.5 text-xs" disabled={displayRows.length === 0}>
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
        </div>

        <div
          className={cn(
            "grid grid-cols-1 divide-y divide-border lg:grid-cols-[1fr_1.15fr_1fr] lg:divide-x lg:divide-y-0",
            !filtersOpen && "hidden lg:grid"
          )}
        >
          <BuilderSection icon={ListFilter} title="Filter">
            <BuilderField label="Asset type" htmlFor="report-category">
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="report-category" className="h-9 w-full text-[13px]">
                  <SelectValue placeholder="All asset types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All asset types</SelectItem>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </BuilderField>
            <BuilderField label="Location" htmlFor="report-location">
              <Select
                value={locationId}
                onValueChange={(v) => {
                  setLocationId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="report-location" className="h-9 w-full text-[13px]">
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
            </BuilderField>
            <BuilderField label="Custodian" htmlFor="report-custodian">
              <Select
                value={custodianId}
                onValueChange={(v) => {
                  setCustodianId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="report-custodian" className="h-9 w-full text-[13px]">
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
            </BuilderField>
          </BuilderSection>

          <BuilderSection icon={CalendarRange} title="Date range">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Filter by</p>
              <div role="radiogroup" aria-label="Date to filter by" className="grid grid-cols-2 gap-0.5 rounded-full bg-muted p-1">
                {(
                  [
                    ["purchaseDate", "Purchase date"],
                    ["depreciationDate", "Depreciation date"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={dateField === value}
                    onClick={() => {
                      setDateField(value);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                      dateField === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">One date at a time. Depreciation still shows as a column either way.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <BuilderField label="From" htmlFor="report-date-from">
                <Input
                  id="report-date-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-[13px]"
                />
              </BuilderField>
              <BuilderField label="To" htmlFor="report-date-to">
                <Input
                  id="report-date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-[13px]"
                />
              </BuilderField>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => {
                const range = preset.range();
                const isActive = dateFrom === range.from && dateTo === range.to;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setDateFrom(range.from);
                      setDateTo(range.to);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors ring-inset",
                      isActive ? "bg-primary/12 text-brand-link ring-primary/30" : "text-muted-foreground ring-border hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </BuilderSection>

          <BuilderSection icon={Layers} title="Arrange">
            <BuilderField label="Group rows" htmlFor="report-group">
              <Select
                value={groupBy}
                onValueChange={(v) => {
                  setGroupBy(v as GroupByMode);
                  setPage(1);
                }}
              >
                <SelectTrigger id="report-group" className="h-9 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="category">By asset type</SelectItem>
                  <SelectItem value="location">By location</SelectItem>
                  <SelectItem value="depreciationBucket" disabled={!canViewValuation}>
                    By depreciation bucket
                  </SelectItem>
                </SelectContent>
              </Select>
            </BuilderField>
            <BuilderField label="Sort by" htmlFor="report-sort">
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByMode)}>
                  <SelectTrigger id="report-sort" className="h-9 w-full min-w-0 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchaseDate">Purchase date</SelectItem>
                    <SelectItem value="depreciationDate">Depreciation date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="assetTag">Asset tag</SelectItem>
                    <SelectItem value="currentValue" disabled={!canViewValuation}>
                      Current value
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="size-9 shrink-0 bg-card"
                  aria-label={sortDir === "asc" ? "Sorted ascending, switch to descending" : "Sorted descending, switch to ascending"}
                  title={sortDir === "asc" ? "Ascending" : "Descending"}
                >
                  {sortDir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                </Button>
              </div>
            </BuilderField>
            <p className="text-[11px] text-muted-foreground">
              {sortDir === "asc" ? "Oldest and A to Z first." : "Newest and Z to A first."}
              {groupBy !== "none" && " Grouped views show up to 500 rows on one page."}
            </p>
          </BuilderSection>
        </div>
      </Card>

      {activeFilterChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Showing</span>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-card py-1 pr-1 pl-3 text-xs text-foreground shadow-sm ring-1 ring-foreground/[0.08]"
            >
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="max-w-48 truncate font-medium">{chip.value}</span>
              <button
                type="button"
                onClick={chip.clear}
                aria-label={`Remove ${chip.label} filter`}
                className="ml-0.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {activeFilterChips.length === 0 && <div className="mb-4" />}

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
                    <TableHead>Asset Type</TableHead>
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
