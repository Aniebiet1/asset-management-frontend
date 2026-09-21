import type { FleetAnalytics, PlatformOrgSummary } from "@/types";

/** The risk signals the dashboard's "Risk & health" tiles expose as a drill-down. Each value is
 * what lands in the organizations list's `?risk=` param. */
export type RiskFilter = "suspended" | "near-asset-quota" | "near-user-quota" | "overdue-maintenance" | "risky-assets";

export const riskFilterLabels: Record<RiskFilter, string> = {
  suspended: "Suspended orgs",
  "near-asset-quota": "Near asset quota",
  "near-user-quota": "Near user quota",
  "overdue-maintenance": "Overdue maintenance",
  "risky-assets": "Damaged / lost assets",
};

export function parseRiskFilter(value: string | null): RiskFilter | null {
  return value && value in riskFilterLabels ? (value as RiskFilter) : null;
}

/** Same 90% threshold the backend applies in platform.service.ts's getFleetAnalytics, so a tile's
 * count and the list it opens can't disagree. Keep the two in sync if either moves. */
const QUOTA_WARN_RATIO = 0.9;

/**
 * The two asset-level filters can't be derived from an org summary at all (the counts live on
 * maintenance records and assets), so they're answered from the fleet-analytics payload's org-id
 * lists instead. `analytics` being undefined means those two simply match nothing yet rather than
 * falling back to "show everything", which would misrepresent the tile that was clicked.
 */
export function matchesRiskFilter(org: PlatformOrgSummary, filter: RiskFilter, analytics: FleetAnalytics | undefined): boolean {
  switch (filter) {
    case "suspended":
      return org.planStatus === "suspended";
    case "near-asset-quota":
      return org.assetQuota > 0 && org.assetCount / org.assetQuota >= QUOTA_WARN_RATIO;
    case "near-user-quota":
      return org.userQuota > 0 && org.userCount / org.userQuota >= QUOTA_WARN_RATIO;
    case "overdue-maintenance":
      return analytics?.risk.orgIdsWithOverdueMaintenance.includes(org.id) ?? false;
    case "risky-assets":
      return analytics?.risk.orgIdsWithRiskyAssets.includes(org.id) ?? false;
  }
}
