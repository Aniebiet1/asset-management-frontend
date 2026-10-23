import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http-error";
import { ORG_FEATURE_INFO, orgHasFeature } from "@/lib/features";
import { useAuthStore } from "@/store/auth.store";
import type { Organization, OrgFeature } from "@/types";

/**
 * Optional features this organization can switch on or off (backend lib/features.ts). Off only
 * hides a feature; anything recorded with it stays and comes back when it's switched on again.
 */
export function FeaturesForm({ org }: { org: Organization }) {
  const refetchOrg = useAuthStore((s) => s.refetchOrg);
  const [saving, setSaving] = useState<OrgFeature | null>(null);

  const handleToggle = async (feature: OrgFeature, enabled: boolean) => {
    setSaving(feature);
    try {
      await apiFetch("/organizations/me/features", { method: "PATCH", body: JSON.stringify({ [feature]: enabled }) });
      await refetchOrg();
      toast.success(`${ORG_FEATURE_INFO[feature].label} ${enabled ? "turned on" : "turned off"}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this feature. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Features</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn optional features on or off for everyone in your organization. Turning one off hides it; nothing recorded with it is deleted.
        </p>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border">
        {(Object.keys(ORG_FEATURE_INFO) as OrgFeature[]).map((feature) => (
          <label key={feature} className="flex cursor-pointer items-center justify-between gap-4 p-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{ORG_FEATURE_INFO[feature].label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ORG_FEATURE_INFO[feature].description}</span>
            </span>
            <Switch
              checked={orgHasFeature(org, feature)}
              disabled={saving !== null}
              onCheckedChange={(checked) => handleToggle(feature, checked)}
              aria-label={ORG_FEATURE_INFO[feature].label}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
