import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, ArrowLeftRight, Printer, MapPin, Building2, User as UserIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, ConditionBadge } from "@/components/common/StatusBadge";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/format";
import { mockAssets } from "@/lib/mock-data";
import { useAuthStore } from "@/store/auth.store";

export function AssetDetailPage() {
  const { id } = useParams();
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const asset = mockAssets.find((a) => a.id === id);
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");
  const canEdit = hasPermission(currentUser?.role, "canEditAsset");
  const canCheckInOut = hasPermission(currentUser?.role, "canCheckInOut");

  if (!asset) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-muted-foreground">Asset not found.</p>
        <Button variant="link" asChild>
          <Link to="/assets">Back to assets</Link>
        </Button>
      </div>
    );
  }

  const fields: { label: string; value: string | null; icon?: typeof MapPin }[] = [
    { label: "Location", value: asset.locationName ?? null, icon: MapPin },
    { label: "Department", value: asset.departmentName ?? null, icon: Building2 },
    { label: "Custodian", value: asset.custodianName ?? "Unassigned", icon: UserIcon },
    { label: "Purchase Date", value: formatDate(asset.purchaseDate), icon: Calendar },
  ];

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 gap-1.5 text-xs" asChild>
        <Link to="/assets">
          <ArrowLeft className="size-3.5" />
          Back to Assets
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{asset.name}</h1>
            <StatusBadge status={asset.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {asset.assetTag} {asset.brand && `· ${asset.brand} ${asset.model ?? ""}`} {asset.serialNumber && `· S/N ${asset.serialNumber}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Printer className="size-3.5" />
            Label
          </Button>
          {canCheckInOut && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/check-in-out">
                <ArrowLeftRight className="size-3.5" />
                Check Out
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button size="sm" className="gap-1.5">
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
          {fields.map((f) => (
            <Card key={f.label}>
              <CardContent className="p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  {f.icon && <f.icon className="size-3" />}
                  {f.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{f.value}</p>
              </CardContent>
            </Card>
          ))}

          <Card className="col-span-2 lg:col-span-4">
            <CardContent className="p-0">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Condition</p>
                      <ConditionBadge condition={asset.condition} className="mt-1" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="mt-1 font-medium text-foreground">{asset.categoryName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vendor</p>
                      <p className="mt-1 font-medium text-foreground">{asset.vendorName ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Warranty Expiry</p>
                      <p className="mt-1 font-medium text-foreground">{formatDate(asset.warrantyExpiry)}</p>
                    </div>
                    {canViewValuation && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Purchase Price</p>
                          <p className="mt-1 font-medium text-foreground">{formatCurrency(asset.purchasePrice, org?.currency, org?.currencySymbol)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Current Value</p>
                          <p className="mt-1 font-medium text-foreground">{formatCurrency(asset.currentValue, org?.currency, org?.currencySymbol)}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {asset.notes && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">{asset.notes}</div>
                  )}
                </TabsContent>
                <TabsContent value="history" className="p-4 text-sm text-muted-foreground">
                  Assignment history mock coming next pass.
                </TabsContent>
                <TabsContent value="maintenance" className="p-4 text-sm text-muted-foreground">
                  Maintenance records mock coming next pass.
                </TabsContent>
                <TabsContent value="files" className="p-4 text-sm text-muted-foreground">
                  Attached files mock coming next pass.
                </TabsContent>
                <TabsContent value="activity" className="p-4 text-sm text-muted-foreground">
                  Activity log mock coming next pass.
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex size-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
              QR / Barcode
            </div>
            <p className="font-mono text-xs text-muted-foreground">{asset.barcodeData}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
