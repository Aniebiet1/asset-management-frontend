/**
 * Client-side grouping for the Reports "group by" display mode (category / location /
 * depreciation bucket) - per BUILD_PLAN.md Phase 8, this is a display mode over the already
 * filtered/fetched rows from `GET /reports/assets`, not a separate endpoint.
 */

export type DepreciationBucket = "0-25%" | "25-50%" | "50-75%" | "75-100%+";

export const DEPRECIATION_BUCKET_ORDER: DepreciationBucket[] = ["0-25%", "25-50%", "50-75%", "75-100%+"];

export function depreciationBucketLabel(percentDepreciated: number): DepreciationBucket {
  if (percentDepreciated >= 75) return "75-100%+";
  if (percentDepreciated >= 50) return "50-75%";
  if (percentDepreciated >= 25) return "25-50%";
  return "0-25%";
}

/** Same emerald/blue/amber/rose palette lib/status.ts uses elsewhere (not imported directly since
 * that file's maps are keyed by domain status strings, not depreciation bands). */
export function depreciationBucketBadgeClass(percentDepreciated: number): string {
  switch (depreciationBucketLabel(percentDepreciated)) {
    case "0-25%":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "25-50%":
      return "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "50-75%":
      return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "75-100%+":
      return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  }
}
