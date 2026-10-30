import type { Organization, OrgFeature } from "@/types";

/**
 * Optional per-org features. Mirrors the backend's lib/features.ts: each organization's admin
 * switches them on or off in Settings > Features. Like permissions.ts this only decides what to
 * show; the backend's requireFeature() is what actually enforces it. Tenant hook:
 * lib/useOrgFeature.ts.
 */
export const ORG_FEATURE_INFO: Record<OrgFeature, { label: string; description: string }> = {
  serviceHistory: {
    label: "Service history",
    description: "Log repairs and services on each asset, with date, cost and a comment, and see the total spent.",
  },
};

/**
 * What a feature is worth before an org has ever touched its switch. Mirrors the backend's
 * ORG_FEATURE_DEFAULTS: service history ships on, so only an explicit off hides it.
 */
export const ORG_FEATURE_DEFAULTS: Record<OrgFeature, boolean> = {
  serviceHistory: true,
};

export function orgHasFeature(org: Pick<Organization, "settings"> | null | undefined, feature: OrgFeature): boolean {
  const stored = org?.settings?.features?.[feature];
  return typeof stored === "boolean" ? stored : ORG_FEATURE_DEFAULTS[feature];
}

