import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, SlidersHorizontal, MoreHorizontal, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, ConditionBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";
import { mockAssets } from "@/lib/mock-data";
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

export function AssetsListPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");
  const canCreate = hasPermission(currentUser?.role, "canCreateAsset");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "all">("all");

  const filtered = useMemo(() => {
    return mockAssets.filter((a) => {
      const matchesStatus = status === "all" || a.status === status;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        (a.serialNumber ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [search, status]);

  return (
    <div>
      <PageHeader
        title="All Assets"
        description={`${mockAssets.length} assets tracked across your organization`}
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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, tag, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as AssetStatus | "all")}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-44">
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
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <SlidersHorizontal className="size-3.5" />
          More Filters
        </Button>
      </div>

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
            {filtered.map((asset) => (
              <TableRow key={asset.id} className="cursor-pointer">
                <TableCell>
                  <Link to={`/assets/${asset.id}`} className="block">
                    <p className="font-medium text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.assetTag} {asset.brand && `· ${asset.brand} ${asset.model ?? ""}`}
                    </p>
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={asset.status} />
                </TableCell>
                <TableCell>
                  <ConditionBadge condition={asset.condition} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{asset.locationName}</TableCell>
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
                      <DropdownMenuItem>Check out</DropdownMenuItem>
                      <DropdownMenuItem>Print label</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No assets match your filters.</div>
        )}
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((asset) => (
          <Link key={asset.id} to={`/assets/${asset.id}`}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.assetTag}</p>
                  </div>
                  <StatusBadge status={asset.status} className="shrink-0" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {asset.locationName}
                  </span>
                  <ConditionBadge condition={asset.condition} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No assets match your filters.</div>
        )}
      </div>
    </div>
  );
}
