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

export function orgHasFeature(org: Pick<Organization, "settings"> | null | undefined, feature: OrgFeature): boolean {
  return org?.settings?.features?.[feature] === true;
}

