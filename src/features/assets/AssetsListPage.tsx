import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, MoreHorizontal, MapPin, ChevronLeft, ChevronRight, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, ConditionBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";
import { useAssetsQuery } from "@/features/assets/api";
import { useCategoriesQuery, useLocationsQuery } from "@/features/catalog/api";
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

export function AssetsListPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");
  const canCreate = hasPermission(currentUser?.role, "canCreateAsset");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "all">("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [locationId, setLocationId] = useState<string>("all");
  const [page, setPage] = useState(1);

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

  const rows = assets.data?.data ?? [];
  const pagination = assets.data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="All Assets"
        description={pagination ? `${pagination.total} assets tracked across your organization` : "Loading assets..."}
        actions={
          canCreate && (
            <Button size="sm" className="gap-1.5" asChild>
              <Link to="/assets/new">
                <Plus className="size-3.5" />
                New Asset
              </Link>
            </Button>
          )
        }
      />

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
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Asset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Custodian</TableHead>
                  {canViewValuation && <TableHead className="text-right">Current Value</TableHead>}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((asset) => (
                  <TableRow key={asset.id} className="cursor-pointer">
                    <TableCell>
                      <Link to={`/assets/${asset.id}`} className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {asset.imageUrl ? (
                            <img src={asset.imageUrl} alt={asset.name} className="size-full object-cover" />
                          ) : (
                            <Box className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {asset.assetTag} {asset.brand && `· ${asset.brand} ${asset.model ?? ""}`}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={asset.status} />
                    </TableCell>
                    <TableCell>
                      <ConditionBadge condition={asset.condition} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{asset.locationName ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{asset.custodianName ?? "Unassigned"}</TableCell>
                    {canViewValuation && (
                      <TableCell className="text-right text-sm font-medium text-foreground">
                        {formatCurrency(asset.currentValue, org?.currency, org?.currencySymbol)}
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/assets/${asset.id}`}>View details</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">No assets match your filters.</div>
            )}
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {rows.map((asset) => (
              <Link key={asset.id} to={`/assets/${asset.id}`}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {asset.imageUrl ? (
                            <img src={asset.imageUrl} alt={asset.name} className="size-full object-cover" />
                          ) : (
                            <Box className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">{asset.assetTag}</p>
                        </div>
                      </div>
                      <StatusBadge status={asset.status} className="shrink-0" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {asset.locationName ?? "-"}
                      </span>
                      <ConditionBadge condition={asset.condition} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {rows.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">No assets match your filters.</div>
            )}
          </div>

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
        </>
      )}
    </div>
  );
}
