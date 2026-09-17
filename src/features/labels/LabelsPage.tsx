import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { LabelPreview } from "@/features/labels/components/LabelPreview";
import { useAssetsQuery } from "@/features/assets/api";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http-error";
import { hasPermission } from "@/lib/permissions";
import { useResolvedLogoSrc } from "@/lib/useResolvedLogoSrc";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "cn";
import type { LabelFormat, Organization } from "@/types";

const LABEL_FORMATS: { value: LabelFormat; title: string; description: string }[] = [
  { value: "barcode_qr", title: "Barcode + QR", description: "Barcode with tag text on the left, QR code on the right." },
  { value: "barcode_only", title: "Barcode only", description: "Compact label with just the barcode and tag text." },
  { value: "qr_only", title: "QR only", description: "QR code with the tag text beneath it, no barcode." },
];

export function LabelsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const org = useAuthStore((s) => s.org);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refetchOrg = useAuthStore((s) => s.refetchOrg);
  const canManageOrg = hasPermission(currentUser?.role, "canManageOrg");

  const [selected, setSelected] = useState<LabelFormat | null>(org?.labelFormat ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const sample = useAssetsQuery({ page: 1, pageSize: 1 });
  const logoSrc = useResolvedLogoSrc(org?.logoUrl ?? null, accessToken);

  if (!org) return null;

  const assetTag = sample.data?.data[0]?.assetTag ?? `${org.slug.toUpperCase()}-SAMPLE-0001`;
  const canSave = canManageOrg && selected !== null && selected !== org.labelFormat;

  const handleSave = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await apiFetch<{ data: Organization }>("/organizations/me/label-format", {
        method: "PATCH",
        body: JSON.stringify({ labelFormat: selected }),
      });
      await refetchOrg();
      toast.success("Label format saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the label format. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Labels"
        description="Choose the physical label format your organization prints for assets."
      />

      {!canManageOrg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/50 p-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          Only organization admins can change the label format. This shows the current selection.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {LABEL_FORMATS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={!canManageOrg}
              onClick={() => canManageOrg && setSelected(option.value)}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
                isSelected ? "border-primary ring-1 ring-primary" : "border-border",
                canManageOrg ? "cursor-pointer hover:border-primary/60" : "cursor-default"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{option.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                </div>
                <input
                  type="radio"
                  name="labelFormat"
                  checked={isSelected}
                  onChange={() => canManageOrg && setSelected(option.value)}
                  disabled={!canManageOrg}
                  className="mt-1 shrink-0"
                />
              </div>
              <div className="flex justify-center overflow-x-auto">
                <LabelPreview format={option.value} orgName={org.name} logoSrc={logoSrc} assetTag={assetTag} />
              </div>
            </button>
          );
        })}
      </div>

      {canManageOrg && (
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave} disabled={!canSave || isSaving} className="gap-1.5">
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
          {org.labelFormat && (
            <p className="text-xs text-muted-foreground">
              Current format: {LABEL_FORMATS.find((f) => f.value === org.labelFormat)?.title ?? org.labelFormat}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
