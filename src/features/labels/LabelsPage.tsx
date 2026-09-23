import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Box, Loader2, Lock, Printer, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LabelPreview } from "@/features/labels/components/LabelPreview";
import { useLabelSheetLayoutQuery } from "@/features/labels/api";
import { generateLabelSheetPdf } from "@/features/labels/lib/labelPdf";
import { useAssetsQuery } from "@/features/assets/api";
import { useCategoriesQuery, useLocationsQuery } from "@/features/catalog/api";
import { hasPermission } from "@/lib/permissions";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import { useAuthStore } from "@/store/auth.store";
import type { AssetStatus } from "@/types";

const statusOptions: { value: AssetStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "in_maintenance", label: "In Maintenance" },
  { value: "reserved", label: "Reserved" },
  { value: "disposed", label: "Disposed" },
  { value: "lost", label: "Lost / Missing" },
];

const PAGE_SIZE = 25;

interface SelectedAsset {
  id: string;
  assetTag: string;
  name: string;
}

export function LabelsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const accessToken = useAuthStore((s) => s.accessToken);
  const canPrintLabels = hasPermission(currentUser?.role, "canPrintLabels");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "all">("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [locationId, setLocationId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<string, SelectedAsset>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);

  const categories = useCategoriesQuery();
  const locations = useLocationsQuery();
  const assets = useAssetsQuery({
    status: status === "all" ? undefined : status,
    categoryId: categoryId === "all" ? undefined : categoryId,
    locationId: locationId === "all" ? undefined : locationId,
    search: search.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const sheetLayout = useLabelSheetLayoutQuery({ enabled: canPrintLabels });
  const logoSrc = useResolvedLogoSrc(org?.logoUrl ?? null, accessToken);

  if (!canPrintLabels) {
    return (
      <div>
        <PageHeader title="Labels" description="Select assets to print physical labels for." />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-24 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">You don't have access to print labels</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Ask an organization admin or asset manager to print labels for you.
          </p>
        </div>
      </div>
    );
  }

  if (!org) return null;

  const rows = assets.data?.data ?? [];
  const pagination = assets.data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const rowsSelectedOnPage = rows.filter((a) => selected.has(a.id)).length;
  const allOnPageSelected = rows.length > 0 && rowsSelectedOnPage === rows.length;

  const toggleAsset = (id: string, assetTag: string, name: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(id, { id, assetTag, name });
      else next.delete(id);
      return next;
    });
  };

  const toggleAllOnPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const a of rows) {
        if (checked) next.set(a.id, { id: a.id, assetTag: a.assetTag, name: a.name });
        else next.delete(a.id);
      }
      return next;
    });
  };

  const selectedList = Array.from(selected.values());

  const handlePrint = async () => {
    if (!org.labelFormat || selectedList.length === 0 || !sheetLayout.data) return;
    setIsGenerating(true);
    try {
      await generateLabelSheetPdf({
        assets: selectedList,
        format: org.labelFormat,
        orgName: org.name,
        logoSrc,
        layout: sheetLayout.data,
        filename: `asset-labels-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      toast.success(`${selectedList.length} label${selectedList.length === 1 ? "" : "s"} exported`);
    } catch {
      toast.error("Couldn't generate the label PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Labels"
        description="Select the assets you want to print labels for, then export them as a PDF sheet."
        actions={
          <Button size="sm" className="gap-1.5" onClick={handlePrint} disabled={selectedList.length === 0 || !org.labelFormat || isGenerating}>
            {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
            Print {selectedList.length > 0 ? `${selectedList.length} ` : ""}Label{selectedList.length === 1 ? "" : "s"}
          </Button>
        }
      />

      {!org.labelFormat ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Settings2 className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No label format selected yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Choose the barcode/QR format your organization prints for assets in Settings before printing labels here.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/settings?tab=labels">Go to Settings</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, tag, serial..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as AssetStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                <SelectValue placeholder="All asset types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All asset types</SelectItem>
                {categories.data?.map((c) => (
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
                {locations.data?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {assets.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              {rows.length > 0 && (
                <div className="mb-2 flex items-center gap-2 lg:hidden">
                  <Checkbox checked={allOnPageSelected} onCheckedChange={(c) => toggleAllOnPage(c === true)} aria-label="Select all on this page" />
                  <span className="text-xs text-muted-foreground">Select all on this page</span>
                </div>
              )}

              {/* Desktop table */}
              <Card className="hidden overflow-hidden p-0 lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10">
                        <Checkbox checked={allOnPageSelected} onCheckedChange={(c) => toggleAllOnPage(c === true)} aria-label="Select all on this page" />
                      </TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((asset) => (
                      <TableRow key={asset.id} className="cursor-pointer" onClick={() => toggleAsset(asset.id, asset.assetTag, asset.name, !selected.has(asset.id))}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(asset.id)}
                            onCheckedChange={(c) => toggleAsset(asset.id, asset.assetTag, asset.name, c === true)}
                            aria-label={`Select ${asset.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                              {asset.imageUrl ? (
                                <img src={asset.imageUrl} alt={asset.name} className="size-full object-cover" />
                              ) : (
                                <Box className="size-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{asset.name}</p>
                              <p className="text-xs text-muted-foreground">{asset.assetTag}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={asset.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{asset.locationName ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground">No assets match your filters.</div>
                )}
              </Card>

              {/* Mobile cards */}
              <div className="space-y-2 lg:hidden">
                {rows.map((asset) => {
                  const isSelected = selected.has(asset.id);
                  return (
                    <Card
                      key={asset.id}
                      className={cn("cursor-pointer", isSelected && "border-primary/50 bg-primary/5")}
                      onClick={() => toggleAsset(asset.id, asset.assetTag, asset.name, !isSelected)}
                    >
                      <div className="flex items-center gap-3 p-3.5">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => toggleAsset(asset.id, asset.assetTag, asset.name, c === true)}
                            aria-label={`Select ${asset.name}`}
                          />
                        </div>
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {asset.imageUrl ? (
                            <img src={asset.imageUrl} alt={asset.name} className="size-full object-cover" />
                          ) : (
                            <Box className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{asset.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {asset.assetTag}
                            {asset.locationName && ` · ${asset.locationName}`}
                          </p>
                        </div>
                        <StatusBadge status={asset.status} className="shrink-0" />
                      </div>
                    </Card>
                  );
                })}
                {rows.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground">No assets match your filters.</div>
                )}
              </div>
            </>
          )}

          {pagination && pagination.total > pagination.pageSize && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {pagination.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
                  <ChevronLeft className="size-3.5" />
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {selectedList.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-foreground">
                Selected labels ({selectedList.length}) - {org.labelFormat ? "using your saved format" : ""}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">This is how each label will look on the printed sheet.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedList.map((a) => (
                  <LabelPreview key={a.id} format={org.labelFormat!} orgName={org.name} logoSrc={logoSrc} assetTag={a.assetTag} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
