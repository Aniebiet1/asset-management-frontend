import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabelPreview } from "@/features/labels/components/LabelPreview";
import { useLabelSheetLayoutQuery, useSaveLabelSheetLayoutMutation } from "@/features/labels/api";
import { useAssetsQuery } from "@/features/assets/api";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http-error";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "cn";
import type { LabelFormat, LabelSheetLayout, Organization } from "@/types";

const LABEL_FORMATS: { value: LabelFormat; title: string; description: string }[] = [
  { value: "barcode_qr", title: "Barcode + QR", description: "Barcode with tag text on the left, QR code on the right." },
  { value: "barcode_only", title: "Barcode only", description: "Compact label with just the barcode and tag text." },
  { value: "qr_only", title: "QR only", description: "QR code with the tag text beneath it, no barcode." },
];

const PAGE_SIZES: { value: LabelSheetLayout["pageSize"]; label: string; mm: [number, number] }[] = [
  { value: "a4", label: "A4", mm: [210, 297] },
  { value: "letter", label: "Letter", mm: [215.9, 279.4] },
];

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 text-xs"
      />
    </div>
  );
}

function SheetPreview({ layout }: { layout: LabelSheetLayout }) {
  const [pageW, pageH] = PAGE_SIZES.find((p) => p.value === layout.pageSize)?.mm ?? PAGE_SIZES[0].mm;
  const cells = Array.from({ length: layout.columns * layout.rows });

  return (
    <div
      className="relative mx-auto rounded-sm border border-border bg-card shadow-sm"
      style={{ width: 140, aspectRatio: `${pageW} / ${pageH}` }}
    >
      {cells.map((_, i) => {
        const col = i % layout.columns;
        const row = Math.floor(i / layout.columns);
        const x = layout.marginLeftMm + col * (layout.labelWidthMm + layout.gapHorizontalMm);
        const y = layout.marginTopMm + row * (layout.labelHeightMm + layout.gapVerticalMm);
        if (x + layout.labelWidthMm > pageW || y + layout.labelHeightMm > pageH) return null;
        return (
          <div
            key={i}
            className="absolute rounded-[1px] border border-primary/50 bg-primary/10"
            style={{
              left: `${(x / pageW) * 100}%`,
              top: `${(y / pageH) * 100}%`,
              width: `${(layout.labelWidthMm / pageW) * 100}%`,
              height: `${(layout.labelHeightMm / pageH) * 100}%`,
            }}
          />
        );
      })}
    </div>
  );
}

export function LabelSettingsForm({ org }: { org: Organization }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refetchOrg = useAuthStore((s) => s.refetchOrg);

  const [selectedFormat, setSelectedFormat] = useState<LabelFormat | null>(org.labelFormat ?? null);
  const [isSavingFormat, setIsSavingFormat] = useState(false);

  const sheetLayoutQuery = useLabelSheetLayoutQuery({ enabled: true });
  const saveSheetLayout = useSaveLabelSheetLayoutMutation();
  const [layout, setLayout] = useState<LabelSheetLayout | null>(null);

  useEffect(() => {
    if (sheetLayoutQuery.data && !layout) setLayout(sheetLayoutQuery.data);
  }, [sheetLayoutQuery.data, layout]);

  const sample = useAssetsQuery({ page: 1, pageSize: 1 });
  const logoSrc = useResolvedLogoSrc(org.logoUrl, accessToken);
  const assetTag = sample.data?.data[0]?.assetTag ?? `${org.slug.toUpperCase()}-SAMPLE-0001`;

  const canSaveFormat = selectedFormat !== null && selectedFormat !== org.labelFormat;

  const handleSaveFormat = async () => {
    if (!selectedFormat) return;
    setIsSavingFormat(true);
    try {
      await apiFetch<{ data: Organization }>("/organizations/me/label-format", {
        method: "PATCH",
        body: JSON.stringify({ labelFormat: selectedFormat }),
      });
      await refetchOrg();
      toast.success("Label format saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the label format. Please try again.");
    } finally {
      setIsSavingFormat(false);
    }
  };

  const handleSaveLayout = async () => {
    if (!layout) return;
    try {
      await saveSheetLayout.mutateAsync(layout);
      toast.success("Print sheet layout saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the print sheet layout. Please try again.");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-foreground">Label format</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the physical label format your organization prints for assets. This is what the "Print Labels" page
          and each asset's "Label" button use, without asking again.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LABEL_FORMATS.map((option) => {
            const isSelected = selectedFormat === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedFormat(option.value)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/60"
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{option.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <input type="radio" name="labelFormat" checked={isSelected} readOnly className="mt-1 shrink-0" />
                </div>
                <LabelPreview format={option.value} orgName={org.name} logoSrc={logoSrc} assetTag={assetTag} />
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSaveFormat} disabled={!canSaveFormat || isSavingFormat} className="gap-1.5">
            {isSavingFormat && <Loader2 className="size-4 animate-spin" />}
            Save format
          </Button>
          {org.labelFormat && (
            <p className="text-xs text-muted-foreground">
              Current format: {LABEL_FORMATS.find((f) => f.value === org.labelFormat)?.title ?? org.labelFormat}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-base font-semibold text-foreground">Print sheet calibration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Match this to your label paper (Avery-style sheets) so the printed grid lines up with pre-cut labels. Set
          it once, it applies to every bulk print run.
        </p>

        {sheetLayoutQuery.isLoading || !layout ? (
          <div className="mt-4 h-40 animate-pulse rounded-lg bg-muted/40" />
        ) : (
          <div className="mt-4 flex flex-col gap-6 lg:flex-row">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="Label width (mm)" value={layout.labelWidthMm} min={1} step={0.5} onChange={(v) => setLayout({ ...layout, labelWidthMm: v })} />
              <NumberField label="Label height (mm)" value={layout.labelHeightMm} min={1} step={0.5} onChange={(v) => setLayout({ ...layout, labelHeightMm: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Page size</Label>
                <Select value={layout.pageSize} onValueChange={(v) => setLayout({ ...layout, pageSize: v as LabelSheetLayout["pageSize"] })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <NumberField label="Columns" value={layout.columns} min={1} onChange={(v) => setLayout({ ...layout, columns: v })} />
              <NumberField label="Rows" value={layout.rows} min={1} onChange={(v) => setLayout({ ...layout, rows: v })} />
              <NumberField label="Gap horizontal (mm)" value={layout.gapHorizontalMm} step={0.5} onChange={(v) => setLayout({ ...layout, gapHorizontalMm: v })} />
              <NumberField label="Gap vertical (mm)" value={layout.gapVerticalMm} step={0.5} onChange={(v) => setLayout({ ...layout, gapVerticalMm: v })} />
              <NumberField label="Margin top (mm)" value={layout.marginTopMm} step={0.5} onChange={(v) => setLayout({ ...layout, marginTopMm: v })} />
              <NumberField label="Margin right (mm)" value={layout.marginRightMm} step={0.5} onChange={(v) => setLayout({ ...layout, marginRightMm: v })} />
              <NumberField label="Margin bottom (mm)" value={layout.marginBottomMm} step={0.5} onChange={(v) => setLayout({ ...layout, marginBottomMm: v })} />
              <NumberField label="Margin left (mm)" value={layout.marginLeftMm} step={0.5} onChange={(v) => setLayout({ ...layout, marginLeftMm: v })} />
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-[11px] text-muted-foreground">
                {layout.columns * layout.rows} labels per page
              </p>
              <SheetPreview layout={layout} />
            </div>
          </div>
        )}

        <div className="mt-4">
          <Button onClick={handleSaveLayout} disabled={!layout || saveSheetLayout.isPending} className="gap-1.5">
            {saveSheetLayout.isPending && <Loader2 className="size-4 animate-spin" />}
            Save layout
          </Button>
        </div>
      </div>
    </div>
  );
}
