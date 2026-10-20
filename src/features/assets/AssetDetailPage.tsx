import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, ArrowLeftRight, Printer, Loader2, MapPin, Building2, User as UserIcon, Calendar, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, ConditionBadge, MaintenanceStatusBadge } from "@/components/common/StatusBadge";
import { DashboardCard, IconTile, Meter } from "@/components/common/DashboardCard";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import { useAssetQuery, useAssetHistoryQuery, useAssetMaintenanceQuery } from "@/features/assets/api";
import { LabelPreview } from "@/features/labels/components/LabelPreview";
import { useLabelSheetLayoutQuery } from "@/features/labels/api";
import { generateSingleLabelPdf } from "@/features/labels/lib/labelPdf";
import { useAuthStore } from "@/store/auth.store";
import { CorrectTagDialog } from "@/features/assets/components/CorrectTagDialog";
import { useAssetValue } from "@/features/assets/useAssetValue";
import { ServiceHistoryTab } from "@/features/serviceHistory/ServiceHistoryTab";
import { useOrgFeature } from "@/lib/useOrgFeature";

export function AssetDetailPage() {
  const { id } = useParams();
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: asset, isLoading, isError } = useAssetQuery(id);
  const history = useAssetHistoryQuery(id);
  const maintenance = useAssetMaintenanceQuery(id);
  const canViewValuation = hasPermission(currentUser?.role, "canViewAssetValuation");
  const canEdit = hasPermission(currentUser?.role, "canEditAsset");
  const canEditIdentity = hasPermission(currentUser?.role, "canEditAssetIdentity");
  const canCheckInOut = hasPermission(currentUser?.role, "canCheckInOut");
  const canPrintLabels = hasPermission(currentUser?.role, "canPrintLabels");
  const logoSrc = useResolvedLogoSrc(org?.logoUrl ?? null, accessToken);
  const sheetLayout = useLabelSheetLayoutQuery({ enabled: canPrintLabels });
  const [isPrinting, setIsPrinting] = useState(false);
  const [correctTagOpen, setCorrectTagOpen] = useState(false);
  const valueOf = useAssetValue();
  const hasServiceHistory = useOrgFeature("serviceHistory");

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-muted-foreground">Asset not found.</p>
        <Button variant="link" asChild>
          <Link to="/assets">Back to assets</Link>
        </Button>
      </div>
    );
  }

  const handlePrintLabel = async () => {
    if (!org?.labelFormat || !sheetLayout.data) return;
    setIsPrinting(true);
    try {
      await generateSingleLabelPdf({
        asset: { assetTag: asset.assetTag },
        format: org.labelFormat,
        orgName: org.name,
        logoSrc,
        layout: sheetLayout.data,
      });
    } catch {
      toast.error("Couldn't generate the label PDF. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  };

  const purchase = Number(asset.purchasePrice ?? 0);
  const { value: currentValue, estimated: valueIsEstimate } = valueOf(asset);
  const current = currentValue ?? 0;
  const retained = purchase > 0 ? Math.max(0, Math.min(100, (current / purchase) * 100)) : null;
  const warrantyDays = asset.warrantyExpiry ? Math.ceil((new Date(asset.warrantyExpiry).getTime() - Date.now()) / 86_400_000) : null;

  const fields: { label: string; value: string | null; icon: typeof MapPin }[] = [
    { label: "Location", value: asset.locationName ?? "-", icon: MapPin },
    { label: "Department", value: asset.departmentName ?? "-", icon: Building2 },
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
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {canPrintLabels && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handlePrintLabel}
              disabled={!org?.labelFormat || !sheetLayout.data || isPrinting}
              title={!org?.labelFormat ? "Choose a label format in Settings first" : undefined}
            >
              {isPrinting ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
              Label
            </Button>
          )}
          {canCheckInOut && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/check-in-out">
                <ArrowLeftRight className="size-3.5" />
                Check Out
              </Link>
            </Button>
          )}
          {canEditIdentity && asset.subsidiaryId && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCorrectTagOpen(true)}>
              <ShieldAlert className="size-3.5" />
              Correct tag
            </Button>
          )}
          {canEdit && (
            <Button size="sm" className="gap-1.5" asChild>
              <Link to={`/assets/${asset.id}/edit`}>
                <Pencil className="size-3.5" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
          {fields.map((f) => (
            <Card key={f.label} className="gap-0 p-3.5 ring-foreground/[0.06]">
              <div className="flex min-w-0 items-center gap-3">
                <IconTile icon={f.icon} className="size-9" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">{f.label}</p>
                  <p className="truncate text-sm font-semibold text-foreground">{f.value}</p>
                </div>
              </div>
            </Card>
          ))}

          <Card className="col-span-2 lg:col-span-4">
            <CardContent className="p-0">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  {hasServiceHistory ? (
                    <TabsTrigger value="service-history">Service history</TabsTrigger>
                  ) : (
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="overview" className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Condition</p>
                      <ConditionBadge condition={asset.condition} className="mt-1" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Asset Type</p>
                      <p className="mt-1 font-medium text-foreground">{asset.categoryName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vendor</p>
                      <p className="mt-1 font-medium text-foreground">{asset.vendorName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Brand</p>
                      <p className="mt-1 font-medium text-foreground">{asset.brand ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="mt-1 font-medium text-foreground">{asset.model ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Serial number</p>
                      <p className="mt-1 truncate font-mono text-[13px] font-medium text-foreground">{asset.serialNumber ?? "-"}</p>
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
                          <p className="mt-1 font-medium text-foreground">
                            {currentValue == null ? "-" : formatCurrency(currentValue, org?.currency, org?.currencySymbol)}
                            {valueIsEstimate && <span className="ml-1 text-xs font-normal text-muted-foreground">(est.)</span>}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {asset.description && (
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="mt-1 text-sm text-foreground">{asset.description}</p>
                    </div>
                  )}
                  {asset.notes && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">{asset.notes}</div>
                  )}
                </TabsContent>
                <TabsContent value="history" className="p-4">
                  {history.isLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : history.data && history.data.length > 0 ? (
                    <div className="space-y-2">
                      {history.data.map((h) => (
                        <div key={h.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{h.userName ?? "Unknown user"}</p>
                            <p className="text-xs text-muted-foreground">
                              Checked out {formatDateTime(h.assignedAt)}
                              {h.returnedAt ? ` · Returned ${formatDateTime(h.returnedAt)}` : " · Not yet returned"}
                            </p>
                          </div>
                          <ConditionBadge condition={h.conditionOut} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No check-out history for this asset yet.</p>
                  )}
                </TabsContent>
                {hasServiceHistory && (
                  <TabsContent value="service-history" className="p-4">
                    <ServiceHistoryTab assetId={asset.id} />
                  </TabsContent>
                )}
                <TabsContent value="maintenance" className="p-4">
                  {maintenance.isLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : maintenance.data && maintenance.data.length > 0 ? (
                    <div className="space-y-2">
                      {maintenance.data.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{m.title}</p>
                            <p className="text-xs text-muted-foreground">Scheduled {formatDate(m.scheduledDate)}</p>
                          </div>
                          <MaintenanceStatusBadge status={m.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No maintenance records for this asset yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {(canViewValuation && retained != null) || warrantyDays != null ? (
            <DashboardCard title="Value and warranty">
              <div className="space-y-4">
                {canViewValuation && retained != null && (
                  <div>
                    <div className="flex items-center gap-3">
                      <IconTile icon={Wallet} className="size-9" />
                      <div className="min-w-0">
                        <p className="text-xl leading-tight font-semibold tracking-tight text-foreground tabular-nums">
                          {formatCurrency(current, org?.currency, org?.currencySymbol)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {valueIsEstimate ? "Estimated value" : "Current value"}, bought for{" "}
                          {formatCurrency(asset.purchasePrice, org?.currency, org?.currencySymbol)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 mb-1.5 text-[11px] text-muted-foreground">Value retained</p>
                    <Meter percent={retained} tone={retained < 25 ? "warning" : "brand"} />
                  </div>
                )}
                {warrantyDays != null && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <IconTile icon={warrantyDays < 0 ? ShieldAlert : ShieldCheck} tone={warrantyDays < 0 ? "neutral" : warrantyDays <= 30 ? "warning" : "brand"} className="size-9" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {warrantyDays < 0 ? "Warranty expired" : warrantyDays === 0 ? "Warranty ends today" : `${warrantyDays} days of warranty left`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{warrantyDays < 0 ? "Ended" : "Ends"} {formatDate(asset.warrantyExpiry)}</p>
                    </div>
                  </div>
                )}
              </div>
            </DashboardCard>
          ) : null}

          <Card className="h-fit">
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <LabelPreview format={org?.labelFormat ?? "qr_only"} orgName={org?.name ?? ""} logoSrc={logoSrc} assetTag={asset.assetTag} />
              {!org?.labelFormat && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Showing a default QR preview. Choose a label format in Settings to match what prints.
                </p>
              )}
            </CardContent>
          </Card>

          {asset.imageUrl && (
            <Card className="h-fit overflow-hidden">
              <CardContent className="p-0">
                <img src={asset.imageUrl} alt={asset.name} className="aspect-square w-full object-cover" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {canEditIdentity && (
        <CorrectTagDialog asset={asset} open={correctTagOpen} onOpenChange={setCorrectTagOpen} />
      )}
    </div>
  );
}
