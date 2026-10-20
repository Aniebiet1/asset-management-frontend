import type { Organization, OrgFeature } from "@/types";

/**
 * Optional per-org add-ons. Mirrors the backend's lib/features.ts: a Tecres platform admin
 * switches them on per workspace from the platform console. Like permissions.ts this only decides
 * what to show; the backend's requireFeature() is what actually enforces it. Kept free of either
 * auth store so the tenant app and the platform console can both import it (tenant hook:
 * lib/useOrgFeature.ts).
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

